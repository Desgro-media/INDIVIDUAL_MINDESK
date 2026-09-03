package com.patientbook.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LeadRequest {
    @NotBlank
    @Size(max = 150)
    private String name;

    @Email
    @Size(max = 150)
    private String email;

    @NotBlank
    @Size(max = 30)
    private String phone;

    @Size(max = 2000)
    private String notes;
}
