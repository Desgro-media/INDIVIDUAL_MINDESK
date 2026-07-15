package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class InvoiceDto {
    private Long id;
    private Long appointmentId;
    private Long patientId;
    private String patientName;
    private String patientEmail;
    private String sessionType;
    private LocalDate appointmentDate;
    private BigDecimal amount;        // Base fee
    private BigDecimal discountAmount; // Doctor's discount (0 if none)
    private BigDecimal finalAmount;    // amount - discountAmount (what patient actually pays)
    private String discountReason;
    private String status;          // UNPAID, PAID, WAIVED
    private String paymentMethod;   // CASH, CARD, UPI, INSURANCE, MANUAL_TRANSFER
    private String remark;          // General transaction remark
    private String toAccount;       // Resolved account name: bank account name or "Cash in hand"
    private Long bankAccountId;     // ID of the bank account payment was credited to (null for cash)
    private String bankAccountName; // Snapshot of account name at time of payment
    private LocalDate paidAt;
    private LocalDateTime createdAt;
}
