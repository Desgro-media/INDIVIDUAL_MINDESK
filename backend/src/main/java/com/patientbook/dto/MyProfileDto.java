package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

// Never include the password hash in an API response — this is the
// client-safe view of AppUser used by GET/PATCH /me/profile.
@Data
@Builder
public class MyProfileDto {
    private Long id;
    private String username;
    private String name;
    private String slug;
    private String jobTitle;
    private String bio;
    private boolean bookable;
    private String profileImageUrl;
}
