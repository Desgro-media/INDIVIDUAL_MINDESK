package com.patientbook.controller;

import com.patientbook.entity.ClinicHoliday;
import com.patientbook.entity.ClinicSettings;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicSettings> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings(currentUserProvider.getCurrentTenantId()));
    }

    @PutMapping("/settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicSettings> updateSettings(@RequestBody ClinicSettings settings) {
        return ResponseEntity.ok(settingsService.updateSettings(currentUserProvider.getCurrentTenantId(), settings));
    }

    @GetMapping("/holidays")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ClinicHoliday>> getHolidays() {
        return ResponseEntity.ok(settingsService.getHolidays(currentUserProvider.getCurrentTenantId()));
    }

    @PostMapping("/holidays")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClinicHoliday> addHoliday(@RequestBody ClinicHoliday holiday) {
        return ResponseEntity.ok(settingsService.addHoliday(currentUserProvider.getCurrentTenantId(), holiday));
    }

    @DeleteMapping("/holidays/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeHoliday(@PathVariable Long id) {
        settingsService.removeHoliday(id, currentUserProvider.getCurrentTenantId());
        return ResponseEntity.ok().build();
    }
}
