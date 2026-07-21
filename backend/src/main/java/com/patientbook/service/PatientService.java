package com.patientbook.service;

import com.patientbook.entity.Patient;
import com.patientbook.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.patientbook.entity.Appointment;
import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.InvoiceRepository;
import com.patientbook.repository.MoodLogRepository;
import com.patientbook.repository.NotificationLogRepository;
import com.patientbook.repository.PatientAttachmentRepository;
import com.patientbook.repository.SessionNoteRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final MoodLogRepository moodLogRepository;
    private final SessionNoteRepository sessionNoteRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final PatientAttachmentRepository patientAttachmentRepository;

    public List<Patient> getAllPatients(Long ownerId) {
        return patientRepository.findByPrimaryPsychologistId(ownerId);
    }

    @Transactional
    public Patient createPatient(Patient patient, Long ownerId) {
        if (patient.getRiskFlag() == null) patient.setRiskFlag(false);
        if (patient.getSource() == null || patient.getSource().isBlank()) patient.setSource("Direct");
        patient.setPrimaryPsychologistId(ownerId);
        return patientRepository.save(patient);
    }

    public Patient getPatientById(Long id, Long ownerId) {
        return patientRepository.findByIdAndPrimaryPsychologistId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
    }

    // ── Risk / Crisis Alert Flag ───────────────────────────────────────────
    @Transactional
    public Patient updatePatientDetails(Long id, Long ownerId, String name, String email, String phone) {
        Patient patient = getPatientById(id, ownerId);
        if (name != null && !name.isBlank()) patient.setName(name.trim());
        if (email != null) patient.setEmail(email.trim().isEmpty() ? null : email.trim());
        if (phone != null && !phone.isBlank()) patient.setPhone(phone.trim());
        return patientRepository.save(patient);
    }

    @Transactional
    public Patient updateRiskFlag(Long id, Long ownerId, Boolean riskFlag, String riskReason) {
        Patient patient = getPatientById(id, ownerId);
        patient.setRiskFlag(riskFlag);
        if (riskFlag) {
            patient.setRiskReason(riskReason);
            patient.setRiskFlaggedAt(LocalDateTime.now());
        } else {
            patient.setRiskReason(null);
            patient.setRiskFlaggedAt(null);
        }
        return patientRepository.save(patient);
    }

    @Transactional
    public void deletePatient(Long id, Long ownerId) {
        Patient patient = getPatientById(id, ownerId);

        List<Appointment> appointments = appointmentRepository.findByPatientIdOrderByAppointmentDateDescStartTimeDesc(id);
        for (Appointment appt : appointments) {
            notificationLogRepository.deleteByAppointmentId(appt.getId());
        }

        invoiceRepository.deleteByPatientId(id);
        moodLogRepository.deleteByPatientId(id);
        sessionNoteRepository.deleteByPatientId(id);
        patientAttachmentRepository.deleteByPatientId(id);
        appointmentRepository.deleteByPatientId(id);

        patientRepository.delete(patient);
    }
}
