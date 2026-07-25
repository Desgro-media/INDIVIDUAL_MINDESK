package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

// Lets a client-side calendar disable dates that have no chance of a slot
// for the selected mode, instead of only discovering that after the user
// picks a date and the per-date slots fetch comes back empty. Recurring
// weekly pattern first (enabledWeekdays), then the two ways a specific
// date can differ from that pattern (extraDates opens an otherwise-off
// day, blockedDates closes an otherwise-on day) — see
// DoctorAvailabilityService.getAvailabilitySummary.
@Data
@Builder
public class AvailabilitySummaryDto {
    private List<String> enabledWeekdays;
    private List<String> extraDates;
    private List<String> blockedDates;
}
