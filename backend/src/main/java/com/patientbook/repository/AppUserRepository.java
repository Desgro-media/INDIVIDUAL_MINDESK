package com.patientbook.repository;

import com.patientbook.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);

    // Resolves the practitioner behind a public booking link, e.g. /book/{slug}.
    // Scoped to ROLE_PSYCHOLOGIST so the seeded superadmin account (which also
    // needs a unique slug to satisfy this table's schema) can never be
    // resolved as a public-facing booking page — see PublicController.
    Optional<AppUser> findBySlugAndRole(String slug, String role);

    boolean existsBySlug(String slug);

    boolean existsByUsernameAndRole(String username, String role);

    // Superadmin tenant list — every practitioner account (never includes the
    // superadmin itself).
    List<AppUser> findByRoleOrderByCreatedAtDesc(String role);
}
