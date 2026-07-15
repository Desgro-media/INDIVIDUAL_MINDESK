package com.patientbook.repository;

import com.patientbook.entity.MoodLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MoodLogRepository extends JpaRepository<MoodLog, Long> {
    List<MoodLog> findByPatientIdAndPsychologistIdOrderByLogDateAsc(Long patientId, Long psychologistId);
    Optional<MoodLog> findByAppointmentId(Long appointmentId);
    Optional<MoodLog> findByAppointmentIdAndPsychologistId(Long appointmentId, Long psychologistId);
    void deleteByPatientId(Long patientId);
    void deleteByAppointmentId(Long appointmentId);
}
