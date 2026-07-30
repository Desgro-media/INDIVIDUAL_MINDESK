package com.patientbook.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;

// Manual superadmin override — for comps, refunds, custom billing periods, or
// suspending an abusive account, without a client-submitted payment proof.
//
// Dates are date-only (LocalDate), never timestamps. The admin picks calendar
// days; the backend alone decides the time-of-day boundaries
// (SuperAdminService.resolveWindow: start -> 00:00:00, end -> 23:59:59.999).
// Keeping the wire format date-only is what stops the client's timezone from
// ever shifting a boundary by a day.
@Data
public class SubscriptionOverrideRequest {
    @NotBlank
    @Pattern(regexp = "ACTIVATE|SUSPEND", message = "action must be ACTIVATE or SUSPEND")
    private String action;

    // ACTIVATE only. ONE_MONTH/SIX_MONTHS/ONE_YEAR derive endDate from the
    // resolved start; CUSTOM requires an explicit endDate. Absent => falls back
    // to extendDays, then to a 1-year default, so older clients keep working.
    @Pattern(regexp = "ONE_MONTH|SIX_MONTHS|ONE_YEAR|CUSTOM",
             message = "preset must be ONE_MONTH, SIX_MONTHS, ONE_YEAR or CUSTOM")
    private String preset;

    // Optional. Omitted => the period starts at max(today, currentPeriodEnd),
    // i.e. renewals queue after whatever the tenant already paid for instead of
    // burning their remaining days. Set it explicitly to backdate or to
    // schedule a future start.
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    // Required when preset is CUSTOM; ignored for the fixed-duration presets,
    // which compute it from the start so the two can never contradict.
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    // Legacy: days to extend from max(now, currentPeriodEnd). Superseded by
    // preset/startDate/endDate and only consulted when no preset is given.
    private Integer extendDays;
}
