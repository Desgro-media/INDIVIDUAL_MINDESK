package com.patientbook.service;

import com.patientbook.dto.AppointmentDto;
import com.patientbook.dto.BookingRequest;
import com.patientbook.dto.ConvertDemoRequest;
import com.patientbook.dto.DemoBookingRequest;
import com.patientbook.dto.InvoiceDto;
import com.patientbook.dto.RebookRequestDto;
import com.patientbook.entity.Appointment;
import com.patientbook.entity.AppUser;
import com.patientbook.entity.Patient;
import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.repository.ClinicServiceRepository;
import com.patientbook.repository.MoodLogRepository;
import com.patientbook.repository.NotificationLogRepository;
import com.patientbook.repository.PatientRepository;
import com.patientbook.repository.SessionNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final NotificationService notificationService;
    private final AppUserRepository userRepository;
    private final DoctorAvailabilityService doctorAvailabilityService;
    private final ClinicServiceRepository clinicServiceRepository;
    private final StaffResolutionService staffResolutionService;

    @Lazy
    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private com.patientbook.repository.InvoiceRepository invoiceRepository;

    @Autowired
    private NotificationLogRepository notificationLogRepository;

    @Autowired
    private SessionNoteRepository sessionNoteRepository;

    @Autowired
    private MoodLogRepository moodLogRepository;

    // ── Book a new appointment (public, via a practitioner's own booking link) ──
    @Transactional
    public AppointmentDto bookAppointment(BookingRequest request) {
        AppUser owner = userRepository.findBySlugAndRole(request.getSlug(), com.patientbook.security.Roles.PSYCHOLOGIST)
                .orElseThrow(() -> new ResourceNotFoundException("No such booking link"));
        // Validates request.getStaffId() belongs to this clinic and is
        // actually bookable before trusting it — this is what stops a client
        // from booking against a practitioner in a different clinic (the
        // read-side staff/services/slots endpoints in PublicController use
        // the same validator, so both sides agree on who's bookable).
        Long assignedDoctorId = staffResolutionService.resolveBookableDoctorId(owner, request.getStaffId());
        return bookAppointmentForOwner(request, owner.getId(), assignedDoctorId);
    }

    // ── Manual scheduling from the dashboard ───────────────────────────────
    @Transactional
    public AppointmentDto scheduleManually(BookingRequest request, Long tenantId, Long callerOwnId) {
        Long assignedDoctorId = staffResolutionService.resolveTenantStaffId(tenantId, callerOwnId, request.getStaffId());
        return bookAppointmentForOwner(request, tenantId, assignedDoctorId);
    }

    @Transactional
    public AppointmentDto bookAppointmentForOwner(BookingRequest request, Long tenantId, Long assignedDoctorId) {

        // 1. Find or create patient (identified by phone, scoped to this tenant —
        // shared across every staff member in a clinic)
        // Normalize email: treat blank string as null to avoid unique-constraint collisions
        String normalizedEmail = (request.getPatientEmail() != null && !request.getPatientEmail().isBlank())
                ? request.getPatientEmail().trim() : null;

        Patient patient = patientRepository.findByPhoneAndPrimaryPsychologistId(request.getPatientPhone(), tenantId)
                .orElseGet(() -> {
                    Patient newPatient = Patient.builder()
                            .name(request.getPatientName())
                            .email(normalizedEmail)
                            .phone(request.getPatientPhone())
                            .primaryPsychologistId(tenantId)
                            .build();
                    return patientRepository.save(newPatient);
                });

        // 2. Determine session duration (try to parse from service, default 60 min) —
        // the service catalog is tenant-wide, so this stays keyed by tenantId
        int slotDuration = resolveSessionDurationMinutes(request.getSessionType(), tenantId);

        // 3. Generate a unique 25-char tracking token
        String trackingToken = UUID.randomUUID().toString().replace("-", "").substring(0, 25);

        // 4. Link to the patient's last active session for journey tracking
        List<Appointment> previousActive = appointmentRepository.findMostRecentActiveByPatientId(patient.getId());
        Long previousAppointmentId = previousActive.isEmpty() ? null : previousActive.get(0).getId();

        // 5. Build and save the appointment
        Appointment appointment = Appointment.builder()
                .patient(patient)
                .appointmentDate(request.getAppointmentDate())
                .startTime(request.getStartTime())
                .endTime(request.getStartTime().plusMinutes(slotDuration))
                .status("AWAITING_PAYMENT")
                .trackingToken(trackingToken)
                .sessionType(request.getSessionType())
                .notes(request.getNotes())
                .previousAppointmentId(previousAppointmentId)
                .psychologistId(tenantId)
                .assignedDoctorId(assignedDoctorId)
                .build();

        appointment = appointmentRepository.save(appointment);

        // 6. Create invoice — uses per-doctor pricing
        InvoiceDto invoice = invoiceService.createInvoiceForAppointment(appointment.getId());

        // Extract data BEFORE transaction ends — prevents lazy-load in async thread
        String patientName  = patient.getName();
        String patientEmail = patient.getEmail();
        String patientPhone = patient.getPhone();
        String apptDate     = appointment.getAppointmentDate().toString();
        String apptTime     = appointment.getStartTime().toString();
        String token        = appointment.getTrackingToken();

        // If the service is free (fee = 0), skip the payment step
        if (invoice.getAmount() == null || invoice.getAmount().compareTo(BigDecimal.ZERO) == 0) {
            appointment.setStatus("CONFIRMED");
            appointment = appointmentRepository.save(appointment);
            notificationService.sendBookingApproved(patientName, patientEmail, patientPhone, apptDate, apptTime, token);
        } else {
            notificationService.sendPaymentLink(patientName, patientEmail, patientPhone, apptDate, apptTime, token);
        }

        return mapToDto(appointment);
    }

    // ── Track appointment by token ─────────────────────────────────────────
    public AppointmentDto getAppointmentByToken(String token) {
        Appointment appointment = appointmentRepository.findByTrackingToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found for token: " + token));
        return mapToDto(appointment);
    }

    // ── Rebook a cancelled appointment ─────────────────────────────────────
    @Transactional
    public AppointmentDto rebookAppointment(String token, RebookRequestDto request) {
        Appointment oldAppointment = appointmentRepository.findByTrackingToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        if (!"CANCELLED".equals(oldAppointment.getStatus())) {
            throw new IllegalStateException("Only CANCELLED appointments can be rebooked");
        }

        BookingRequest newRequest = new BookingRequest();
        newRequest.setPatientName(oldAppointment.getPatient().getName());
        newRequest.setPatientEmail(oldAppointment.getPatient().getEmail());
        newRequest.setPatientPhone(oldAppointment.getPatient().getPhone());
        newRequest.setAppointmentDate(request.getNewAppointmentDate());
        newRequest.setStartTime(request.getNewStartTime());
        newRequest.setSessionType(oldAppointment.getSessionType());
        newRequest.setNotes(oldAppointment.getNotes());

        // Tenant AND the specific practitioner are both carried over from the
        // existing (already-verified) appointment, not re-derived from client
        // input — a rebook must land back with the same doctor, not silently
        // fall back to the clinic owner.
        Long carriedAssignedDoctorId = oldAppointment.getAssignedDoctorId() != null
                ? oldAppointment.getAssignedDoctorId() : oldAppointment.getPsychologistId();
        return bookAppointmentForOwner(newRequest, oldAppointment.getPsychologistId(), carriedAssignedDoctorId);
    }

    // ── Get appointments for a practitioner (always scoped to the caller) ──
    public List<AppointmentDto> getAppointmentsByPsychologist(Long psychologistId) {
        return appointmentRepository.findByPsychologistId(psychologistId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ── Update appointment status (confirm / cancel / complete) ───────────
    @Transactional
    public AppointmentDto updateAppointmentStatus(Long id, Long ownerId, String status, String cancellationReason, BigDecimal fee) {
        Appointment appointment = appointmentRepository.findByIdAndPsychologistId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));

        appointment.setStatus(status);

        if ("CANCELLED".equals(status) && cancellationReason != null) {
            appointment.setCancellationReason(cancellationReason);
        }

        appointment = appointmentRepository.save(appointment);

        String patientName  = appointment.getPatient().getName();
        String patientEmail = appointment.getPatient().getEmail();
        String patientPhone = appointment.getPatient().getPhone();
        String apptDate     = appointment.getAppointmentDate() != null ? appointment.getAppointmentDate().toString() : "TBD";
        String apptTime     = appointment.getStartTime() != null ? appointment.getStartTime().toString() : "TBD";
        String token        = appointment.getTrackingToken();
        String reason       = appointment.getCancellationReason();
        Long   apptId       = appointment.getId();

        if ("AWAITING_PAYMENT".equals(status)) {
            InvoiceDto inv = invoiceService.createInvoiceForAppointment(apptId, fee);
            if (inv.getAmount() == null || inv.getAmount().compareTo(BigDecimal.ZERO) == 0) {
                appointment.setStatus("CONFIRMED");
                appointment = appointmentRepository.save(appointment);
                notificationService.sendBookingApproved(patientName, patientEmail, patientPhone, apptDate, apptTime, token);
            } else {
                notificationService.sendPaymentLink(patientName, patientEmail, patientPhone, apptDate, apptTime, token);
            }
        } else if ("CONFIRMED".equals(status)) {
            try {
                invoiceService.markAppointmentInvoiceAsPaid(apptId, "MANUAL_TRANSFER");
            } catch (Exception ignored) {}
            notificationService.sendBookingApproved(patientName, patientEmail, patientPhone, apptDate, apptTime, token);
        } else if ("CANCELLED".equals(status)) {
            notificationService.sendBookingCancelled(patientName, patientEmail, patientPhone, apptDate, apptTime, token, reason);
        } else if ("COMPLETED".equals(status)) {
            invoiceService.createInvoiceForAppointment(apptId);
        }

        return mapToDto(appointment);
    }

    @Transactional
    public AppointmentDto reportPaymentMade(String token, String paymentScreenshotBase64) {
        Appointment appointment = appointmentRepository.findByTrackingToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        if (!"AWAITING_PAYMENT".equals(appointment.getStatus()) && !"PENDING".equals(appointment.getStatus())) {
            throw new IllegalStateException("Appointment is not awaiting payment");
        }

        appointment.setStatus("PAYMENT_UNDER_REVIEW");
        appointment.setPaymentScreenshotBase64(paymentScreenshotBase64);
        appointment = appointmentRepository.save(appointment);

        return mapToDto(appointment);
    }

    @Transactional
    public AppointmentDto updateAppointmentNotes(Long id, Long ownerId, String notes) {
        Appointment appointment = appointmentRepository.findByIdAndPsychologistId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));
        appointment.setNotes(notes);
        appointment = appointmentRepository.save(appointment);
        return mapToDto(appointment);
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> getAppointmentsByPatientIdAndPsychologist(Long patientId, Long psychologistId) {
        return appointmentRepository.findByPatientIdAndPsychologistId(patientId, psychologistId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AppointmentDto submitRating(String token, Integer rating, String feedback) {
        Appointment appointment = appointmentRepository.findByTrackingToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid tracking token."));

        if (!"COMPLETED".equals(appointment.getStatus())) {
            throw new IllegalStateException("Only completed sessions can be rated.");
        }

        appointment.setRating(rating);
        appointment.setFeedback(feedback);
        appointment = appointmentRepository.save(appointment);
        return mapToDto(appointment);
    }

    // ── Request a demo call (public, via a practitioner's own link) ───────
    @Transactional
    public AppointmentDto requestDemoCall(DemoBookingRequest request) {
        AppUser owner = userRepository.findBySlugAndRole(request.getSlug(), com.patientbook.security.Roles.PSYCHOLOGIST)
                .orElseThrow(() -> new ResourceNotFoundException("No such booking link"));

        String demoEmail = (request.getPatientEmail() != null && !request.getPatientEmail().isBlank())
                ? request.getPatientEmail().trim() : null;
        Patient patient = patientRepository.findByPhoneAndPrimaryPsychologistId(request.getPatientPhone(), owner.getId())
                .orElseGet(() -> patientRepository.save(Patient.builder()
                        .name(request.getPatientName())
                        .email(demoEmail)
                        .phone(request.getPatientPhone())
                        .primaryPsychologistId(owner.getId())
                        .build()));

        String trackingToken = UUID.randomUUID().toString().replace("-", "").substring(0, 25);

        String combinedNotes = request.getPreferredTime() != null && !request.getPreferredTime().isBlank()
                ? "Preferred time: " + request.getPreferredTime()
                  + (request.getNotes() != null && !request.getNotes().isBlank() ? "\n" + request.getNotes() : "")
                : request.getNotes();

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .status("DEMO_CALL_PENDING")
                .trackingToken(trackingToken)
                .sessionType(request.getServiceInterest())
                .notes(combinedNotes)
                .appointmentDate(java.time.LocalDate.of(1970, 1, 1))
                .startTime(java.time.LocalTime.MIDNIGHT)
                .endTime(java.time.LocalTime.MIDNIGHT)
                .psychologistId(owner.getId())
                .build();

        return mapToDto(appointmentRepository.save(appointment));
    }

    // ── Convert a demo call to a real appointment ──────────────────────────
    @Transactional
    public AppointmentDto convertDemoToAppointment(Long id, Long tenantId, ConvertDemoRequest request) {
        Appointment appointment = appointmentRepository.findByIdAndPsychologistId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));

        if (!"DEMO_CALL_PENDING".equals(appointment.getStatus())) {
            throw new IllegalStateException("Only demo call requests can be converted to appointments");
        }

        int slotDuration = resolveSessionDurationMinutes(request.getSessionType(), tenantId);
        Long assignedDoctorId = staffResolutionService.resolveTenantStaffId(tenantId, tenantId, request.getStaffId());

        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setStartTime(request.getStartTime());
        appointment.setEndTime(request.getStartTime().plusMinutes(slotDuration));
        if (request.getSessionType() != null && !request.getSessionType().isBlank()) {
            appointment.setSessionType(request.getSessionType());
        }
        appointment.setAssignedDoctorId(assignedDoctorId);
        appointment.setStatus("AWAITING_PAYMENT");
        appointment = appointmentRepository.save(appointment);

        InvoiceDto invoice = invoiceService.createInvoiceForAppointment(appointment.getId());

        String patientName  = appointment.getPatient().getName();
        String patientEmail = appointment.getPatient().getEmail();
        String patientPhone = appointment.getPatient().getPhone();
        String apptDate     = appointment.getAppointmentDate().toString();
        String apptTime     = appointment.getStartTime().toString();
        String token        = appointment.getTrackingToken();

        if (invoice.getAmount() == null || invoice.getAmount().compareTo(BigDecimal.ZERO) == 0) {
            appointment.setStatus("CONFIRMED");
            appointment = appointmentRepository.save(appointment);
            notificationService.sendBookingApproved(patientName, patientEmail, patientPhone, apptDate, apptTime, token);
        } else {
            notificationService.sendPaymentLink(patientName, patientEmail, patientPhone, apptDate, apptTime, token);
        }

        return mapToDto(appointment);
    }

    // ── Delete an appointment ──────────────────────────────────────────────
    @Transactional
    public void deleteAppointment(Long id, Long ownerId) {
        if (!appointmentRepository.existsByIdAndPsychologistId(id, ownerId)) {
            throw new ResourceNotFoundException("Appointment not found: " + id);
        }
        notificationLogRepository.deleteByAppointmentId(id);
        sessionNoteRepository.deleteByAppointmentId(id);
        moodLogRepository.deleteByAppointmentId(id);
        invoiceRepository.deleteByAppointmentId(id);
        appointmentRepository.deleteById(id);
    }

    // ── Update appointment details ─────────────────────────────────────────
    @Transactional
    public AppointmentDto updateAppointmentDetails(Long id, Long ownerId, LocalDate date, LocalTime startTime,
                                                    String sessionType, String notes) {
        Appointment appt = appointmentRepository.findByIdAndPsychologistId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));
        if (date != null) appt.setAppointmentDate(date);
        if (startTime != null) {
            int duration = resolveSessionDurationMinutes(appt.getSessionType(), ownerId);
            appt.setStartTime(startTime);
            appt.setEndTime(startTime.plusMinutes(duration));
        }
        if (sessionType != null) appt.setSessionType(sessionType);
        if (notes != null) appt.setNotes(notes);
        return mapToDto(appointmentRepository.save(appt));
    }

    // ── Record a past session (always under the caller's own tenant) ──────
    @Transactional
    public AppointmentDto recordPastSession(Long patientId, Long tenantId, Long callerOwnId, Long requestedStaffId,
                                            LocalDate date, LocalTime time,
                                            String sessionType, String notes, String status) {
        Patient patient = patientRepository.findByIdAndPrimaryPsychologistId(patientId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        int slotDuration = resolveSessionDurationMinutes(sessionType, tenantId);
        String resolvedStatus = (status != null && !status.isBlank()) ? status : "COMPLETED";
        Long assignedDoctorId = staffResolutionService.resolveTenantStaffId(tenantId, callerOwnId, requestedStaffId);

        Appointment appt = Appointment.builder()
                .patient(patient)
                .appointmentDate(date)
                .startTime(time)
                .endTime(time.plusMinutes(slotDuration))
                .status(resolvedStatus)
                .sessionType(sessionType)
                .notes(notes)
                .trackingToken(UUID.randomUUID().toString().replace("-", "").substring(0, 25))
                .psychologistId(tenantId)
                .assignedDoctorId(assignedDoctorId)
                .build();

        appt = appointmentRepository.save(appt);
        invoiceService.createInvoiceForAppointment(appt.getId());
        return mapToDto(appt);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    // Parse duration from the ClinicService duration string e.g. "50 min" → 50; default 60
    private int resolveSessionDurationMinutes(String sessionType, Long ownerId) {
        if (sessionType == null) return 60;
        try {
            Long serviceId = Long.parseLong(sessionType);
            String durationStr = clinicServiceRepository.findByIdAndPsychologistId(serviceId, ownerId)
                    .map(s -> s.getDuration()).orElse(null);
            if (durationStr != null) {
                // Parse strings like "50 min", "80 min", "1.5 hr"
                String digits = durationStr.replaceAll("[^0-9]", "");
                if (!digits.isEmpty()) return Integer.parseInt(digits);
            }
        } catch (NumberFormatException ignored) {}
        return 60;
    }

    public AppointmentDto mapToDto(Appointment appointment) {
        boolean returningPatient = appointment.getPreviousAppointmentId() != null;

        AppUser owner = userRepository.findById(appointment.getPsychologistId()).orElse(null);
        String psychologistName = owner != null ? owner.getName() : null;
        String psychologistSlug = owner != null ? owner.getSlug() : null;

        // Which specific practitioner this appointment is with — falls back
        // to the tenant owner for pre-assignedDoctorId rows (should only
        // happen in the brief window before StartupInitializer's backfill).
        Long assignedDoctorId = appointment.getAssignedDoctorId() != null
                ? appointment.getAssignedDoctorId() : appointment.getPsychologistId();
        AppUser assignedDoctor = assignedDoctorId.equals(appointment.getPsychologistId())
                ? owner : userRepository.findById(assignedDoctorId).orElse(null);
        String assignedDoctorName = assignedDoctor != null ? assignedDoctor.getName() : null;

        return AppointmentDto.builder()
                .id(appointment.getId())
                .patientId(appointment.getPatient().getId())
                .patientName(appointment.getPatient().getName())
                .patientEmail(appointment.getPatient().getEmail())
                .patientPhone(appointment.getPatient().getPhone())
                .appointmentDate(appointment.getAppointmentDate())
                .startTime(appointment.getStartTime())
                .endTime(appointment.getEndTime())
                .status(appointment.getStatus())
                .trackingToken(appointment.getTrackingToken())
                .cancellationReason(appointment.getCancellationReason())
                .sessionType(appointment.getSessionType())
                .notes(appointment.getNotes())
                .rating(appointment.getRating())
                .feedback(appointment.getFeedback())
                .telegramConnected(appointment.getPatient().getTelegramChatId() != null
                        && !appointment.getPatient().getTelegramChatId().isEmpty())
                .fee(invoiceRepository.findByAppointmentId(appointment.getId())
                        .map(com.patientbook.entity.Invoice::getAmount).orElse(null))
                .paymentScreenshotBase64(appointment.getPaymentScreenshotBase64())
                .previousAppointmentId(appointment.getPreviousAppointmentId())
                .returningPatient(returningPatient)
                .psychologistId(appointment.getPsychologistId())
                .psychologistName(psychologistName)
                .psychologistSlug(psychologistSlug)
                .assignedDoctorId(assignedDoctorId)
                .assignedDoctorName(assignedDoctorName)
                .build();
    }
}
