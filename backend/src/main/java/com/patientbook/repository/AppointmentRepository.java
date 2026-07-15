package com.patientbook.repository;

import com.patientbook.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    Optional<Appointment> findByTrackingToken(String trackingToken);

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient WHERE a.trackingToken = :token")
    Optional<Appointment> findByTrackingTokenWithPatient(@Param("token") String token);

    List<Appointment> findByAppointmentDate(LocalDate appointmentDate);
    List<Appointment> findByStatus(String status);
    List<Appointment> findByPatientIdOrderByAppointmentDateDescStartTimeDesc(Long patientId);
    void deleteByPatientId(Long patientId);

    // Returns the most recent COMPLETED appointment for a patient (for previousAppointmentId linking)
    @Query("SELECT a FROM Appointment a WHERE a.patient.id = :patientId AND a.status = 'COMPLETED' ORDER BY a.appointmentDate DESC, a.startTime DESC")
    List<Appointment> findCompletedByPatientIdOrderByDateDesc(@Param("patientId") Long patientId);

    // Returns the most recent active appointment for a patient (for previousAppointmentId linking)
    @Query("SELECT a FROM Appointment a WHERE a.patient.id = :patientId AND a.status <> 'CANCELLED' ORDER BY a.appointmentDate DESC, a.startTime DESC")
    List<Appointment> findMostRecentActiveByPatientId(@Param("patientId") Long patientId);

    // Count of non-cancelled appointments (used for returning-patient session count)
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.patient.id = :patientId AND a.status <> 'CANCELLED'")
    long countActiveByPatientId(@Param("patientId") Long patientId);

    // Filtered queries for per-psychologist data isolation
    List<Appointment> findByPsychologistId(Long psychologistId);

    @Query("SELECT a FROM Appointment a WHERE a.appointmentDate = :date AND a.psychologistId = :psychologistId")
    List<Appointment> findByAppointmentDateAndPsychologistId(
            @Param("date") java.time.LocalDate date,
            @Param("psychologistId") Long psychologistId);

    @Query("SELECT a FROM Appointment a WHERE a.patient.id = :patientId AND a.psychologistId = :psychologistId ORDER BY a.appointmentDate DESC, a.startTime DESC")
    List<Appointment> findByPatientIdAndPsychologistId(
            @Param("patientId") Long patientId,
            @Param("psychologistId") Long psychologistId);

    // Ownership-checked single-record access — a miss (wrong id OR wrong
    // owner) is treated identically, see ResourceNotFoundException.
    Optional<Appointment> findByIdAndPsychologistId(Long id, Long psychologistId);

    boolean existsByIdAndPsychologistId(Long id, Long psychologistId);
}
