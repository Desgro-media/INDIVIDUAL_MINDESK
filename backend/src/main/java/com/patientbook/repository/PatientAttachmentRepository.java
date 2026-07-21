package com.patientbook.repository;

import com.patientbook.entity.PatientAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientAttachmentRepository extends JpaRepository<PatientAttachment, Long> {

    List<PatientAttachment> findByPatientIdAndPsychologistIdOrderByUploadedAtDesc(Long patientId, Long psychologistId);

    // Ownership-checked single-record access — a miss (wrong id, wrong
    // patient, or wrong owner) is treated identically, see ResourceNotFoundException.
    Optional<PatientAttachment> findByIdAndPatientIdAndPsychologistId(Long id, Long patientId, Long psychologistId);

    void deleteByPatientId(Long patientId);
}
