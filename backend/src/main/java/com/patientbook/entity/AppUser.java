package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

// One row = one independent freelance psychologist account (a tenant). Every
// other table hangs a "psychologistId" off this id and every query is scoped
// to the caller's own id — there is no admin/staff role that can see across
// accounts.
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

    // Vestigial: every account is the same kind of user (no admin/staff roles
    // exist in this app), kept only so @PreAuthorize("isAuthenticated()") and
    // UserDetailsServiceImpl's GrantedAuthority plumbing don't need touching.
    @Column(nullable = false)
    @Builder.Default
    private String role = "ROLE_PSYCHOLOGIST";

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
