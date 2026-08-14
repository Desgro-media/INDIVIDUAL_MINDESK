package com.patientbook.controller;

import com.patientbook.dto.ClinicServiceDto;
import com.patientbook.entity.ClinicService;
import com.patientbook.repository.ClinicServiceRepository;
import com.patientbook.repository.DoctorServicePriceRepository;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

// The public "active services" read moved to PublicController
// (/api/v1/public/{slug}/services) — each practitioner has their own catalog.
@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
public class ClinicServiceController {

    private final ClinicServiceRepository serviceRepo;
    private final DoctorServicePriceRepository servicePriceRepo;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<ClinicServiceDto> getAllServices() {
        return serviceRepo.findByPsychologistIdOrderByDisplayOrderAscCreatedAtAsc(currentUserProvider.getCurrentTenantId())
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicServiceDto> createService(@RequestBody ClinicServiceDto dto) {
        ClinicService svc = ClinicService.builder()
                .psychologistId(currentUserProvider.getCurrentTenantId())
                .name(dto.getName())
                .description(dto.getDescription())
                .duration(dto.getDuration() != null ? dto.getDuration() : "50 min")
                .fee(dto.getFee() != null ? dto.getFee() : java.math.BigDecimal.ZERO)
                .icon(dto.getIcon() != null ? dto.getIcon() : "Sparkles")
                .active(dto.isActive())
                .displayOrder(dto.getDisplayOrder())
                .build();
        return ResponseEntity.ok(toDto(serviceRepo.save(svc)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicServiceDto> updateService(@PathVariable Long id, @RequestBody ClinicServiceDto dto) {
        ClinicService svc = serviceRepo.findByIdAndPsychologistId(id, currentUserProvider.getCurrentTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + id));
        svc.setName(dto.getName());
        svc.setDescription(dto.getDescription());
        svc.setDuration(dto.getDuration());
        svc.setFee(dto.getFee() != null ? dto.getFee() : java.math.BigDecimal.ZERO);
        svc.setIcon(dto.getIcon());
        svc.setActive(dto.isActive());
        svc.setDisplayOrder(dto.getDisplayOrder());
        return ResponseEntity.ok(toDto(serviceRepo.save(svc)));
    }

    // Deleting the catalog entry must also clear every doctor's per-mode
    // pricing for it: doctor_service_price holds the only FK to clinic_service
    // and it has no ON DELETE action, so without this the DELETE is rejected by
    // Postgres for any service that has ever been priced — which is every
    // service created or edited through the dashboard (that form always writes
    // a pricing row, see the services page's handleSave) plus anything a clinic
    // configured for its staff. Only the untouched signup defaults, which have
    // no pricing rows, deleted successfully before this.
    //
    // Nothing else references the service, so no history is lost — Appointment
    // records what was booked as a plain sessionType string, not a FK.
    // @Transactional so the pricing rows and the service go together: a failure
    // partway can't leave the catalog entry alive with its pricing wiped.
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<Void> deleteService(@PathVariable Long id) {
        ClinicService svc = serviceRepo.findByIdAndPsychologistId(id, currentUserProvider.getCurrentTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + id));
        servicePriceRepo.deleteByClinicServiceId(svc.getId());
        serviceRepo.delete(svc);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicServiceDto> toggleService(@PathVariable Long id) {
        ClinicService svc = serviceRepo.findByIdAndPsychologistId(id, currentUserProvider.getCurrentTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + id));
        svc.setActive(!svc.isActive());
        return ResponseEntity.ok(toDto(serviceRepo.save(svc)));
    }

    // ── helper ────────────────────────────────────────────────────────────
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
