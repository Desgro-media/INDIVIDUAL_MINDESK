package com.patientbook.security;

import com.patientbook.entity.AppUser;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.service.SubscriptionService;
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
import java.util.List;
import java.util.Optional;

// Gates the tenant dashboard API once a practitioner's trial/subscription has
// lapsed — per product decision, this blocks ONLY the dashboard, never the
// public booking surface (/book/{slug} etc. keep working for their existing
// patients regardless of billing state).
//
// Runs after JwtAuthenticationFilter (needs SecurityContextHolder already
// populated) and before the request reaches any controller. The actual
// TRIALING/ACTIVE/EXPIRED state machine lives in SubscriptionService — this
// filter is just the enforcement point, so the superadmin tenant-list view
// (SuperAdminService) and this filter can never drift out of sync.
@Component
@RequiredArgsConstructor
public class SubscriptionAccessFilter extends OncePerRequestFilter {

    private final AppUserRepository appUserRepository;
    private final SubscriptionService subscriptionService;

    // Always reachable regardless of authentication or billing state — the
    // practitioner must be able to see their own locked status and submit
    // payment proof while locked, and the superadmin surface has its own
    // role-based gate (see SecurityConfig), not a subscription-based one.
    private static final List<String> EXEMPT_PREFIXES = List.of(
            "/api/v1/auth/",
            "/api/v1/public/",
            "/api/v1/track/",
            "/api/v1/subscription/",
            "/api/v1/superadmin/"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        if (isExempt(uri, method)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            // No session to gate — let SecurityConfig's authorizeHttpRequests
            // decide (401 if the endpoint actually requires auth).
            filterChain.doFilter(request, response);
            return;
        }

        boolean isSuperAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> Roles.SUPERADMIN.equals(a.getAuthority()));
        if (isSuperAdmin) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<AppUser> user = appUserRepository.findByUsername(authentication.getName());
        // A clinic staff row has no Subscription of its own — gating must
        // reflect the owning clinic's billing state, not the staff member's
        // (nonexistent) one, or every staff login would be locked out
        // immediately regardless of the clinic's real subscription status.
        Long tenantId = user.map(u -> u.getTenantId() != null ? u.getTenantId() : u.getId()).orElse(null);
        if (user.isEmpty() || subscriptionService.isAccessAllowed(tenantId)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(402); // Payment Required
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"message\":\"Your subscription has expired. Please renew to continue.\",\"reason\":\"SUBSCRIPTION_EXPIRED\"}");
        }
    }

    private boolean isExempt(String uri, String method) {
        if ("POST".equalsIgnoreCase(method) && uri.endsWith("/api/v1/appointments")) return true; // public booking submit
        if ("POST".equalsIgnoreCase(method) && uri.endsWith("/api/v1/demo-booking")) return true;
        if (uri.endsWith("/api/v1/chat")) return true;
        if (uri.startsWith("/actuator/")) return true;
        return EXEMPT_PREFIXES.stream().anyMatch(uri::contains);
    }
}
