package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SessionNoteDto {
    private Long id;
    private Long appointmentId;
    private Long patientId;
    // Legacy field
    private String content;
    // SOAP fields
    private String subjective;
    private String objective;
    private String assessment;
    private String plan;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
