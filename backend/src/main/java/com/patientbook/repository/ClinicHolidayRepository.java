package com.patientbook.repository;

import com.patientbook.entity.ClinicHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClinicHolidayRepository extends JpaRepository<ClinicHoliday, Long> {
    Optional<ClinicHoliday> findByHolidayDateAndPsychologistId(LocalDate holidayDate, Long psychologistId);
    List<ClinicHoliday> findByPsychologistId(Long psychologistId);
    void deleteByIdAndPsychologistId(Long id, Long psychologistId);
}
