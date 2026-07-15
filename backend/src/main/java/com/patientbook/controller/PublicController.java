package com.patientbook.controller;

import com.patientbook.dto.BankAccountDto;
import com.patientbook.dto.ClinicServiceDto;
import com.patientbook.dto.DoctorServicePriceDto;
import com.patientbook.entity.AppUser;
import com.patientbook.entity.ClinicHoliday;
import com.patientbook.entity.ClinicService;
import com.patientbook.entity.ClinicSettings;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.repository.ClinicServiceRepository;
import com.patientbook.repository.PatientRepository;
import com.patientbook.service.BankAccountService;
import com.patientbook.service.DoctorAvailabilityService;
import com.patientbook.service.ResourceNotFoundException;
import com.patientbook.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// The entire unauthenticated, patient-facing surface — every read here is
// scoped by a practitioner's public slug (never a raw numeric id), and an
// unknown slug always 404s rather than leaking whether an id exists.
@RestController
@RequestMapping("/api/v1/public/{slug}")
@RequiredArgsConstructor
public class PublicController {

    private final AppUserRepository appUserRepository;
    private final SettingsService settingsService;
    private final ClinicServiceRepository clinicServiceRepository;
    private final BankAccountService bankAccountService;
    private final DoctorAvailabilityService doctorAvailabilityService;
    private final PatientRepository patientRepository;
    private final com.patientbook.repository.ClinicHolidayRepository clinicHolidayRepository;
    private final com.patientbook.repository.AppointmentRepository appointmentRepository;

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getInfo(@PathVariable String slug) {
        AppUser owner = resolveOwner(slug);
        ClinicSettings settings = settingsService.getSettings(owner.getId());

        Map<String, Object> info = new HashMap<>();
        info.put("slug", owner.getSlug());
        info.put("name", owner.getName());
        info.put("jobTitle", owner.getJobTitle());
        info.put("bio", owner.getBio());
        info.put("profileImageUrl", owner.getProfileImageUrl());
        info.put("bookable", owner.isBookable());
        info.put("clinicName", settings.getClinicName());
        info.put("address", settings.getAddress());
        info.put("contactPhone", settings.getContactPhone());
        info.put("contactEmail", settings.getContactEmail());
        info.put("paymentQrCodeUrl", settings.getPaymentQrCodeUrl());
        info.put("demoCallNumber", settings.getDemoCallNumber());
        return ResponseEntity.ok(info);
    }

    // The full catalog (name/description/duration/fee/icon) — used by the
    // demo-call "service interest" picker.
    @GetMapping("/services/catalog")
    public ResponseEntity<List<ClinicServiceDto>> getServiceCatalog(@PathVariable String slug) {
        AppUser owner = resolveOwner(slug);
        List<ClinicServiceDto> services = clinicServiceRepository
                .findByPsychologistIdAndActiveTrueOrderByDisplayOrderAscCreatedAtAsc(owner.getId())
                .stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(services);
    }

    // Priced/offered services for the actual booking flow
    @GetMapping("/services")
    public ResponseEntity<List<DoctorServicePriceDto>> getOfferedServices(@PathVariable String slug) {
        AppUser owner = resolveOwner(slug);
        return ResponseEntity.ok(doctorAvailabilityService.getDoctorOfferedServices(owner.getId()));
    }

    @GetMapping("/slots")
    public ResponseEntity<List<String>> getSlots(@PathVariable String slug, @RequestParam LocalDate date) {
        AppUser owner = resolveOwner(slug);
        boolean isHoliday = clinicHolidayRepository.findByHolidayDateAndPsychologistId(date, owner.getId()).isPresent();
        java.util.Set<String> booked = appointmentRepository.findByAppointmentDateAndPsychologistId(date, owner.getId())
                .stream()
                .filter(a -> !"CANCELLED".equals(a.getStatus()))
                .map(a -> a.getStartTime().toString().substring(0, 5))
                .collect(Collectors.toSet());
        return ResponseEntity.ok(doctorAvailabilityService.getAvailableSlotsForDoctor(owner.getId(), date, booked, isHoliday));
    }

    @GetMapping("/holidays")
    public ResponseEntity<List<ClinicHoliday>> getHolidays(@PathVariable String slug) {
        AppUser owner = resolveOwner(slug);
        return ResponseEntity.ok(clinicHolidayRepository.findByPsychologistId(owner.getId()));
    }

    @GetMapping("/bank-accounts")
    public ResponseEntity<List<BankAccountDto>> getBankAccounts(@PathVariable String slug) {
        AppUser owner = resolveOwner(slug);
        return ResponseEntity.ok(bankAccountService.getActiveBankAccounts(owner.getId()));
    }

    // Returning-patient check on the booking form
    @GetMapping("/patients/check")
    public ResponseEntity<Map<String, Object>> checkReturningPatient(@PathVariable String slug, @RequestParam String phone) {
        AppUser owner = resolveOwner(slug);
        Map<String, Object> result = new HashMap<>();
        result.put("exists", patientRepository.findByPhoneAndPrimaryPsychologistId(phone.trim(), owner.getId()).isPresent());
        return ResponseEntity.ok(result);
    }

    private AppUser resolveOwner(String slug) {
        return appUserRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("No such booking link"));
    }

    private ClinicServiceDto toDto(ClinicService svc) {
        ClinicServiceDto dto = new ClinicServiceDto();
        dto.setId(svc.getId());
        dto.setName(svc.getName());
        dto.setDescription(svc.getDescription());
        dto.setDuration(svc.getDuration());
        dto.setFee(svc.getFee());
        dto.setIcon(svc.getIcon());
        dto.setActive(svc.isActive());
        dto.setDisplayOrder(svc.getDisplayOrder());
        dto.setCreatedAt(svc.getCreatedAt() != null ? svc.getCreatedAt().toString() : null);
        return dto;
    }
}
