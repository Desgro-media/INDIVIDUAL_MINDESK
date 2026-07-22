package com.patientbook.repository;

import com.patientbook.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    // Filtered queries for per-tenant data isolation. psychologistId means
    // "which tenant" (clinic or individual) — see Appointment.java.
    List<Appointment> findByPsychologistId(Long psychologistId);

    // Calendar/slot-conflict check — deliberately scoped by assignedDoctorId
    // (the specific practitioner), NOT psychologistId (the tenant), so two
    // different doctors in the same clinic can be booked at the same time.
    // For an individual, assignedDoctorId always equals psychologistId, so
    // this is behaviorally identical to the old tenant-scoped check.
    @Query("SELECT a FROM Appointment a WHERE a.appointmentDate = :date AND a.assignedDoctorId = :assignedDoctorId")
    List<Appointment> findByAppointmentDateAndAssignedDoctorId(
            @Param("date") java.time.LocalDate date,
            @Param("assignedDoctorId") Long assignedDoctorId);

    @Query("SELECT a FROM Appointment a WHERE a.patient.id = :patientId AND a.psychologistId = :psychologistId ORDER BY a.appointmentDate DESC, a.startTime DESC")
    List<Appointment> findByPatientIdAndPsychologistId(
            @Param("patientId") Long patientId,
            @Param("psychologistId") Long psychologistId);

    // Ownership-checked single-record access — a miss (wrong id OR wrong
    // owner) is treated identically, see ResourceNotFoundException.
    Optional<Appointment> findByIdAndPsychologistId(Long id, Long psychologistId);

    boolean existsByIdAndPsychologistId(Long id, Long psychologistId);

    // One-time, idempotent backfill for rows that predate assignedDoctorId
    // (added for clinic staff support) — see StartupInitializer. A bulk
    // update rather than a load-mutate-save loop since a long-running tenant
    // can have tens of thousands of historical rows.
    @Modifying
    @Query("UPDATE Appointment a SET a.assignedDoctorId = a.psychologistId WHERE a.assignedDoctorId IS NULL")
    int backfillAssignedDoctorIdFromPsychologistId();
}
