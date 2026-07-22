package com.patientbook.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ConvertDemoRequest {

    @NotNull
    private LocalDate appointmentDate;

    @NotNull
    private LocalTime startTime;

    private String sessionType; // service ID; if null keeps existing serviceInterest
    // No tenant id here — the demo appointment already carries its tenant
    // from when it was requested, and converting it never changes hands.

    // Optional — assign the converted appointment to a specific clinic staff
    // member (validated server-side via StaffResolutionService). Defaults to
    // the clinic owner/tenant root when omitted.
    private Long staffId;
}
