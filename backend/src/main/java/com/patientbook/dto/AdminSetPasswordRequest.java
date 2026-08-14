package com.patientbook.dto;

import lombok.Data;

// A superadmin issuing a locked-out tenant a new password.
//
// password is optional: omit it and the server generates a strong one that's
// safe to read aloud over a phone call (see SuperAdminService.generatePassword).
// Supplying one is only for the case where the admin and the client have
// already agreed on something over the phone.
//
// There is no "old password" field, and there could never be one — stored
// passwords are bcrypt hashes, which are one-way, so nothing in this system
// can recover what a client's password used to be. This endpoint replaces;
// it cannot reveal.
@Data
public class AdminSetPasswordRequest {
    private String password;
}
