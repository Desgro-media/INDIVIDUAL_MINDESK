package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoice")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Backfilled from appointment.psychologistId at creation time
    @Column(name = "psychologist_id", nullable = false)
    private Long psychologistId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", unique = true, nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount; // Base session fee before discount

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO; // Amount discounted by doctor

    private String discountReason; // e.g. "Follow-up discount", "Hardship"

    @Column(nullable = false)
    @Builder.Default
    private String status = "UNPAID"; // UNPAID, PAID, WAIVED

    private String paymentMethod; // CASH, CARD, UPI, INSURANCE, MANUAL_TRANSFER

    @Column(name = "bank_account_id")
    private Long bankAccountId; // FK to bank_account table (nullable — null for cash)

    @Column(name = "bank_account_name")
    private String bankAccountName; // Snapshot of account name at time of payment

    private String remark; // General transaction remark (e.g. "followup")

    private LocalDate paidAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
