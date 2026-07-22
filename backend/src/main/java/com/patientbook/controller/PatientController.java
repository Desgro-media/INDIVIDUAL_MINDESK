package com.patientbook.controller;

import com.patientbook.entity.Patient;
import com.patientbook.entity.PatientAttachment;
import com.patientbook.dto.AppointmentDto;
import com.patientbook.dto.PatientAttachmentDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.PatientService;
import com.patientbook.service.PatientAttachmentService;
import com.patientbook.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;
    private final AppointmentService appointmentService;
    private final PatientAttachmentService patientAttachmentService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Patient>> getAllPatients() {
        return ResponseEntity.ok(patientService.getAllPatients(currentUserProvider.getCurrentTenantId()));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Patient> createPatient(@RequestBody Patient patient) {
        return ResponseEntity.ok(patientService.createPatient(patient, currentUserProvider.getCurrentTenantId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Patient> getPatientById(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getPatientById(id, currentUserProvider.getCurrentTenantId()));
    }

    @GetMapping("/{id}/appointments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AppointmentDto>> getPatientAppointments(@PathVariable Long id) {
        Long tenantId = currentUserProvider.getCurrentTenantId();
        return ResponseEntity.ok(appointmentService.getAppointmentsByPatientIdAndPsychologist(id, tenantId));
    }

    @PatchMapping("/{id}/details")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Patient> updatePatientDetails(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String name  = body.get("name")  != null ? body.get("name").toString()  : null;
        String email = body.get("email") != null ? body.get("email").toString() : null;
        String phone = body.get("phone") != null ? body.get("phone").toString() : null;
        return ResponseEntity.ok(patientService.updatePatientDetails(
                id, currentUserProvider.getCurrentTenantId(), name, email, phone));
    }

    @PatchMapping("/{id}/risk-flag")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Patient> updateRiskFlag(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Boolean riskFlag  = Boolean.valueOf(body.get("riskFlag").toString());
        String riskReason = body.get("riskReason") != null ? body.get("riskReason").toString() : null;
        return ResponseEntity.ok(patientService.updateRiskFlag(
                id, currentUserProvider.getCurrentTenantId(), riskFlag, riskReason));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id, currentUserProvider.getCurrentTenantId());
        return ResponseEntity.noContent().build();
    }

    // ── File Attachments ────────────────────────────────────────────────────

    // Body: { "fileName": "...", "fileData": "data:<mime>;base64,...." }
    // (same FileReader.readAsDataURL convention as every other upload in this app)
    @PostMapping("/{id}/attachments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PatientAttachmentDto> uploadAttachment(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String fileName = body.get("fileName") != null ? body.get("fileName").toString() : null;
        String fileData = body.get("fileData") != null ? body.get("fileData").toString() : null;
        return ResponseEntity.ok(patientAttachmentService.uploadAttachment(
                id, currentUserProvider.getCurrentTenantId(), fileName, fileData));
    }

    @GetMapping("/{id}/attachments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PatientAttachmentDto>> getAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(patientAttachmentService.getAttachments(id, currentUserProvider.getCurrentTenantId()));
    }

    @GetMapping("/{id}/attachments/{attachmentId}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> downloadAttachment(@PathVariable Long id, @PathVariable Long attachmentId) {
        PatientAttachment attachment = patientAttachmentService.getAttachmentForDownload(
                id, attachmentId, currentUserProvider.getCurrentTenantId());
        byte[] fileBytes = Base64.getDecoder().decode(attachment.getFileData());
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(attachment.getFileName(), java.nio.charset.StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(fileBytes);
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long id, @PathVariable Long attachmentId) {
        patientAttachmentService.deleteAttachment(id, attachmentId, currentUserProvider.getCurrentTenantId());
        return ResponseEntity.noContent().build();
    }
}
