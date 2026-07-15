package com.patientbook.service;

import com.patientbook.dto.SessionNoteDto;
import com.patientbook.entity.Appointment;
import com.patientbook.entity.SessionNote;
import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.SessionNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionNoteService {

    private final SessionNoteRepository sessionNoteRepository;
    private final AppointmentRepository appointmentRepository;

    // ── Create or update a SOAP note for an appointment (own account only) ─
    @Transactional
    public SessionNoteDto saveNote(Long appointmentId, Long ownerId, Map<String, Object> body) {
        Appointment appointment = appointmentRepository.findByIdAndPsychologistId(appointmentId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + appointmentId));

        String subjective  = getStr(body, "subjective");
        String objective   = getStr(body, "objective");
        String assessment  = getStr(body, "assessment");
        String plan        = getStr(body, "plan");
        // Legacy plain content (fallback)
        String content     = getStr(body, "content");

        SessionNote note = sessionNoteRepository.findByAppointmentIdAndPsychologistId(appointmentId, ownerId)
                .map(existing -> {
                    if (subjective  != null) existing.setSubjective(subjective);
                    if (objective   != null) existing.setObjective(objective);
                    if (assessment  != null) existing.setAssessment(assessment);
                    if (plan        != null) existing.setPlan(plan);
                    if (content     != null) existing.setContent(content);
                    return existing;
                })
                .orElseGet(() -> SessionNote.builder()
                        .psychologistId(ownerId)
                        .appointment(appointment)
                        .patient(appointment.getPatient())
                        .subjective(subjective)
                        .objective(objective)
                        .assessment(assessment)
                        .plan(plan)
                        .content(content)
                        .build());

        return mapToDto(sessionNoteRepository.save(note));
    }

    // ── Get note for a specific appointment (own account only) ────────────
    @Transactional(readOnly = true)
    public Optional<SessionNoteDto> getNoteByAppointment(Long appointmentId, Long ownerId) {
        return sessionNoteRepository.findByAppointmentIdAndPsychologistId(appointmentId, ownerId)
                .map(this::mapToDto);
    }

    // ── Get all notes for a patient (own account only) ────────────────────
    @Transactional(readOnly = true)
    public List<SessionNoteDto> getNotesByPatient(Long patientId, Long ownerId) {
        return sessionNoteRepository.findByPatientIdAndPsychologistIdOrderByCreatedAtDesc(patientId, ownerId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ── Delete a note (own account only) ───────────────────────────────────
    @Transactional
    public void deleteNote(Long noteId, Long ownerId) {
        sessionNoteRepository.deleteByIdAndPsychologistId(noteId, ownerId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private String getStr(Map<String, Object> body, String key) {
        Object val = body.get(key);
        return val != null ? val.toString() : null;
    }

    private SessionNoteDto mapToDto(SessionNote note) {
        return SessionNoteDto.builder()
                .id(note.getId())
                .appointmentId(note.getAppointment().getId())
                .patientId(note.getPatient().getId())
                .content(note.getContent())
                .subjective(note.getSubjective())
                .objective(note.getObjective())
                .assessment(note.getAssessment())
                .plan(note.getPlan())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}
