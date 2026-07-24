package com.patientbook.service;

import com.patientbook.dto.DoctorDateOverrideDto;
import com.patientbook.dto.DoctorServicePriceDto;
import com.patientbook.dto.DoctorWeeklySlotDto;
import com.patientbook.entity.*;
import com.patientbook.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

// Everything here operates on ONE practitioner's own availability/pricing —
// see DoctorController, which resolves that practitioner from the
// authenticated caller (never from a client-supplied id).
@Service
@RequiredArgsConstructor
public class DoctorAvailabilityService {

    private final AppUserRepository userRepository;
    private final DoctorWeeklySlotRepository weeklySlotRepository;
    private final DoctorDateOverrideRepository dateOverrideRepository;
    private final DoctorServicePriceRepository servicePriceRepository;
    private final ClinicServiceRepository clinicServiceRepository;
    private final DoctorAvailabilityBlockRepository blockRepository;

    // ── Public: get services offered by a doctor (for booking form step 3) ───
    // Individual practitioners have no separate "offered" opt-in step —
    // every Active catalog service is bookable automatically, using a
    // per-doctor price override if one was ever saved (legacy data), else
    // the catalog's own fee. This keeps the Services page's "Active =
    // visible on the booking page" copy literally true for them.
    // Clinic doctors/staff still opt in per-service via DoctorServicePrice,
    // since several practitioners share one catalog and don't all offer
    // the same things.
    public List<DoctorServicePriceDto> getDoctorOfferedServices(Long psychologistId) {
        AppUser doctor = userRepository.findById(psychologistId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + psychologistId));
        boolean isIndividual = doctor.getTenantId() == null && doctor.getAccountType() != AccountType.CLINIC;

        if (isIndividual) {
            Map<Long, DoctorServicePrice> overrides = servicePriceRepository.findByPsychologistId(psychologistId).stream()
                    .collect(Collectors.toMap(dsp -> dsp.getClinicService().getId(), dsp -> dsp));
            return clinicServiceRepository.findByPsychologistIdAndActiveTrueOrderByDisplayOrderAscCreatedAtAsc(psychologistId).stream()
                    .filter(svc -> {
                        DoctorServicePrice override = overrides.get(svc.getId());
                        return override == null || override.isOffered();
                    })
                    .map(svc -> {
                        DoctorServicePrice override = overrides.get(svc.getId());
                        return DoctorServicePriceDto.builder()
                                .id(override != null ? override.getId() : null)
                                .clinicServiceId(svc.getId())
                                .serviceName(svc.getName())
                                .serviceDescription(svc.getDescription())
                                .serviceDuration(svc.getDuration())
                                .serviceIcon(svc.getIcon())
                                .price(override != null ? override.getPrice() : (svc.getFee() != null ? svc.getFee() : BigDecimal.ZERO))
                                .offered(true)
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        return servicePriceRepository.findByPsychologistIdAndOfferedTrue(psychologistId).stream()
                .map(dsp -> DoctorServicePriceDto.builder()
                        .id(dsp.getId())
                        .clinicServiceId(dsp.getClinicService().getId())
                        .serviceName(dsp.getClinicService().getName())
                        .serviceDescription(dsp.getClinicService().getDescription())
                        .serviceDuration(dsp.getClinicService().getDuration())
                        .serviceIcon(dsp.getClinicService().getIcon())
                        .price(dsp.getPrice())
                        .offered(dsp.isOffered())
                        .build())
                .collect(Collectors.toList());
    }

    // ── Get all of a doctor's services with prices (including not-offered) ────
    // tenantId scopes the shared service CATALOG (which services exist at
    // all — clinic-wide); doctorId scopes which of those this specific
    // practitioner has priced/offered. For an individual these are the same
    // value, so behavior is unchanged.
    public List<DoctorServicePriceDto> getAllDoctorServices(Long tenantId, Long doctorId) {
        List<com.patientbook.entity.ClinicService> allServices =
                clinicServiceRepository.findByPsychologistIdAndActiveTrueOrderByDisplayOrderAscCreatedAtAsc(tenantId);
        List<DoctorServicePrice> configured = servicePriceRepository.findByPsychologistId(doctorId);
        Map<Long, DoctorServicePrice> configMap = configured.stream()
                .collect(Collectors.toMap(dsp -> dsp.getClinicService().getId(), dsp -> dsp));

        return allServices.stream().map(svc -> {
            DoctorServicePrice dsp = configMap.get(svc.getId());
            return DoctorServicePriceDto.builder()
                    .id(dsp != null ? dsp.getId() : null)
                    .clinicServiceId(svc.getId())
                    .serviceName(svc.getName())
                    .serviceDescription(svc.getDescription())
                    .serviceDuration(svc.getDuration())
                    .serviceIcon(svc.getIcon())
                    .price(dsp != null ? dsp.getPrice() : (svc.getFee() != null ? svc.getFee() : BigDecimal.ZERO))
                    .offered(dsp != null && dsp.isOffered())
                    .build();
        }).collect(Collectors.toList());
    }

    // ── Save all of a doctor's service prices at once ─────────────────────────
    // tenantId scopes which service ids are even valid to price (the shared
    // catalog); doctorId is whose DoctorServicePrice rows get written.
    @Transactional
    public List<DoctorServicePriceDto> saveDoctorServices(Long tenantId, Long doctorId,
                                                          List<DoctorServicePriceDto> updates) {
        AppUser doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        for (DoctorServicePriceDto dto : updates) {
            // Ownership-checked — a service id belonging to a different tenant is rejected.
            com.patientbook.entity.ClinicService svc =
                    clinicServiceRepository.findByIdAndPsychologistId(dto.getClinicServiceId(), tenantId)
                            .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + dto.getClinicServiceId()));

            Optional<DoctorServicePrice> existing =
                    servicePriceRepository.findByPsychologistIdAndClinicServiceId(doctorId, svc.getId());

            if (existing.isPresent()) {
                existing.get().setPrice(dto.getPrice() != null ? dto.getPrice() : BigDecimal.ZERO);
                existing.get().setOffered(dto.isOffered());
                servicePriceRepository.save(existing.get());
            } else {
                servicePriceRepository.save(DoctorServicePrice.builder()
                        .psychologist(doctor)
                        .clinicService(svc)
                        .price(dto.getPrice() != null ? dto.getPrice() : BigDecimal.ZERO)
                        .offered(dto.isOffered())
                        .build());
            }
        }

        return getAllDoctorServices(tenantId, doctorId);
    }

    // ── Get weekly schedule for the caller's own account ──────────────────────
    public Map<String, List<DoctorWeeklySlotDto>> getDoctorWeeklySchedule(Long psychologistId) {
        List<DoctorWeeklySlot> slots = weeklySlotRepository.findByPsychologistId(psychologistId);
        Map<String, List<DoctorWeeklySlotDto>> schedule = new LinkedHashMap<>();
        String[] days = {"MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"};
        for (String day : days) {
            schedule.put(day, new ArrayList<>());
        }
        for (DoctorWeeklySlot slot : slots) {
            DoctorWeeklySlotDto dto = DoctorWeeklySlotDto.builder()
                    .id(slot.getId())
                    .dayOfWeek(slot.getDayOfWeek())
                    .slotTime(slot.getSlotTime())
                    .active(slot.isActive())
                    .build();
            schedule.computeIfAbsent(slot.getDayOfWeek(), k -> new ArrayList<>()).add(dto);
        }
        // Sort slots within each day
        schedule.values().forEach(list -> list.sort(Comparator.comparing(DoctorWeeklySlotDto::getSlotTime)));
        return schedule;
    }

    // ── Add a weekly slot to the caller's own account ──────────────────────────
    @Transactional
    public DoctorWeeklySlotDto addWeeklySlot(Long psychologistId, String dayOfWeek, String slotTime) {
        AppUser psychologist = userRepository.findById(psychologistId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + psychologistId));
        DoctorWeeklySlot slot = weeklySlotRepository.save(DoctorWeeklySlot.builder()
                .psychologist(psychologist)
                .dayOfWeek(dayOfWeek.toUpperCase())
                .slotTime(slotTime)
                .active(true)
                .build());
        return DoctorWeeklySlotDto.builder()
                .id(slot.getId()).dayOfWeek(slot.getDayOfWeek())
                .slotTime(slot.getSlotTime()).active(slot.isActive()).build();
    }

    // ── Remove a weekly slot (ownership-checked) ────────────────────────────────
    @Transactional
    public void removeWeeklySlot(Long slotId, Long psychologistId) {
        weeklySlotRepository.deleteByIdAndPsychologistId(slotId, psychologistId);
    }

    // ── Get date overrides for the caller's own account ────────────────────────
    public List<DoctorDateOverrideDto> getDateOverrides(Long psychologistId) {
        return dateOverrideRepository
                .findByPsychologistIdAndSpecificDateGreaterThanEqual(psychologistId, LocalDate.now())
                .stream()
                .map(o -> DoctorDateOverrideDto.builder()
                        .id(o.getId())
                        .specificDate(o.getSpecificDate())
                        .slotTime(o.getSlotTime())
                        .available(o.isAvailable())
                        .build())
                .collect(Collectors.toList());
    }

    // ── Add a date override to the caller's own account ─────────────────────────
    @Transactional
    public DoctorDateOverrideDto addDateOverride(Long psychologistId, LocalDate date,
                                                  String slotTime, boolean available) {
        AppUser psychologist = userRepository.findById(psychologistId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + psychologistId));
        DoctorDateOverride override = dateOverrideRepository.save(DoctorDateOverride.builder()
                .psychologist(psychologist)
                .specificDate(date)
                .slotTime(slotTime)
                .available(available)
                .build());
        return DoctorDateOverrideDto.builder()
                .id(override.getId()).specificDate(override.getSpecificDate())
                .slotTime(override.getSlotTime()).available(override.isAvailable()).build();
    }

    // ── Delete a date override (ownership-checked) ───────────────────────────────
    @Transactional
    public void removeDateOverride(Long overrideId, Long psychologistId) {
        dateOverrideRepository.deleteByIdAndPsychologistId(overrideId, psychologistId);
    }

    // ── Get all availability blocks for the caller's own account ──────────────
    public Map<String, List<Map<String, Object>>> getAvailabilityBlocks(Long psychologistId) {
        List<DoctorAvailabilityBlock> blocks =
                blockRepository.findByPsychologistIdOrderByDayOfWeekAscStartTimeAsc(psychologistId);
        String[] days = {"MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"};
        Map<String, List<Map<String, Object>>> result = new LinkedHashMap<>();
        for (String day : days) result.put(day, new ArrayList<>());
        for (DoctorAvailabilityBlock b : blocks) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("dayOfWeek", b.getDayOfWeek());
            m.put("startTime", b.getStartTime());
            m.put("endTime", b.getEndTime());
            m.put("intervalMinutes", b.getIntervalMinutes());
            result.computeIfAbsent(b.getDayOfWeek(), k -> new ArrayList<>()).add(m);
        }
        return result;
    }

    // ── Add availability blocks (one per selected day) to the caller's own account ─
    @Transactional
    public List<Map<String, Object>> addAvailabilityBlocks(Long psychologistId, List<String> daysOfWeek,
                                                            String startTime, String endTime,
                                                            int intervalMinutes) {
        AppUser psychologist = userRepository.findById(psychologistId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + psychologistId));
        List<Map<String, Object>> created = new ArrayList<>();
        for (String day : daysOfWeek) {
            DoctorAvailabilityBlock block = blockRepository.save(
                    DoctorAvailabilityBlock.builder()
                            .psychologist(psychologist)
                            .dayOfWeek(day.toUpperCase())
                            .startTime(startTime)
                            .endTime(endTime)
                            .intervalMinutes(intervalMinutes)
                            .build());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", block.getId());
            m.put("dayOfWeek", block.getDayOfWeek());
            m.put("startTime", block.getStartTime());
            m.put("endTime", block.getEndTime());
            m.put("intervalMinutes", block.getIntervalMinutes());
            created.add(m);
        }
        return created;
    }

    // ── Delete a single availability block (ownership-checked) ──────────────────
    @Transactional
    public void removeAvailabilityBlock(Long blockId, Long psychologistId) {
        blockRepository.deleteByIdAndPsychologistId(blockId, psychologistId);
    }

    // ── Clear all blocks for a day on the caller's own account ────────────────
    @Transactional
    public void clearDayBlocks(Long psychologistId, String dayOfWeek) {
        blockRepository.deleteByPsychologistIdAndDayOfWeek(psychologistId, dayOfWeek.toUpperCase());
    }

    // ── Compute available slots for a doctor on a given date ──────────────────
    // Used by the public booking endpoint and internally by AppointmentService
    public List<String> getAvailableSlotsForDoctor(Long psychologistId, LocalDate date,
                                                    Set<String> bookedSlots,
                                                    boolean isHoliday) {
        if (isHoliday) return Collections.emptyList();

        String dayOfWeek = date.getDayOfWeek().name();
        Set<String> slots = new LinkedHashSet<>();

        // 1. Legacy individual weekly slots (backward compat)
        weeklySlotRepository
                .findByPsychologistIdAndDayOfWeekAndActiveTrue(psychologistId, dayOfWeek)
                .forEach(s -> slots.add(s.getSlotTime()));

        // 2. New block-based availability — generate slots from each block
        for (DoctorAvailabilityBlock block : blockRepository.findByPsychologistIdAndDayOfWeek(psychologistId, dayOfWeek)) {
            LocalTime time = LocalTime.parse(block.getStartTime());
            LocalTime end  = LocalTime.parse(block.getEndTime());
            while (time.isBefore(end)) {
                slots.add(time.toString().substring(0, 5)); // "HH:mm"
                time = time.plusMinutes(block.getIntervalMinutes());
            }
        }

        // 3. Apply date-specific overrides
        for (DoctorDateOverride override : dateOverrideRepository
                .findByPsychologistIdAndSpecificDate(psychologistId, date)) {
            if (override.isAvailable() && override.getSlotTime() != null) {
                slots.add(override.getSlotTime());
            } else if (!override.isAvailable()) {
                // null slotTime = entire day blocked
                if (override.getSlotTime() == null) return Collections.emptyList();
                slots.remove(override.getSlotTime());
            }
        }

        // 4. Remove already-booked slots, and — for today — slots whose start
        // time has already passed, so patients/staff can't book into the past.
        boolean isToday = date.isEqual(LocalDate.now());
        LocalTime now = LocalTime.now();
        return slots.stream()
                .filter(s -> !bookedSlots.contains(s))
                .filter(s -> !isToday || LocalTime.parse(s).isAfter(now))
                .sorted()
                .collect(Collectors.toList());
    }

    // ── Resolve a specific doctor's price for a service ─────────────────────────
    // doctorId scopes the per-doctor DoctorServicePrice row (each staff
    // member can price the same service differently); tenantId scopes the
    // catalog-fee fallback (which is clinic-wide, not per-doctor). For an
    // individual these are the same value, so behavior is unchanged.
    public BigDecimal resolvePrice(Long tenantId, Long doctorId, Long clinicServiceId) {
        if (doctorId != null && clinicServiceId != null) {
            Optional<DoctorServicePrice> dsp =
                    servicePriceRepository.findByPsychologistIdAndClinicServiceId(doctorId, clinicServiceId);
            if (dsp.isPresent() && dsp.get().isOffered()) {
                return dsp.get().getPrice();
            }
        }
        // Fall back to the service's own catalog fee (still ownership-checked)
        if (clinicServiceId != null && tenantId != null) {
            return clinicServiceRepository.findByIdAndPsychologistId(clinicServiceId, tenantId)
                    .map(s -> s.getFee() != null ? s.getFee() : BigDecimal.ZERO)
                    .orElse(BigDecimal.ZERO);
        }
        return BigDecimal.ZERO;
    }

    // ── Update the caller's own profile (bio, bookable, profileImageUrl) ──────
    @Transactional
    public AppUser updateDoctorProfile(Long psychologistId, String bio,
                                       boolean bookable, String profileImageUrl) {
        AppUser user = userRepository.findById(psychologistId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + psychologistId));
        if (bio != null) user.setBio(bio);
        user.setBookable(bookable);
        if (profileImageUrl != null) user.setProfileImageUrl(profileImageUrl);
        return userRepository.save(user);
    }
}
