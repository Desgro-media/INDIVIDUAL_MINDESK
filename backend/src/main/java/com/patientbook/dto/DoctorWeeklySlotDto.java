package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DoctorWeeklySlotDto {
    private Long id;
    private String dayOfWeek;
    private String slotTime;
    private boolean active;
}
