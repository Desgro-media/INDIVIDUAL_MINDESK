package com.patientbook.controller;

import com.patientbook.entity.Patient;
import com.patientbook.dto.AppointmentDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.PatientService;
import com.patientbook.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;
    private final AppointmentService appointmentService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Patient>> getAllPatients() {
        return ResponseEntity.ok(patientService.getAllPatients(currentUserProvider.getCurrentUserId()));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Patient> createPatient(@RequestBody Patient patient) {
        return ResponseEntity.ok(patientService.createPatient(patient, currentUserProvider.getCurrentUserId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Patient> getPatientById(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getPatientById(id, currentUserProvider.getCurrentUserId()));
    }

    @GetMapping("/{id}/appointments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AppointmentDto>> getPatientAppointments(@PathVariable Long id) {
        Long ownerId = currentUserProvider.getCurrentUserId();
        return ResponseEntity.ok(appointmentService.getAppointmentsByPatientIdAndPsychologist(id, ownerId));
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
                id, currentUserProvider.getCurrentUserId(), name, email, phone));
    }

    @PatchMapping("/{id}/risk-flag")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Patient> updateRiskFlag(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Boolean riskFlag  = Boolean.valueOf(body.get("riskFlag").toString());
        String riskReason = body.get("riskReason") != null ? body.get("riskReason").toString() : null;
        return ResponseEntity.ok(patientService.updateRiskFlag(
                id, currentUserProvider.getCurrentUserId(), riskFlag, riskReason));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id, currentUserProvider.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
