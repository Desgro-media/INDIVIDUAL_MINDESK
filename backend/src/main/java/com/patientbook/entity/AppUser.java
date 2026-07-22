package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

// One row is one of three things:
//  1. A tenant root — an independent freelance psychologist (accountType
//     INDIVIDUAL) or a clinic owner/admin (accountType CLINIC). tenantId is
//     null. Every tenant-wide table hangs a "psychologistId" off THIS id
//     (see CurrentUserProvider.getCurrentTenantId()).
//  2. A staff member belonging to a clinic — tenantId is set to that
//     clinic's tenant-root id, accountType is null (irrelevant), and
//     permissions/role determine what they can see (see StaffPermissionFilter).
//     A staff row with role PSYCHOLOGIST is a bookable doctor within the
//     clinic and manages their own calendar via /api/v1/me/** exactly like an
//     individual tenant does — CurrentUserProvider.getCurrentUserId() there
//     resolves to their own row regardless of tenantId.
//  3. The single seeded superadmin account (see StartupInitializer) — sees
//     across every tenant, but only through /api/v1/superadmin/**.
@Entity
@Table(name = "app_user")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The account's email — used as the login identifier
    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    // ROLE_PSYCHOLOGIST (every tenant, default) or ROLE_SUPERADMIN (the single
    // seeded platform-owner account — see StartupInitializer). Drives both
    // Spring Security's GrantedAuthority (UserDetailsServiceImpl) and
    // URL-level rules in SecurityConfig. See com.patientbook.security.Roles.
    @Column(nullable = false)
    @Builder.Default
    private String role = com.patientbook.security.Roles.PSYCHOLOGIST;

    private String name;

    private String jobTitle;

    // URL-safe, unique — identifies this practitioner's public booking link
    // (/book/{slug}) and every other public-facing endpoint. Only tenant-root
    // rows (tenantId == null) have one; staff rows leave this null (Postgres
    // permits multiple NULLs under a unique constraint) so a staff member's
    // row can never be resolved by PublicController.resolveOwner() and
    // mistaken for a whole tenant.
    @Column(unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(columnDefinition = "TEXT")
    private String profileImageUrl;

    // Whether this practitioner is currently accepting new public bookings
    @Column(nullable = false)
    @Builder.Default
    private boolean bookable = true;

    // INDIVIDUAL or CLINIC — set only on tenant-root rows (tenantId == null).
    @Enumerated(EnumType.STRING)
    private AccountType accountType;

    // Null on a tenant-root row. Set to the owning clinic's tenant-root id on
    // a staff row — see CurrentUserProvider.getCurrentTenantId().
    private Long tenantId;

    // Comma-separated dashboard-tab permissions (APPOINTMENTS/PATIENTS/
    // BILLING/ANALYTICS/SETTINGS) for staff rows with role STAFF or
    // RECEPTIONIST — see StaffPermissionFilter. Ignored for tenant roots
    // (always full access) and for staff-doctors' auto-granted tabs.
    @Column(columnDefinition = "TEXT")
    private String permissions;

    // Soft-deactivation for staff accounts — blocks login (see
    // UserDetailsServiceImpl) without deleting the row, so historical
    // appointments/invoices/notes keep attributing to a real name instead of
    // degrading to "Unknown practitioner." Always true for tenant roots and
    // the superadmin.
    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
