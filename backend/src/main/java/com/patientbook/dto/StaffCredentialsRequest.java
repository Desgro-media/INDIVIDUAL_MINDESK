package com.patientbook.dto;

import lombok.Data;

// A clinic admin changing one of their staff members' sign-in details.
//
// Both fields are optional and independent — send only the one being changed.
// Null (or blank) means "leave this as it is", so changing a password can
// never accidentally rewrite the email, or vice versa. Sending neither is
// rejected as a no-op. Validated in StaffService.updateCredentials rather
// than by annotations here, precisely because "absent" is a meaningful value.
@Data
public class StaffCredentialsRequest {
    private String username;
    private String password;
}
