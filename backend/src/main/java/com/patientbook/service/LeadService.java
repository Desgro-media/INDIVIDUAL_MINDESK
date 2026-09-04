package com.patientbook.service;

import com.patientbook.dto.LeadRequest;
import com.patientbook.entity.AppUser;
import com.patientbook.entity.Lead;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeadService {

    private final LeadRepository leadRepository;
    private final AppUserRepository userRepository;

    // ── Create a lead (public, step 1 of a practitioner's booking wizard) ──
    @Transactional
    public Lead createLead(String slug, LeadRequest request) {
        AppUser owner = userRepository.findBySlugAndRole(slug, com.patientbook.security.Roles.PSYCHOLOGIST)
                .orElseThrow(() -> new ResourceNotFoundException("No such booking link"));

        String normalizedEmail = (request.getEmail() != null && !request.getEmail().isBlank())
                ? request.getEmail().trim() : null;

        Lead lead = Lead.builder()
                .name(request.getName())
                .email(normalizedEmail)
                .phone(request.getPhone())
                .notes(request.getNotes())
                .practitionerId(owner.getId())
                .build();
        return leadRepository.save(lead);
    }

    // ── List leads for the dashboard (always scoped to the caller) ─────────
    public List<Lead> getAllLeads(Long practitionerId) {
        return leadRepository.findByPractitionerIdOrderByCreatedAtDesc(practitionerId);
    }

    // ── Convert the most recent open lead from this contact into a real
    // booking. Called right after a patient/appointment is created via the
    // same phone number — see AppointmentService.bookAppointmentForOwner.
    // Silent no-op when no matching open lead exists (e.g. a booking made
    // without ever going through the public details-first step), same as
    // every other best-effort side link in that flow.
    @Transactional
    public void convertLead(String phone, Long practitionerId, Long patientId, Long appointmentId) {
        leadRepository.findFirstByPhoneAndPractitionerIdAndStatusOrderByCreatedAtDesc(phone, practitionerId, "NEW")
                .ifPresent(lead -> {
                    lead.setStatus("CONVERTED");
                    lead.setPatientId(patientId);
                    lead.setAppointmentId(appointmentId);
                    lead.setConvertedAt(LocalDateTime.now());
                    leadRepository.save(lead);
                });
    }
}
