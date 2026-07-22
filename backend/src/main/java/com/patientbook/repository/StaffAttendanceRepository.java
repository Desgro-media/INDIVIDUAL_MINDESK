package com.patientbook.repository;

import com.patientbook.entity.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, Long> {

    // Admin views — every query joins through staff.tenantId so one clinic's
    // admin can never see another clinic's attendance history, even though
    // AppUser ids are globally unique across tenants.
    List<StaffAttendance> findByStaff_TenantIdOrderByLoginTimeDesc(Long tenantId);

    List<StaffAttendance> findByStaff_TenantIdAndDateOrderByLoginTimeDesc(Long tenantId, LocalDate date);

    List<StaffAttendance> findByStaff_TenantIdAndLogoutTimeIsNullOrderByLoginTimeDesc(Long tenantId);

    // Ownership-checked single-staff history — the caller must additionally
    // verify the target staff id belongs to their own tenant before calling
    // this (see StaffAttendanceService), same pattern as
    // AppUserRepository.findByIdAndTenantId.
    List<StaffAttendance> findByStaffIdOrderByLoginTimeDesc(Long staffId);

    // Login/logout recording — resolves the caller's own open session.
    Optional<StaffAttendance> findTopByStaffIdAndLogoutTimeIsNullOrderByLoginTimeDesc(Long staffId);

    void deleteByStaffId(Long staffId);
}
