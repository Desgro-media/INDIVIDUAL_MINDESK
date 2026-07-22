package com.patientbook.dto;

import lombok.Data;

import java.util.List;

// Create/update payload for a clinic's staff member — see StaffService.
@Data
public class StaffDto {
    private String name;
    private String username;
    private String password;      // required on create, optional on update (blank = unchanged)
    private String jobTitle;
    private List<String> permissions;

    // ROLE_STAFF, ROLE_RECEPTIONIST, or ROLE_PSYCHOLOGIST (a bookable
    // doctor within the clinic) — see StaffService.ALLOWED_ROLES.
    private String role;

    // Psychologist-specific (ignored for STAFF/RECEPTIONIST). Boolean (not
    // boolean) so the service can tell "omitted, leave unchanged" apart from
    // "explicitly set to false" on partial updates.
    private String bio;
    private Boolean bookable;
    private String profileImageUrl;
}
