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
    private String status;       // TRIALING | ACTIVE | EXPIRED | CANCELLED
    private boolean locked;      // dashboard access blocked right now
    private String plan;
    private BigDecimal amount;
    private LocalDateTime trialStartDate;
    private LocalDateTime trialEndDate;
    private LocalDateTime currentPeriodEnd;
    private Integer daysRemaining; // null when not applicable (e.g. expired, or grandfathered with no end date)
    private String platformUpiId;
    private String platformUpiQrBase64;
}
