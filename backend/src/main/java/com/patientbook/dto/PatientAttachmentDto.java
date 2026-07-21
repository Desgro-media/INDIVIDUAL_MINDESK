package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

// Metadata only — never carries fileData. Keeps the list endpoint light
// regardless of how many/large the attachments are; the actual bytes are
// only ever fetched one at a time via the dedicated download endpoint.
@Data
@Builder
public class PatientAttachmentDto {
    private Long id;
    private Long patientId;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private LocalDateTime uploadedAt;
}
