package com.patientbook.security;

import com.patientbook.entity.AppUser;
import com.patientbook.repository.AppUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

// Gates a clinic's dashboard-tab data (Patients/Appointments/Billing/
// Analytics/Settings) by each staff member's granted permissions — same
// filter-chain pattern as SubscriptionAccessFilter. Only ever restricts
// clinic STAFF (an AppUser row with tenantId set); tenant roots (individuals
// and clinic owners/admins) and the superadmin always have full access — see
// isRestricted below.
//
// Bookable staff-doctors (role PSYCHOLOGIST) auto-get APPOINTMENTS and
// PATIENTS — running their own calendar and seeing the shared patient
// roster is the literal job — but still need an explicit grant for
// BILLING/ANALYTICS/SETTINGS, same as RECEPTIONIST/STAFF. This is a
// deliberate, narrower default than "any doctor role = full access": a
// single compromised or disgruntled staff-doctor login shouldn't
// automatically expose the whole clinic's revenue or let them change
// clinic-wide settings.
@Component
@RequiredArgsConstructor
public class StaffPermissionFilter extends OncePerRequestFilter {

    private final AppUserRepository appUserRepository;

    private static final String PATIENTS = "PATIENTS";
    private static final String APPOINTMENTS = "APPOINTMENTS";
    private static final String BILLING = "BILLING";
    private static final String ANALYTICS = "ANALYTICS";
    private static final String SETTINGS = "SETTINGS";

    // Auto-granted to every staff-doctor regardless of their permissions CSV.
    private static final Set<String> DOCTOR_AUTO_GRANTED = Set.of(APPOINTMENTS, PATIENTS);

    // Ordered so a more specific prefix (e.g. /api/v1/me) can be checked
    // before a broader one if that's ever needed — currently order-independent.
    private static final Map<String, String> PREFIX_PERMISSIONS = new LinkedHashMap<>();
    static {
        PREFIX_PERMISSIONS.put("/api/v1/patients", PATIENTS);
        PREFIX_PERMISSIONS.put("/api/v1/notes", PATIENTS);
        PREFIX_PERMISSIONS.put("/api/v1/mood", PATIENTS);
        PREFIX_PERMISSIONS.put("/api/v1/appointments", APPOINTMENTS);
        PREFIX_PERMISSIONS.put("/api/v1/invoices", BILLING);
        PREFIX_PERMISSIONS.put("/api/v1/bank-accounts", BILLING);
        PREFIX_PERMISSIONS.put("/api/v1/reports", ANALYTICS);
        PREFIX_PERMISSIONS.put("/api/v1/settings", SETTINGS);
        PREFIX_PERMISSIONS.put("/api/v1/holidays", SETTINGS);
        PREFIX_PERMISSIONS.put("/api/v1/services", SETTINGS);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();

        // /api/v1/me/** (a doctor's own calendar — self-scoped by
        // construction) and /api/v1/staff/** (tenant-root-only, enforced by
        // StaffService itself) are deliberately never gated here.
        if (uri.contains("/api/v1/me/") || uri.contains("/api/v1/staff")) {
            filterChain.doFilter(request, response);
            return;
        }

        String requiredPermission = resolveRequiredPermission(uri);
        if (requiredPermission == null) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            // No session to gate — SecurityConfig's authorizeHttpRequests
            // (or the endpoint's own permitAll) decides what happens next.
            filterChain.doFilter(request, response);
            return;
        }

        Optional<AppUser> caller = appUserRepository.findByUsername(authentication.getName());
        if (caller.isEmpty() || !isRestricted(caller.get())) {
            filterChain.doFilter(request, response);
            return;
        }

        AppUser staff = caller.get();
        boolean autoGranted = Roles.PSYCHOLOGIST.equals(staff.getRole()) && DOCTOR_AUTO_GRANTED.contains(requiredPermission);
        if (autoGranted || hasPermission(staff, requiredPermission)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"message\":\"You don't have permission to access this.\",\"reason\":\"MISSING_PERMISSION\"}");
        }
    }

    // Only a clinic staff row (tenantId set) is ever gated — tenant roots
    // (individuals, clinic owners) and the superadmin always have full access.
    private boolean isRestricted(AppUser user) {
        return user.getTenantId() != null;
    }

    private boolean hasPermission(AppUser staff, String permission) {
        if (staff.getPermissions() == null || staff.getPermissions().isBlank()) return false;
        List<String> granted = Arrays.asList(staff.getPermissions().split(","));
        return granted.contains(permission);
    }

    private String resolveRequiredPermission(String uri) {
        for (Map.Entry<String, String> entry : PREFIX_PERMISSIONS.entrySet()) {
            if (uri.contains(entry.getKey())) return entry.getValue();
        }
        return null;
    }
}
