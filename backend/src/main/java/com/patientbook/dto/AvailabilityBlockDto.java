package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AvailabilityBlockDto {
    private Long id;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private int intervalMinutes;
    // ONLINE or OFFLINE — which calendar this block belongs to.
    private String mode;
}
