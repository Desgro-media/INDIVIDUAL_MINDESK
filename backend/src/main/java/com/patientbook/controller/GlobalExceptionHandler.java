package com.patientbook.controller;

import com.patientbook.service.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.format.DateTimeParseException;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Record doesn't exist OR belongs to a different account — both look
    // identical to the caller. See ResourceNotFoundException for why.
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadInput(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
    }

    // Re-throw so Spring Security's AccessDeniedHandler returns the correct 403.
    @ExceptionHandler(AccessDeniedException.class)
    public void handleAccessDenied(AccessDeniedException ex) throws AccessDeniedException {
        throw ex;
    }

    // Thrown directly by AuthenticationManager.authenticate() inside
    // AuthController (login happens via a plain method call, not the
    // security filter chain, so it lands here like any other controller
    // exception) — covers a wrong password (BadCredentialsException), an
    // unknown email (Spring Security's DaoAuthenticationProvider already
    // masks this as BadCredentialsException by default — verified, not
    // assumed), and a deactivated staff account (DisabledException, see
    // UserDetailsServiceImpl). Without this handler all three fell through
    // to the generic RuntimeException handler below and returned a bare 500.
    //
    // Deliberately ignores ex.getMessage() and always returns the same fixed
    // string — Spring Security's enabled/locked/expired checks run BEFORE
    // password verification, so a distinct "account disabled" message here
    // would let anyone probe arbitrary emails (with any password) to find
    // out which specific staff accounts have been deactivated, the same
    // enumeration risk the default BadCredentials-masking already closes for
    // "does this email have an account at all."
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email or password"));
    }

    @ExceptionHandler({DateTimeParseException.class, NumberFormatException.class})
    public ResponseEntity<Map<String, String>> handleParsing(Exception ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid date/time or number format: " + ex.getMessage()));
    }

    // Deliberately does NOT return ex.getMessage() to the client — an
    // uncaught RuntimeException here is by definition unexpected, and its
    // message can contain internal details (SQL, file paths, library
    // internals). Log the real one server-side; the client only ever sees a
    // generic message.
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        log.error("Unhandled RuntimeException", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "An unexpected error occurred"));
    }
}
