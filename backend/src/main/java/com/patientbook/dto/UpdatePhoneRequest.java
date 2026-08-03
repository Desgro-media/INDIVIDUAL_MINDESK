package com.patientbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

// Body of PATCH /api/v1/auth/phone — lets a tenant root fill in the phone
// number for accounts created before SignupRequest required one (see
// AuthController.updatePhone).
@Data
public class UpdatePhoneRequest {
    @NotBlank
    @Size(max = 30)
    private String phone;
}
