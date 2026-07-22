package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

// Public-facing summary of a clinic's bookable staff member — deliberately
// carries none of AppUser's sensitive fields (no username, no permissions,
// no tenantId). See PublicController's /staff endpoint.
@Data
@Builder
public class StaffPublicDto {
    private Long id;
    private String name;
    private String jobTitle;
    private String bio;
    private String profileImageUrl;
}
