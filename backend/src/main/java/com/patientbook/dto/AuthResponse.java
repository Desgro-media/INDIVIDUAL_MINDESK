package com.patientbook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    @Builder.Default
    private String type = "Bearer";
    private Long id;
    private String username;
    private String name;
    private String slug;
    private String jobTitle;
    private String role;

    // INDIVIDUAL/CLINIC — null for staff rows and the superadmin (only
    // meaningful on a tenant root). Drives the frontend's Individual-vs-
    // clinic dashboard shape.
    private String accountType;

    // Null for a tenant root (individual or clinic owner) and the
    // superadmin. Set for a clinic staff login — the frontend doesn't
    // currently need this directly (permissions/accountType already convey
    // what to show) but it's included for completeness/debugging.
    private Long tenantId;

    // Dashboard-tab permissions for a clinic staff login (APPOINTMENTS/
    // PATIENTS/BILLING/ANALYTICS/SETTINGS). Empty for a tenant root (always
    // full access) and the superadmin.
    @Builder.Default
    private List<String> permissions = List.of();
}
