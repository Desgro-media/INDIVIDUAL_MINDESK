package com.patientbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class BookingRequest {
    @NotBlank
    private String patientName;

    private String patientEmail;

    @NotBlank
    private String patientPhone;

    @NotNull
    private LocalDate appointmentDate;

    @NotNull
    private LocalTime startTime;

    // Optional fields from the booking wizard
    private String sessionType; // service ID as string
    private String notes;       // Patient's optional message / reason for visit

    // Which practitioner's public booking link this came through — the
    // server resolves this to an owner id, never trusts a raw numeric id
    // from the client.
    @NotBlank
    private String slug;
}
