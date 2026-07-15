package com.patientbook.repository;

import com.patientbook.entity.SessionNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionNoteRepository extends JpaRepository<SessionNote, Long> {
    Optional<SessionNote> findByAppointmentIdAndPsychologistId(Long appointmentId, Long psychologistId);
    List<SessionNote> findByPatientIdAndPsychologistIdOrderByCreatedAtDesc(Long patientId, Long psychologistId);
    void deleteByPatientId(Long patientId);
    void deleteByAppointmentId(Long appointmentId);
    void deleteByIdAndPsychologistId(Long id, Long psychologistId);

    // Internal use only (e.g. invoice/appointment creation flows that already
    // verified ownership at the appointment level)
    Optional<SessionNote> findByAppointmentId(Long appointmentId);
}
