package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

// One row = one independent freelance psychologist account (a tenant), OR the
// single seeded superadmin account (see role field / StartupInitializer).
// Every other table hangs a "psychologistId" off a tenant's id and every
// tenant-facing query is scoped to the caller's own id; only the superadmin
// role can see across accounts, and only through /api/v1/superadmin/**.
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
    // (/book/{slug}) and every other public-facing endpoint.
    @Column(unique = true, nullable = false)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(columnDefinition = "TEXT")
    private String profileImageUrl;

    // Whether this practitioner is currently accepting new public bookings
    @Column(nullable = false)
    @Builder.Default
    private boolean bookable = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
