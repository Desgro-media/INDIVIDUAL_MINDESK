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
    private String status = "UNPAID"; // UNPAID, PARTIALLY_PAID, PAID, WAIVED

    // SELF (default) = patient pays online / therapist settles it directly.
    // RECEPTION = the therapist deliberately deferred collection to the
    // front desk at scheduling time (see AppointmentService.bookAppointmentForOwner) —
    // this is what the receptionist's pending-payments queue filters on.
    // "default 'SELF'" so ddl-auto=update backfills every pre-existing
    // invoice instead of leaving it null — same backfill reasoning as
    // this entity's own `version` column further down, and as
    // PaymentSubmission.version.
    @Column(nullable = false, columnDefinition = "varchar(20) default 'SELF'")
    @Builder.Default
    private String paymentHandledBy = "SELF";

    private String paymentMethod; // CASH, CARD, UPI, INSURANCE, MANUAL_TRANSFER

    @Column(name = "bank_account_id")
    private Long bankAccountId; // FK to bank_account table (nullable — null for cash)

    @Column(name = "bank_account_name")
    private String bankAccountName; // Snapshot of account name at time of payment

    private String remark; // General transaction remark (e.g. "followup")

    private LocalDate paidAt;

    // Optimistic lock: closes a TOCTOU gap where two near-simultaneous
    // recordPayment() calls on the same invoice (e.g. two receptionists at
    // the same desk) could both read the same remaining balance before
    // either commits, letting the balance go negative or double-settle the
    // invoice. Same pattern/reasoning as PaymentSubmission.version.
    @Version
    @Column(nullable = false, columnDefinition = "bigint default 0")
    private Long version;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
