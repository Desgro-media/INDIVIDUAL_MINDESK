package com.patientbook.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class RebookRequestDto {
    @NotNull
    private LocalDate newAppointmentDate;
    
    @NotNull
    private LocalTime newStartTime;
}
