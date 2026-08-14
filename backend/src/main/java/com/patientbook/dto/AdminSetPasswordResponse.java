package com.patientbook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// The result of a superadmin password rescue. temporaryPassword is the ONLY
// time this value exists anywhere outside the admin's screen — it is never
// stored in plaintext, never logged, and never returned again by any other
// endpoint. If the admin closes the dialog without noting it down, the only
// remedy is to issue another one.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSetPasswordResponse {
    private Long tenantId;
    private String name;
    private String email;
    private String temporaryPassword;
    private LocalDateTime changedAt;
}
