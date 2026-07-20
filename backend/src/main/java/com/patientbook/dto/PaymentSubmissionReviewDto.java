package com.patientbook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Superadmin-facing view of a submission — includes the tenant identity and
// the actual screenshot, since the whole point is manually eyeballing it.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSubmissionReviewDto {
    private Long id;
    private Long psychologistId;
    private String psychologistName;
    private String psychologistEmail;
    private String upiTransactionRef;
    private BigDecimal amountClaimed;
    private String screenshotBase64;
    private String status;
    private String reviewNote;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
