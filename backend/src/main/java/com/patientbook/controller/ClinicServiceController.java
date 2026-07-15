package com.patientbook.controller;

import com.patientbook.dto.ClinicServiceDto;
import com.patientbook.entity.ClinicService;
import com.patientbook.repository.ClinicServiceRepository;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<ClinicServiceDto> getAllServices() {
        return serviceRepo.findByPsychologistIdOrderByDisplayOrderAscCreatedAtAsc(currentUserProvider.getCurrentUserId())
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicServiceDto> createService(@RequestBody ClinicServiceDto dto) {
        ClinicService svc = ClinicService.builder()
                .psychologistId(currentUserProvider.getCurrentUserId())
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
        ClinicService svc = serviceRepo.findByIdAndPsychologistId(id, currentUserProvider.getCurrentUserId())
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

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteService(@PathVariable Long id) {
        ClinicService svc = serviceRepo.findByIdAndPsychologistId(id, currentUserProvider.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + id));
        serviceRepo.delete(svc);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicServiceDto> toggleService(@PathVariable Long id) {
        ClinicService svc = serviceRepo.findByIdAndPsychologistId(id, currentUserProvider.getCurrentUserId())
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
