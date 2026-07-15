package com.patientbook.repository;

import com.patientbook.entity.ClinicService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClinicServiceRepository extends JpaRepository<ClinicService, Long> {
    List<ClinicService> findByPsychologistIdAndActiveTrueOrderByDisplayOrderAscCreatedAtAsc(Long psychologistId);
    List<ClinicService> findByPsychologistIdOrderByDisplayOrderAscCreatedAtAsc(Long psychologistId);
    Optional<ClinicService> findByIdAndPsychologistId(Long id, Long psychologistId);
}
