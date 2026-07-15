package com.patientbook.repository;

import com.patientbook.entity.ClinicSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClinicSettingsRepository extends JpaRepository<ClinicSettings, Long> {
    Optional<ClinicSettings> findByPsychologistId(Long psychologistId);
}
