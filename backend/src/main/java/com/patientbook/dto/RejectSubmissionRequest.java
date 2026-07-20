package com.patientbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RejectSubmissionRequest {
    @NotBlank
    @Size(max = 500)
    private String reason;
}
