package com.patientbook.service;

// Thrown whenever a record either doesn't exist or doesn't belong to the
// caller. Deliberately the SAME exception for both cases — see
// GlobalExceptionHandler — so a cross-tenant id probe gets an identical 404
// to a made-up id, instead of a 403/200 that would confirm the record exists
// under someone else's account.
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
