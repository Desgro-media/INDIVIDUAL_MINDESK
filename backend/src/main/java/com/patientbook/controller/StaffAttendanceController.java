package com.patientbook.controller;

import com.patientbook.dto.AttendanceDto;
import com.patientbook.entity.AppUser;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.StaffAttendanceService;
import com.patientbook.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

// Admin-only views onto a clinic's staff login history. Every endpoint here
// requires the caller to be their own clinic's tenant root (reused from
// StaffService.requireClinicOwner) and every query is scoped by the caller's
// own tenant id — a clinic admin can never pass another clinic's staff id in
// and read their attendance history (see StaffAttendanceService, which
// re-verifies ownership on the single-staff lookup).
@RestController
@RequestMapping("/api/v1/staff/attendance")
@RequiredArgsConstructor
public class StaffAttendanceController {

    private final StaffAttendanceService attendanceService;
    private final StaffService staffService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AttendanceDto>> getAllAttendance() {
        AppUser caller = currentUserProvider.getCurrentUser();
        staffService.requireClinicOwner(caller);
        return ResponseEntity.ok(attendanceService.getTenantHistory(caller.getId()));
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AttendanceDto>> getActiveStaff() {
        AppUser caller = currentUserProvider.getCurrentUser();
        staffService.requireClinicOwner(caller);
        return ResponseEntity.ok(attendanceService.getActiveForTenant(caller.getId()));
    }

    @GetMapping("/date/{date}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AttendanceDto>> getByDate(@PathVariable String date) {
        AppUser caller = currentUserProvider.getCurrentUser();
        staffService.requireClinicOwner(caller);
        return ResponseEntity.ok(attendanceService.getTenantHistoryForDate(caller.getId(), LocalDate.parse(date)));
    }

    @GetMapping("/staff/{staffId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AttendanceDto>> getForStaff(@PathVariable Long staffId) {
        AppUser caller = currentUserProvider.getCurrentUser();
        staffService.requireClinicOwner(caller);
        return ResponseEntity.ok(attendanceService.getHistoryForStaff(caller.getId(), staffId));
    }
}
