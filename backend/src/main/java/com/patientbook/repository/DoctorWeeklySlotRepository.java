package com.patientbook.repository;

import com.patientbook.entity.DoctorWeeklySlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorWeeklySlotRepository extends JpaRepository<DoctorWeeklySlot, Long> {
    List<DoctorWeeklySlot> findByPsychologistId(Long psychologistId);
    List<DoctorWeeklySlot> findByPsychologistIdAndDayOfWeekAndActiveTrue(Long psychologistId, String dayOfWeek);
    void deleteByPsychologistId(Long psychologistId);
    void deleteByIdAndPsychologistId(Long id, Long psychologistId);
}
