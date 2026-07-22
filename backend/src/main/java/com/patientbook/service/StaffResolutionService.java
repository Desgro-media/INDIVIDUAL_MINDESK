package com.patientbook.service;

import com.patientbook.entity.AppUser;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.security.Roles;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

// The single place that turns a client-supplied "which staff member" id into
// a trusted one. Every path that lets a caller pick a specific practitioner —
// the public booking flow (read AND write — see PublicController and
// AppointmentService.bookAppointment) and the dashboard's admin-driven
// scheduling (AppointmentController.scheduleManually/recordPastSession/
// convertDemoToAppointment) — must go through here rather than trusting a raw
// id, or a clinic's booking page could be used to book against (or an admin
// could see appointments attributed to) a practitioner in a different clinic.
@Service
@RequiredArgsConstructor
public class StaffResolutionService {

    private final AppUserRepository appUserRepository;

    // Public booking flow. Falls back to the tenant owner's own id when
    // requestedStaffId is absent — the only path an INDIVIDUAL account's
    // booking flow ever takes, so it sees zero behavior change. A clinic's
    // chosen staff member must be bookable, enabled, and actually belong to
    // this tenant; any mismatch fails exactly like "no such practitioner"
    // (never leaks whether the id exists elsewhere).
    public Long resolveBookableDoctorId(AppUser tenantOwner, Long requestedStaffId) {
        if (requestedStaffId == null) {
            return tenantOwner.getId();
        }
        if (requestedStaffId.equals(tenantOwner.getId())) {
            // A tenant root's role is always PSYCHOLOGIST (see AuthController),
            // so no role check needed for this branch.
            if (!tenantOwner.isBookable() || !tenantOwner.isEnabled()) {
                throw new ResourceNotFoundException("No such practitioner");
            }
            return tenantOwner.getId();
        }
        // Role-filtered at the query itself (not just checked after the
        // fact) — a receptionist/support-staff id can never resolve here
        // even if bookable were somehow left true on that row.
        AppUser staff = appUserRepository.findByIdAndTenantIdAndRole(requestedStaffId, tenantOwner.getId(), Roles.PSYCHOLOGIST)
                .orElseThrow(() -> new ResourceNotFoundException("No such practitioner"));
        if (!staff.isBookable() || !staff.isEnabled()) {
            throw new ResourceNotFoundException("No such practitioner");
        }
        return staff.getId();
    }

    // Dashboard-driven scheduling (manual booking / past-session recording /
    // demo-call conversion). Unlike the public flow, does not require
    // "bookable" — an admin can schedule against a staff member who isn't
    // publicly listed. Falls back to the caller's own id when
    // requestedAssignedDoctorId is absent, so a staff-doctor scheduling for
    // themselves (or an individual) never needs a picker.
    public Long resolveTenantStaffId(Long tenantId, Long callerOwnId, Long requestedAssignedDoctorId) {
        if (requestedAssignedDoctorId == null) {
            return callerOwnId;
        }
        if (requestedAssignedDoctorId.equals(tenantId)) {
            return tenantId;
        }
        // Role-restricted like resolveBookableDoctorId — an appointment must
        // be assigned to an actual practitioner, never a receptionist/
        // support-staff row, even from the admin-driven scheduling flow.
        AppUser staff = appUserRepository.findByIdAndTenantIdAndRole(requestedAssignedDoctorId, tenantId, Roles.PSYCHOLOGIST)
                .orElseThrow(() -> new ResourceNotFoundException("No such staff member"));
        if (!staff.isEnabled()) {
            throw new ResourceNotFoundException("No such staff member");
        }
        return staff.getId();
    }
}
