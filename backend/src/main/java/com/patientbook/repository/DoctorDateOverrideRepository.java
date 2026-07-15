package com.patientbook.repository;

import com.patientbook.entity.DoctorDateOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DoctorDateOverrideRepository extends JpaRepository<DoctorDateOverride, Long> {
    List<DoctorDateOverride> findByPsychologistId(Long psychologistId);
    List<DoctorDateOverride> findByPsychologistIdAndSpecificDate(Long psychologistId, LocalDate specificDate);
    List<DoctorDateOverride> findByPsychologistIdAndSpecificDateGreaterThanEqual(Long psychologistId, LocalDate fromDate);
    void deleteByPsychologistId(Long psychologistId);
    void deleteByIdAndPsychologistId(Long id, Long psychologistId);
}
