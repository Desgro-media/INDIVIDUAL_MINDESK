package com.patientbook.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DemoBookingRequest {

    @NotBlank
    private String patientName;

    @NotBlank
    @Email
    private String patientEmail;

    @NotBlank
    private String patientPhone;

    private String serviceInterest; // service ID (optional)
    private String preferredTime;   // free-text preference, e.g. "Weekday evenings"
    private String notes;

    // Which practitioner's public demo-call link this came through
    @NotBlank
    private String slug;
}
