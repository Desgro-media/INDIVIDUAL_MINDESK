package com.patientbook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantSummaryDto {
    private Long id;
    private String name;
    private String email;
    // Null for tenant roots created before phone became a required signup
    // field — shown as such in the superadmin tenant table, not hidden.
    private String phone;
    private String slug;
    private LocalDateTime createdAt;
    // TRIALING | SCHEDULED | ACTIVE | EXPIRED | CANCELLED — always the live
    // resolved status (SubscriptionService.resolve), never the raw stored one.
    private String subscriptionStatus;
    private boolean locked;
    private LocalDateTime trialEndDate;
    private LocalDateTime currentPeriodStart;
    private LocalDateTime currentPeriodEnd;

    // Counts toward whichever deadline currently governs access: trial end
    // while TRIALING, period start while SCHEDULED, period end while ACTIVE.
    private Integer daysRemaining;

    // "INDIVIDUAL" or "CLINIC" — lets the superadmin tenant list visually
    // distinguish a solo freelancer from a clinic. staffCount is always 0 for
    // an individual; shown alongside the badge for a clinic.
    private String accountType;
    private int staffCount;
}
