package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mood_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoodLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Backfilled from appointment.psychologistId at creation time
    @Column(name = "psychologist_id", nullable = false)
    private Long psychologistId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment; // Which session this mood log is linked to

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(nullable = false)
    private Integer moodScore; // 1 (Very Low) to 10 (Excellent)

    @Column(columnDefinition = "TEXT")
    private String note; // Optional patient comment

    @Column(nullable = false)
    private LocalDate logDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
