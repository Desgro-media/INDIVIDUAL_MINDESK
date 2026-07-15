package com.patientbook.repository;

import com.patientbook.entity.DoctorAvailabilityBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface DoctorAvailabilityBlockRepository extends JpaRepository<DoctorAvailabilityBlock, Long> {

    List<DoctorAvailabilityBlock> findByPsychologistIdOrderByDayOfWeekAscStartTimeAsc(Long psychologistId);

    List<DoctorAvailabilityBlock> findByPsychologistIdAndDayOfWeek(Long psychologistId, String dayOfWeek);

    @Transactional
    void deleteByPsychologistIdAndDayOfWeek(Long psychologistId, String dayOfWeek);

    @Transactional
    void deleteByIdAndPsychologistId(Long id, Long psychologistId);
}
