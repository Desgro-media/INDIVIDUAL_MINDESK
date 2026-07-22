package com.patientbook.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupRequest {
    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    // "INDIVIDUAL" or "CLINIC" — defaults to INDIVIDUAL (see AuthController)
    // when omitted, so any pre-existing signup integration keeps working
    // unchanged. Validated/parsed server-side, never trusted as a raw enum.
    private String accountType;

    // Only meaningful when accountType is CLINIC — seeds ClinicSettings.clinicName.
    @Size(max = 150)
    private String clinicName;
}
