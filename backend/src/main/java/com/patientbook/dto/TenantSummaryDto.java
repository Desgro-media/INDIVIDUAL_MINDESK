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
    private String slug;
    private LocalDateTime createdAt;
    private String subscriptionStatus;
    private boolean locked;
    private LocalDateTime trialEndDate;
    private LocalDateTime currentPeriodEnd;
    private Integer daysRemaining;

    // "INDIVIDUAL" or "CLINIC" — lets the superadmin tenant list visually
    // distinguish a solo freelancer from a clinic. staffCount is always 0 for
    // an individual; shown alongside the badge for a clinic.
    private String accountType;
    private int staffCount;
}
