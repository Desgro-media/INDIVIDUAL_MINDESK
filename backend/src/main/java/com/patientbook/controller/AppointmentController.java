package com.patientbook.controller;

import com.patientbook.dto.AppointmentDto;
import com.patientbook.dto.BookingRequest;
import com.patientbook.dto.ConvertDemoRequest;
import com.patientbook.dto.DemoBookingRequest;
import com.patientbook.dto.RebookRequestDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final CurrentUserProvider currentUserProvider;

    // ── Public endpoints ────────────────────────────────────────────────────

    @PostMapping("/appointments")
    public ResponseEntity<AppointmentDto> bookAppointment(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.ok(appointmentService.bookAppointment(request));
    }

    // ── Manual scheduling from the dashboard (the practitioner booking a
    // slot for a patient themselves, not the public booking form) — always
    // under the caller's own account, never a client-supplied owner. ─────
    @PostMapping("/appointments/manual")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppointmentDto> scheduleManually(@RequestBody BookingRequest request) {
        return ResponseEntity.ok(appointmentService.bookAppointmentForOwner(
                request, currentUserProvider.getCurrentUserId()));
    }

    @PostMapping("/demo-booking")
    public ResponseEntity<AppointmentDto> requestDemoCall(@Valid @RequestBody DemoBookingRequest request) {
        return ResponseEntity.ok(appointmentService.requestDemoCall(request));
    }

    @GetMapping("/track/{token}")
    public ResponseEntity<AppointmentDto> trackAppointment(@PathVariable String token) {
        return ResponseEntity.ok(appointmentService.getAppointmentByToken(token));
    }

    @PostMapping("/track/{token}/rebook")
    public ResponseEntity<AppointmentDto> rebookAppointment(
            @PathVariable String token,
            @Valid @RequestBody RebookRequestDto request) {
        return ResponseEntity.ok(appointmentService.rebookAppointment(token, request));
    }

    @PostMapping("/track/{token}/rating")
    public ResponseEntity<AppointmentDto> submitRating(
            @PathVariable String token,
            @RequestBody java.util.Map<String, Object> payload) {
        Integer rating = (Integer) payload.get("rating");
        String feedback = (String) payload.get("feedback");
        return ResponseEntity.ok(appointmentService.submitRating(token, rating, feedback));
    }

    @PostMapping("/track/{token}/report-payment")
    public ResponseEntity<AppointmentDto> reportPayment(
            @PathVariable String token,
            @RequestBody java.util.Map<String, String> payload) {
        String paymentScreenshotBase64 = payload.get("paymentScreenshotBase64");
        return ResponseEntity.ok(appointmentService.reportPaymentMade(token, paymentScreenshotBase64));
    }

    // ── Record a past session (always under the caller's own account) ─────
    @PostMapping("/appointments/past")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppointmentDto> recordPastSession(@RequestBody java.util.Map<String, String> body) {
        if (body.get("patientId") == null || body.get("appointmentDate") == null || body.get("startTime") == null) {
            throw new IllegalArgumentException("patientId, appointmentDate, and startTime are required");
        }
        Long patientId     = Long.parseLong(body.get("patientId"));
        LocalDate date     = LocalDate.parse(body.get("appointmentDate"));
        String timeStr     = body.get("startTime").length() == 4 ? "0" + body.get("startTime") : body.get("startTime");
        LocalTime time     = LocalTime.parse(timeStr);
        String sessionType = body.get("sessionType");
        String notes       = body.getOrDefault("notes", "");
        String status      = body.getOrDefault("status", "COMPLETED");

        Long ownerId = currentUserProvider.getCurrentUserId();
        return ResponseEntity.ok(
                appointmentService.recordPastSession(patientId, ownerId, date, time, sessionType, notes, status));
    }

    // ── Protected endpoints — always scoped to the caller's own account ───

    @GetMapping("/appointments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AppointmentDto>> getAllAppointments() {
        return ResponseEntity.ok(appointmentService.getAppointmentsByPsychologist(currentUserProvider.getCurrentUserId()));
    }

    @PatchMapping("/appointments/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppointmentDto> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String cancellationReason,
            @RequestParam(required = false) BigDecimal fee) {
        return ResponseEntity.ok(appointmentService.updateAppointmentStatus(
                id, currentUserProvider.getCurrentUserId(), status, cancellationReason, fee));
    }

    @PatchMapping("/appointments/{id}/convert")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppointmentDto> convertDemoToAppointment(
            @PathVariable Long id,
            @Valid @RequestBody ConvertDemoRequest request) {
        return ResponseEntity.ok(appointmentService.convertDemoToAppointment(
                id, currentUserProvider.getCurrentUserId(), request));
    }

    @PatchMapping("/appointments/{id}/notes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppointmentDto> updateNotes(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload) {
        return ResponseEntity.ok(appointmentService.updateAppointmentNotes(
                id, currentUserProvider.getCurrentUserId(), payload.get("notes")));
    }

    @DeleteMapping("/appointments/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteAppointment(@PathVariable Long id) {
        appointmentService.deleteAppointment(id, currentUserProvider.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/appointments/{id}/details")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppointmentDto> updateAppointmentDetails(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        LocalDate date     = body.get("appointmentDate") != null ? LocalDate.parse(body.get("appointmentDate")) : null;
        LocalTime time     = body.get("startTime")       != null ? LocalTime.parse(body.get("startTime"))       : null;
        String sessionType = body.get("sessionType");
        String notes       = body.get("notes");
        return ResponseEntity.ok(appointmentService.updateAppointmentDetails(
                id, currentUserProvider.getCurrentUserId(), date, time, sessionType, notes));
    }
}
