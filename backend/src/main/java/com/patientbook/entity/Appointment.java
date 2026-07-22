package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(nullable = false)
    private LocalDate appointmentDate;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private String status; // PENDING, CONFIRMED, CANCELLED, COMPLETED

    @Column(unique = true, nullable = false, length = 25)
    private String trackingToken;

    // Session type selected by the patient (e.g. INITIAL_CONSULTATION)
    private String sessionType;

    // Optional note / reason from the patient
    @Column(columnDefinition = "TEXT")
    private String notes;

    private String cancellationReason;

    // Links this appointment to the patient's previous appointment for journey tracking
    @Column(name = "previous_appointment_id")
    private Long previousAppointmentId;

    private String googleCalendarEventId;

    @Column(columnDefinition = "TEXT")
    private String paymentScreenshotBase64;

    @Column(name = "rating")
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    // The owning tenant (clinic or individual) — always set server-side,
    // never from client input. For an individual this is the same value as
    // assignedDoctorId; for a clinic it's the clinic's tenant-root id.
    @Column(name = "psychologist_id", nullable = false)
    private Long psychologistId;

    // Which specific practitioner this appointment is with — always set
    // server-side, validated via StaffResolutionService. Equal to
    // psychologistId for individuals. Nullable at the entity level only for
    // pre-existing rows pending the startup backfill (see StartupInitializer).
    @Column(name = "assigned_doctor_id")
    private Long assignedDoctorId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
