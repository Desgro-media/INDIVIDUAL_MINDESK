package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Many rows per practitioner — a history of GPay payment proofs they've
// submitted for a superadmin to manually verify. Screenshot stored the same
// way as Appointment.paymentScreenshotBase64 / BankAccount.qrCodeBase64 (TEXT
// column, base64), consistent with this codebase's existing image-handling
// convention rather than introducing new file-storage infrastructure.
@Entity
@Table(name = "payment_submission")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "psychologist_id", nullable = false)
    private Long psychologistId;

    @Column(nullable = false, length = 100)
    private String upiTransactionRef;

    @Column(columnDefinition = "TEXT")
    private String screenshotBase64;

    private BigDecimal amountClaimed;

    // PENDING, APPROVED, REJECTED
    @Builder.Default
    @Column(nullable = false)
    private String status = "PENDING";

    private Long reviewedByAdminId;
    private LocalDateTime reviewedAt;

    @Column(columnDefinition = "TEXT")
    private String reviewNote;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
