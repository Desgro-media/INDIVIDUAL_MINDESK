package com.patientbook.service;

import com.patientbook.dto.AttendanceDto;
import com.patientbook.entity.AppUser;
import com.patientbook.entity.StaffAttendance;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.repository.StaffAttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

// Login/logout time tracking for clinic staff. Tracks anyone with tenantId
// set (i.e. any non-tenant-root account) rather than matching specific role
// strings, so a role added later doesn't silently fall outside attendance
// tracking. Tenant roots (individuals, clinic owners) and the superadmin are
// never tracked — see AuthController, the only caller of recordLogin.
@Service
@RequiredArgsConstructor
public class StaffAttendanceService {

    private final StaffAttendanceRepository attendanceRepository;
    private final AppUserRepository appUserRepository;

    @Transactional
    public void recordLogin(AppUser staff) {
        if (staff.getTenantId() == null) return;
        attendanceRepository.save(StaffAttendance.builder()
                .staff(staff)
                .loginTime(LocalDateTime.now())
                .date(LocalDate.now())
                .build());
    }

    @Transactional
    public void recordLogout(AppUser staff) {
        if (staff.getTenantId() == null) return;
        closeOpenSession(staff.getId());
    }

    // Called when a staff account is deactivated, so "currently active"
    // views don't show a phantom permanently-logged-in row for an account
    // that can no longer log out itself.
    @Transactional
    public void closeOpenSession(Long staffId) {
        attendanceRepository.findTopByStaffIdAndLogoutTimeIsNullOrderByLoginTimeDesc(staffId)
                .ifPresent(session -> {
                    LocalDateTime now = LocalDateTime.now();
                    session.setLogoutTime(now);
                    session.setWorkMinutes(Duration.between(session.getLoginTime(), now).toMinutes());
                    attendanceRepository.save(session);
                });
    }

    public List<AttendanceDto> getTenantHistory(Long tenantId) {
        return attendanceRepository.findByStaff_TenantIdOrderByLoginTimeDesc(tenantId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<AttendanceDto> getTenantHistoryForDate(Long tenantId, LocalDate date) {
        return attendanceRepository.findByStaff_TenantIdAndDateOrderByLoginTimeDesc(tenantId, date)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<AttendanceDto> getActiveForTenant(Long tenantId) {
        return attendanceRepository.findByStaff_TenantIdAndLogoutTimeIsNullOrderByLoginTimeDesc(tenantId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // Ownership-checked — a staffId belonging to a different tenant is
    // rejected before its history is ever read.
    public List<AttendanceDto> getHistoryForStaff(Long tenantId, Long staffId) {
        appUserRepository.findByIdAndTenantId(staffId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found: " + staffId));
        return attendanceRepository.findByStaffIdOrderByLoginTimeDesc(staffId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private AttendanceDto toDto(StaffAttendance a) {
        AppUser staff = a.getStaff();
        return AttendanceDto.builder()
                .id(a.getId())
                .staffId(staff.getId())
                .staffName(staff.getName())
                .staffUsername(staff.getUsername())
                .staffJobTitle(staff.getJobTitle())
                .loginTime(a.getLoginTime())
                .logoutTime(a.getLogoutTime())
                .workMinutes(a.getWorkMinutes())
                .date(a.getDate())
                .build();
    }
}
