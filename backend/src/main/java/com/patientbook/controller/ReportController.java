package com.patientbook.controller;

import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getSummary() {
        return ResponseEntity.ok(reportService.getSummary(currentUserProvider.getCurrentTenantId()));
    }

    @GetMapping("/trends")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getTrends(@RequestParam(defaultValue = "7d") String range) {
        return ResponseEntity.ok(reportService.getTrends(range));
    }

    @GetMapping("/busiest")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getBusiest() {
        return ResponseEntity.ok(reportService.getBusiest());
    }
}
