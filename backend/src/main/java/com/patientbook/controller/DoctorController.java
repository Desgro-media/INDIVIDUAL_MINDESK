package com.patientbook.controller;

import com.patientbook.dto.*;
import com.patientbook.entity.AppUser;
import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.ClinicHolidayRepository;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.DoctorAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

// Everything here always operates on the caller's OWN account — there is no
// path-variable practitioner id to trust. Public, patient-facing reads
// (services, slots, profile by slug) live in PublicController instead.
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorAvailabilityService doctorAvailabilityService;
    private final CurrentUserProvider currentUserProvider;
    private final AppointmentRepository appointmentRepository;
    private final ClinicHolidayRepository clinicHolidayRepository;

    @GetMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MyProfileDto> getMyProfile() {
        return ResponseEntity.ok(toProfileDto(currentUserProvider.getCurrentUser()));
    }

    // Available slots on the caller's own calendar — used by the dashboard's
    // manual "Schedule Appointment" flow (distinct from the public,
    // slug-scoped /public/{slug}/slots read).
    @GetMapping("/slots")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<String>> getMySlots(@RequestParam LocalDate date) {
        Long ownerId = currentUserProvider.getCurrentUserId();
        // Clinic closures/holidays are tenant-wide; slot-conflict is scoped
        // to this specific doctor's own calendar (a colleague's booking at
        // the same time isn't a conflict for me).
        boolean isHoliday = clinicHolidayRepository.findByHolidayDateAndPsychologistId(date, currentUserProvider.getCurrentTenantId()).isPresent();
        Set<String> booked = appointmentRepository.findByAppointmentDateAndAssignedDoctorId(date, ownerId)
                .stream()
                .filter(a -> !"CANCELLED".equals(a.getStatus()))
                .map(a -> a.getStartTime().toString().substring(0, 5))
                .collect(Collectors.toSet());
        return ResponseEntity.ok(doctorAvailabilityService.getAvailableSlotsForDoctor(ownerId, date, booked, isHoliday));
    }

    // Which services EXIST is a clinic-wide catalog (tenant-scoped); which of
    // them the caller personally offers/prices is per-doctor (self-scoped).
    @GetMapping("/services")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DoctorServicePriceDto>> getMyServices() {
        return ResponseEntity.ok(doctorAvailabilityService.getAllDoctorServices(
                currentUserProvider.getCurrentTenantId(), currentUserProvider.getCurrentUserId()));
    }

    @PutMapping("/services")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DoctorServicePriceDto>> saveMyServices(@RequestBody List<DoctorServicePriceDto> updates) {
        return ResponseEntity.ok(doctorAvailabilityService.saveDoctorServices(
                currentUserProvider.getCurrentTenantId(), currentUserProvider.getCurrentUserId(), updates));
    }

    @GetMapping("/weekly-schedule")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<DoctorWeeklySlotDto>>> getMyWeeklySchedule() {
        return ResponseEntity.ok(doctorAvailabilityService.getDoctorWeeklySchedule(currentUserProvider.getCurrentUserId()));
    }

    @PostMapping("/weekly-slots")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DoctorWeeklySlotDto> addWeeklySlot(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(doctorAvailabilityService.addWeeklySlot(
                currentUserProvider.getCurrentUserId(), body.get("dayOfWeek"), body.get("slotTime")));
    }

    @DeleteMapping("/weekly-slots/{slotId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeWeeklySlot(@PathVariable Long slotId) {
        doctorAvailabilityService.removeWeeklySlot(slotId, currentUserProvider.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/date-overrides")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DoctorDateOverrideDto>> getDateOverrides() {
        return ResponseEntity.ok(doctorAvailabilityService.getDateOverrides(currentUserProvider.getCurrentUserId()));
    }

    @PostMapping("/date-overrides")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DoctorDateOverrideDto> addDateOverride(@RequestBody Map<String, Object> body) {
        LocalDate date = LocalDate.parse((String) body.get("specificDate"));
        String slotTime = (String) body.get("slotTime");
        boolean available = body.get("available") == null || Boolean.parseBoolean(body.get("available").toString());
        return ResponseEntity.ok(doctorAvailabilityService.addDateOverride(
                currentUserProvider.getCurrentUserId(), date, slotTime, available));
    }

    @DeleteMapping("/date-overrides/{overrideId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeDateOverride(@PathVariable Long overrideId) {
        doctorAvailabilityService.removeDateOverride(overrideId, currentUserProvider.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MyProfileDto> updateProfile(@RequestBody Map<String, Object> body) {
        String bio = body.get("bio") != null ? body.get("bio").toString() : null;
        boolean bookable = body.get("bookable") == null || Boolean.parseBoolean(body.get("bookable").toString());
        String profileImageUrl = body.get("profileImageUrl") != null ? body.get("profileImageUrl").toString() : null;
        AppUser updated = doctorAvailabilityService.updateDoctorProfile(
                currentUserProvider.getCurrentUserId(), bio, bookable, profileImageUrl);
        return ResponseEntity.ok(toProfileDto(updated));
    }

    @GetMapping("/availability-blocks")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<Map<String, Object>>>> getAvailabilityBlocks() {
        return ResponseEntity.ok(doctorAvailabilityService.getAvailabilityBlocks(currentUserProvider.getCurrentUserId()));
    }

    @PostMapping("/availability-blocks")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> addAvailabilityBlocks(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> days = (List<String>) body.get("daysOfWeek");
        String startTime = (String) body.get("startTime");
        String endTime   = (String) body.get("endTime");
        int interval     = Integer.parseInt(body.get("intervalMinutes").toString());
        return ResponseEntity.ok(doctorAvailabilityService.addAvailabilityBlocks(
                currentUserProvider.getCurrentUserId(), days, startTime, endTime, interval));
    }

    @DeleteMapping("/availability-blocks/{blockId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeAvailabilityBlock(@PathVariable Long blockId) {
        doctorAvailabilityService.removeAvailabilityBlock(blockId, currentUserProvider.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/availability-blocks/day/{dayOfWeek}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> clearDayBlocks(@PathVariable String dayOfWeek) {
        doctorAvailabilityService.clearDayBlocks(currentUserProvider.getCurrentUserId(), dayOfWeek);
        return ResponseEntity.noContent().build();
    }

    // Never return the AppUser entity directly — it carries the password hash.
    private MyProfileDto toProfileDto(AppUser user) {
        return MyProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .slug(user.getSlug())
                .jobTitle(user.getJobTitle())
                .bio(user.getBio())
                .bookable(user.isBookable())
                .profileImageUrl(user.getProfileImageUrl())
                .build();
    }
}
