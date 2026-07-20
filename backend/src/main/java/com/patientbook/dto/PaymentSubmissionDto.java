package com.patientbook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// The tenant's own submission history — deliberately excludes the base64
// screenshot to keep this list light; the superadmin review queue is where
// the actual image gets rendered (see PaymentSubmissionReviewDto).
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSubmissionDto {
    private Long id;
    private String upiTransactionRef;
    private BigDecimal amountClaimed;
    private boolean hasScreenshot;
    private String status;
    private String reviewNote;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
