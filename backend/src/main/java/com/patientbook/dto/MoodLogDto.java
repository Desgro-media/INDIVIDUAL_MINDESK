package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class MoodLogDto {
    private Long id;
    private Long patientId;
    private Long appointmentId;
    private Integer moodScore; // 1-10
    private String note;
    private LocalDate logDate;
    private LocalDateTime createdAt;
}
