package com.patientbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

// Manual superadmin override — for comps, refunds, or suspending an abusive
// account, without a client-submitted payment proof to approve.
@Data
public class SubscriptionOverrideRequest {
    @NotBlank
    @Pattern(regexp = "ACTIVATE|SUSPEND", message = "action must be ACTIVATE or SUSPEND")
    private String action;

    // ACTIVATE only — days to extend from max(now, currentPeriodEnd). Defaults to 365.
    private Integer extendDays;
}
