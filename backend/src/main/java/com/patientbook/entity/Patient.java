package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "patient",
        uniqueConstraints = @UniqueConstraint(columnNames = {"phone", "primary_psychologist_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = true)
    private String email;

    // Unique per-owner, not globally — two different freelancers' patients
    // may share a phone number.
    @Column(nullable = false)
    private String phone;

    // ── Risk / Crisis Alert Flag ───────────────────────────────────────────
    @Column(nullable = false)
    @Builder.Default
    private Boolean riskFlag = false;

    @Column(columnDefinition = "TEXT")
    private String riskReason;

    @Column(columnDefinition = "TEXT")
    private String additionalNotes;

    @Column(name = "telegram_chat_id")
    private String telegramChatId;

    @Column(nullable = false, columnDefinition = "VARCHAR(255) DEFAULT 'Direct'")
    @Builder.Default
    private String source = "Direct";

    private LocalDateTime riskFlaggedAt;

    // The owning practitioner — every patient belongs to exactly one account
    @Column(name = "primary_psychologist_id", nullable = false)
    private Long primaryPsychologistId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
