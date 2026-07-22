package com.patientbook.controller;

import com.patientbook.dto.StaffDto;
import com.patientbook.dto.StaffSummaryDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// A clinic's staff roster. The real authorization boundary here isn't a
// Spring Security role — it's "is the caller their own clinic's tenant
// root" — so every method is just isAuthenticated() and delegates the actual
// check (accountType == CLINIC, tenantId == null) to StaffService, which
// also enforces that every {id} belongs to the caller's own tenant. See
// StaffService's class doc for why both checks matter.
@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<StaffSummaryDto>> getAllStaff() {
        return ResponseEntity.ok(staffService.listStaff(currentUserProvider.getCurrentUser()));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StaffSummaryDto> createStaff(@RequestBody StaffDto dto) {
        return ResponseEntity.ok(staffService.createStaff(currentUserProvider.getCurrentUser(), dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StaffSummaryDto> updateStaff(@PathVariable Long id, @RequestBody StaffDto dto) {
        return ResponseEntity.ok(staffService.updateStaff(currentUserProvider.getCurrentUser(), id, dto));
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StaffSummaryDto> updatePermissions(@PathVariable Long id, @RequestBody List<String> permissions) {
        return ResponseEntity.ok(staffService.updatePermissions(currentUserProvider.getCurrentUser(), id, permissions));
    }

    @PatchMapping("/{id}/details")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StaffSummaryDto> updateDetails(@PathVariable Long id, @RequestBody Map<String, String> body) {
        StaffDto dto = new StaffDto();
        dto.setName(body.get("name"));
        dto.setRole(body.get("role"));
        return ResponseEntity.ok(staffService.updateStaff(currentUserProvider.getCurrentUser(), id, dto));
    }

    // "Delete" deactivates (blocks login, hides from public booking) rather
    // than removing the row — see StaffService.deactivateStaff.
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StaffSummaryDto> deactivateStaff(@PathVariable Long id) {
        return ResponseEntity.ok(staffService.deactivateStaff(currentUserProvider.getCurrentUser(), id));
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StaffSummaryDto> reactivateStaff(@PathVariable Long id) {
        return ResponseEntity.ok(staffService.reactivateStaff(currentUserProvider.getCurrentUser(), id));
    }
}
