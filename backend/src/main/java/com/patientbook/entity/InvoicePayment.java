package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// One row per actual payment collected against an Invoice — a full
// single-shot settlement (InvoiceService.markAsPaid) and a partial
// front-desk collection (InvoiceService.recordPayment) both write here, so
// this table is the single ledger behind Invoice.amountPaid/balanceDue
// regardless of which endpoint collected the money. Lets a receptionist
// take several partial payments against one invoice over time and see
// exactly when each one was collected.
@Entity
@Table(name = "invoice_payment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoicePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    private String paymentMethod; // CASH, CARD, UPI, INSURANCE, MANUAL_TRANSFER

    @Column(name = "bank_account_id")
    private Long bankAccountId;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    private String remark;

    // The specific staff member (owner, therapist, or receptionist) who
    // recorded this payment — never the tenant id, see CurrentUserProvider —
    // for accountability when a clinic has more than one front-desk login.
    @Column(name = "collected_by_staff_id")
    private Long collectedByStaffId;

    @Column(nullable = false)
    private LocalDateTime paidAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
