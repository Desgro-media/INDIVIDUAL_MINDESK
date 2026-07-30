package com.patientbook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionStatusDto {
    private String status;       // TRIALING | SCHEDULED | ACTIVE | EXPIRED | CANCELLED
    private boolean locked;      // dashboard access blocked right now
    private String plan;
    private BigDecimal amount;
    private LocalDateTime trialStartDate;
    private LocalDateTime trialEndDate;
    private LocalDateTime currentPeriodStart; // null = no start gate (already begun)
    private LocalDateTime currentPeriodEnd;
    // Days until whichever deadline governs access right now (trial end,
    // scheduled start, or period end). Null when not applicable — expired, or
    // grandfathered with no end date.
    private Integer daysRemaining;
    private String platformUpiId;
    private String platformUpiQrBase64;
}
