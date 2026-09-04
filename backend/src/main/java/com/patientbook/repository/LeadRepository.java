package com.patientbook.repository;

import com.patientbook.entity.Lead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeadRepository extends JpaRepository<Lead, Long> {
    List<Lead> findByPractitionerIdOrderByCreatedAtDesc(Long practitionerId);

    // Most recent still-open lead from this contact — looked up by phone
    // (same identity key as Patient) when a booking completes, so it can be
    // flipped to CONVERTED rather than left dangling. See LeadService.convertLead.
    Optional<Lead> findFirstByPhoneAndPractitionerIdAndStatusOrderByCreatedAtDesc(
            String phone, Long practitionerId, String status);
}
