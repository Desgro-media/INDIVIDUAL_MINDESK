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
    // No psychologistId here — the demo appointment already carries its
    // owner from when it was requested, and converting it never changes hands.
}
