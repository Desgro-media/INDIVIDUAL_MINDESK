package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

// Never returns the StaffAttendance entity directly — its ManyToOne AppUser
// carries the password hash (same convention as DoctorController's
// MyProfileDto / StaffSummaryDto).
@Data
@Builder
public class AttendanceDto {
    private Long id;
    private Long staffId;
    private String staffName;
    private String staffUsername;
    private String staffJobTitle;
    private LocalDateTime loginTime;
    private LocalDateTime logoutTime;
    private Long workMinutes;
    private LocalDate date;
}
