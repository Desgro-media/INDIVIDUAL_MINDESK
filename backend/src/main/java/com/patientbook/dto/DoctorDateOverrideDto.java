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
    // ONLINE, OFFLINE, or null (null = applies to both calendars — only
    // valid for a whole-day block, see DoctorDateOverride).
    private String mode;
}
