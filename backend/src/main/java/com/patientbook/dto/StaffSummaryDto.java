package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

// Never returns the AppUser entity directly — it carries the password hash
// (same convention as DoctorController.toProfileDto). Returned by
// StaffController for a clinic's own staff-management dashboard.
@Data
@Builder
public class StaffSummaryDto {
    private Long id;
    private String name;
    private String username;
    private String jobTitle;
    private String role;
    private List<String> permissions;
    private String bio;
    private boolean bookable;
    private String profileImageUrl;
    private boolean enabled;
    private LocalDateTime createdAt;
}
