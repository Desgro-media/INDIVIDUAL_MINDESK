package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "patient_attachment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Denormalized owner id — same pattern as SessionNote.psychologistId,
    // lets ownership be checked in a single query alongside patientId/id.
    @Column(name = "psychologist_id", nullable = false)
    private Long psychologistId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(nullable = false, length = 255)
    private String fileName;

    // Canonical MIME type resolved server-side from the file extension —
    // never trusted verbatim from the client (see PatientAttachmentService).
    @Column(nullable = false, length = 100)
    private String fileType;

    // Decoded byte size (not the base64 string length).
    @Column(nullable = false)
    private Long fileSize;

    // Base64-encoded file bytes, no "data:...;base64," prefix.
    @Column(columnDefinition = "TEXT", nullable = false)
    private String fileData;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime uploadedAt;
}
