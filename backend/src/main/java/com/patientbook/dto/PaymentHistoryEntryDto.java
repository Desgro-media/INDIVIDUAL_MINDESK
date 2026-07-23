package com.patientbook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Lean read-only row for the superadmin's Recent Payment History feed —
// deliberately omits screenshotBase64 (unlike PaymentSubmissionReviewDto),
// since that's only needed while actively reviewing a PENDING submission,
// not for scrolling a history list that includes every past status.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentHistoryEntryDto {
    private Long id;
    private Long psychologistId;
    private String psychologistName;
    private String psychologistEmail;
    private String accountType;
    private String upiTransactionRef;
    private BigDecimal amountClaimed;
    private String status;
    private String reviewNote;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
