package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;

@Data
@Builder
public class DoctorDateOverrideDto {
    private Long id;
    private LocalDate specificDate;
    private String slotTime;
    private boolean available;
}
