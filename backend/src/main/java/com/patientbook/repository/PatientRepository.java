package com.patientbook.repository;

import com.patientbook.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    // Unique per-owner, not globally — see the composite constraint on Patient.
    Optional<Patient> findByPhoneAndPrimaryPsychologistId(String phone, Long primaryPsychologistId);

    List<Patient> findByPrimaryPsychologistId(Long primaryPsychologistId);

    // Ownership-checked single-record access — a miss (wrong id OR wrong
    // owner) is treated identically, see ResourceNotFoundException.
    Optional<Patient> findByIdAndPrimaryPsychologistId(Long id, Long primaryPsychologistId);
}
