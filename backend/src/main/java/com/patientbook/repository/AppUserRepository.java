package com.patientbook.repository;

import com.patientbook.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);

    // Resolves the practitioner behind a public booking link, e.g. /book/{slug}
    Optional<AppUser> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
