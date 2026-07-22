package com.patientbook.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class BookingRequest {
    @NotBlank
    @Size(max = 150)
    private String patientName;

    @Email
    @Size(max = 150)
    private String patientEmail;

    @NotBlank
    @Size(max = 30)
    private String patientPhone;

    @NotNull
    private LocalDate appointmentDate;

    @NotNull
    private LocalTime startTime;

    // Optional fields from the booking wizard
    @Size(max = 30)
    private String sessionType; // service ID as string
    @Size(max = 2000)
    private String notes;       // Patient's optional message / reason for visit

    // Which practitioner's public booking link this came through — the
    // server resolves this to an owner id, never trusts a raw numeric id
    // from the client.
    @NotBlank
    @Size(max = 100)
    private String slug;

    // Optional — which specific staff member (within a clinic) this booking
    // is for. Always validated server-side (see StaffResolutionService)
    // before use; never trusted as-is. Null/omitted for individual
    // practitioners and for a clinic's default/first-available booking.
    private Long staffId;
}
