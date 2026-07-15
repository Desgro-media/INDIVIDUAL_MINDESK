package com.patientbook.service;

import com.patientbook.dto.MoodLogDto;
import com.patientbook.entity.Appointment;
import com.patientbook.entity.MoodLog;
import com.patientbook.entity.Patient;
import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.MoodLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MoodLogService {

    private final MoodLogRepository moodLogRepository;
    private final AppointmentRepository appointmentRepository;

    // ── Submit a mood log (public, by patient via tracking token) ─────────
    @Transactional
    public MoodLogDto submitMoodLog(String trackingToken, Integer moodScore, String note) {
        if (moodScore < 1 || moodScore > 10) {
            throw new IllegalArgumentException("Mood score must be between 1 and 10");
        }

        Appointment appointment = appointmentRepository.findByTrackingToken(trackingToken)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found for token: " + trackingToken));

        Patient patient = appointment.getPatient();

        // Skip if already submitted for this appointment
        Optional<MoodLog> existing = moodLogRepository.findByAppointmentId(appointment.getId());
        if (existing.isPresent()) {
            MoodLog log = existing.get();
            log.setMoodScore(moodScore);
            log.setNote(note);
            return mapToDto(moodLogRepository.save(log));
        }

        MoodLog log = MoodLog.builder()
                .psychologistId(appointment.getPsychologistId())
                .appointment(appointment)
                .patient(patient)
                .moodScore(moodScore)
                .note(note)
                .logDate(LocalDate.now())
                .build();

        return mapToDto(moodLogRepository.save(log));
    }

    // ── Get all mood logs for a patient (own account only, for trend chart) ─
    @Transactional(readOnly = true)
    public List<MoodLogDto> getMoodLogsByPatient(Long patientId, Long ownerId) {
        return moodLogRepository.findByPatientIdAndPsychologistIdOrderByLogDateAsc(patientId, ownerId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    // ── Get mood log for a specific appointment (own account only) ────────
    @Transactional(readOnly = true)
    public Optional<MoodLogDto> getMoodLogByAppointment(Long appointmentId, Long ownerId) {
        return moodLogRepository.findByAppointmentIdAndPsychologistId(appointmentId, ownerId).map(this::mapToDto);
    }

    // ── Mapper ────────────────────────────────────────────────────────────
    private MoodLogDto mapToDto(MoodLog log) {
        return MoodLogDto.builder()
                .id(log.getId())
                .patientId(log.getPatient().getId())
                .appointmentId(log.getAppointment() != null ? log.getAppointment().getId() : null)
                .moodScore(log.getMoodScore())
                .note(log.getNote())
                .logDate(log.getLogDate())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
