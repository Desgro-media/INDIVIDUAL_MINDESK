package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.math.BigDecimal;

@Data
@Builder
public class AppointmentDto {
    private Long id;
    private Long patientId;
    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private LocalDate appointmentDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String status;
    private String trackingToken;
    private String cancellationReason;
    private String sessionType;
    private String notes;
    private Integer rating;
    private String feedback;
    private boolean telegramConnected;
    private BigDecimal fee;
    private String paymentScreenshotBase64;
    private Long previousAppointmentId;   // null for first-ever session
    private boolean returningPatient;      // true if patient has prior completed sessions
    private Long psychologistId;
    private String psychologistName;
    private String psychologistSlug; // used to link back to the practitioner's public booking page
}
