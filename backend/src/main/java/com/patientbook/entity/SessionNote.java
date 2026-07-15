package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "session_note")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Backfilled from appointment.psychologistId at creation time
    @Column(name = "psychologist_id", nullable = false)
    private Long psychologistId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    // Legacy plain-text field (kept for backward compatibility)
    @Column(columnDefinition = "TEXT")
    private String content;

    // ── SOAP structured fields ─────────────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String subjective;   // S — What the patient reported

    @Column(columnDefinition = "TEXT")
    private String objective;    // O — Therapist's clinical observations

    @Column(columnDefinition = "TEXT")
    private String assessment;   // A — Diagnosis / clinical impression

    @Column(columnDefinition = "TEXT")
    private String plan;         // P — Treatment plan / next steps / homework

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
