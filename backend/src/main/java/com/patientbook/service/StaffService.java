package com.patientbook.service;

import com.patientbook.dto.StaffDto;
import com.patientbook.dto.StaffSummaryDto;
import com.patientbook.entity.AccountType;
import com.patientbook.entity.AppUser;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.security.Roles;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

// Staff account management for a CLINIC tenant. Every method here starts
// with requireClinicOwner (only the clinic's own tenant-root account can
// provision/manage its staff's credentials — staff cannot self-manage or
// manage each other, matching the product decision that clinic admins
// create staff logins) and, for anything targeting a specific staff id,
// requireOwnedStaff (the id must belong to the caller's own tenant — this is
// the ownership check the reference implementation this was ported from was
// missing, and without it one clinic could edit/deactivate another clinic's
// staff by id).
@Service
@RequiredArgsConstructor
public class StaffService {

    private static final List<String> ALLOWED_ROLES =
            List.of(Roles.STAFF, Roles.RECEPTIONIST, Roles.PSYCHOLOGIST);

    private static final java.util.regex.Pattern EMAIL_PATTERN =
            java.util.regex.Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final AppUserRepository appUserRepository;
    private final StaffAttendanceService staffAttendanceService;
    private final PasswordEncoder passwordEncoder;

    public List<StaffSummaryDto> listStaff(AppUser caller) {
        requireClinicOwner(caller);
        return appUserRepository.findByTenantIdOrderByNameAsc(caller.getId())
                .stream().map(this::toSummary).collect(Collectors.toList());
    }

    @Transactional
    public StaffSummaryDto createStaff(AppUser caller, StaffDto dto) {
        requireClinicOwner(caller);

        if (dto.getUsername() == null || dto.getUsername().isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (dto.getPassword() == null || dto.getPassword().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }
        String username = dto.getUsername().trim().toLowerCase();
        // The shared login form's email field uses HTML5 type="email"
        // validation — a non-email-shaped username would be silently
        // unable to sign in from the browser, so this is enforced here
        // rather than left as a confusing later surprise.
        if (!EMAIL_PATTERN.matcher(username).matches()) {
            throw new IllegalArgumentException("Username must be a valid email address");
        }
        if (appUserRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        String role = normalizeRole(dto.getRole());

        AppUser staff = AppUser.builder()
                .username(username)
                .password(passwordEncoder.encode(dto.getPassword()))
                .name(dto.getName() != null ? dto.getName().trim() : username)
                .role(role)
                .tenantId(caller.getId())
                .slug(null) // staff are never independently bookable via a public slug
                .jobTitle(dto.getJobTitle())
                .permissions(joinPermissions(dto.getPermissions()))
                .bio(dto.getBio())
                // Only a PSYCHOLOGIST can ever be publicly bookable — enforced
                // here, not just hidden in the create-form UI, so a crafted
                // request can't make a receptionist/support-staff row show up
                // as a selectable practitioner on the public booking page.
                .bookable(Roles.PSYCHOLOGIST.equals(role) && Boolean.TRUE.equals(dto.getBookable()))
                .profileImageUrl(dto.getProfileImageUrl())
                .build();

        return toSummary(appUserRepository.save(staff));
    }

    // Partial update — every field is applied only if the caller actually
    // sent it, so an admin editing just permissions (say) can never
    // accidentally clobber bio/bookable/profileImageUrl by omitting them.
    @Transactional
    public StaffSummaryDto updateStaff(AppUser caller, Long staffId, StaffDto dto) {
        requireClinicOwner(caller);
        AppUser staff = requireOwnedStaff(caller, staffId);

        if (dto.getName() != null) {
            if (dto.getName().isBlank()) throw new IllegalArgumentException("Name cannot be empty");
            staff.setName(dto.getName().trim());
        }
        if (dto.getJobTitle() != null) staff.setJobTitle(dto.getJobTitle());
        if (dto.getBio() != null) staff.setBio(dto.getBio());
        if (dto.getBookable() != null) staff.setBookable(dto.getBookable());
        if (dto.getProfileImageUrl() != null) staff.setProfileImageUrl(dto.getProfileImageUrl());
        if (dto.getPermissions() != null) staff.setPermissions(joinPermissions(dto.getPermissions()));
        if (dto.getRole() != null && !dto.getRole().isBlank()) staff.setRole(normalizeRole(dto.getRole()));
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            if (dto.getPassword().length() < 8) throw new IllegalArgumentException("Password must be at least 8 characters");
            staff.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
        // Same rule as createStaff — a role change away from PSYCHOLOGIST
        // (or a bookable=true sent for a non-PSYCHOLOGIST row) can never
        // leave this row publicly bookable.
        if (!Roles.PSYCHOLOGIST.equals(staff.getRole())) {
            staff.setBookable(false);
        }

        return toSummary(appUserRepository.save(staff));
    }

    @Transactional
    public StaffSummaryDto updatePermissions(AppUser caller, Long staffId, List<String> permissions) {
        requireClinicOwner(caller);
        AppUser staff = requireOwnedStaff(caller, staffId);
        staff.setPermissions(joinPermissions(permissions));
        return toSummary(appUserRepository.save(staff));
    }

    // Soft-deactivation, not a delete — historical appointments/invoices/
    // notes keep attributing to this staff member's real name instead of
    // degrading to "Unknown practitioner" forever. Blocks login (see
    // UserDetailsServiceImpl) and public bookability immediately.
    @Transactional
    public StaffSummaryDto deactivateStaff(AppUser caller, Long staffId) {
        requireClinicOwner(caller);
        AppUser staff = requireOwnedStaff(caller, staffId);
        staff.setEnabled(false);
        staff.setBookable(false);
        AppUser saved = appUserRepository.save(staff);
        staffAttendanceService.closeOpenSession(staffId);
        return toSummary(saved);
    }

    @Transactional
    public StaffSummaryDto reactivateStaff(AppUser caller, Long staffId) {
        requireClinicOwner(caller);
        AppUser staff = requireOwnedStaff(caller, staffId);
        staff.setEnabled(true);
        return toSummary(appUserRepository.save(staff));
    }

    // ── Guards ────────────────────────────────────────────────────────────

    // Public so other clinic-admin-only surfaces (StaffAttendanceController)
    // can reuse the exact same check rather than re-implementing it.
    public void requireClinicOwner(AppUser caller) {
        if (caller.getTenantId() != null || caller.getAccountType() != AccountType.CLINIC) {
            throw new AccessDeniedException("Only a clinic account can manage staff");
        }
    }

    private AppUser requireOwnedStaff(AppUser caller, Long staffId) {
        return appUserRepository.findByIdAndTenantId(staffId, caller.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found: " + staffId));
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private String normalizeRole(String role) {
        String candidate = (role != null && !role.isBlank()) ? role : Roles.STAFF;
        if (!ALLOWED_ROLES.contains(candidate)) {
            throw new IllegalArgumentException("Invalid role: " + candidate + ". Allowed: " + ALLOWED_ROLES);
        }
        return candidate;
    }

    private String joinPermissions(List<String> permissions) {
        return permissions != null ? String.join(",", permissions) : "";
    }

    private List<String> parsePermissions(String csv) {
        if (csv == null || csv.isBlank()) return Collections.emptyList();
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
    }

    private StaffSummaryDto toSummary(AppUser staff) {
        return StaffSummaryDto.builder()
                .id(staff.getId())
                .name(staff.getName())
                .username(staff.getUsername())
                .jobTitle(staff.getJobTitle())
                .role(staff.getRole())
                .permissions(parsePermissions(staff.getPermissions()))
                .bio(staff.getBio())
                .bookable(staff.isBookable())
                .profileImageUrl(staff.getProfileImageUrl())
                .enabled(staff.isEnabled())
                .createdAt(staff.getCreatedAt())
                .build();
    }
}
