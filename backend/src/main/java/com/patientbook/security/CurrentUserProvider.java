package com.patientbook.security;

import com.patientbook.entity.AppUser;
import com.patientbook.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

// Single source of truth for "who is making this request." Every controller
// that touches tenant-owned data resolves the caller through here instead of
// trusting a client-supplied id — that's what keeps one freelancer's data
// from being reachable by another.
@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final AppUserRepository appUserRepository;

    public AppUser getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        return appUserRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Current user not found"));
    }

    public Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    // The id every clinic-wide resource (Patients, Invoices, Settings, Bank
    // Accounts, Session Notes, the Clinic Service catalog, Reports...) should
    // be scoped by. For a tenant root (individual or clinic owner/admin) this
    // is their own id — identical to getCurrentUserId(), so individuals see
    // zero behavior change. For clinic staff (tenantId set) this resolves to
    // the clinic's own id instead of the staff member's, so a receptionist or
    // staff doctor sees the whole clinic's shared data.
    //
    // Do NOT use this for a caller's own calendar/services/pricing
    // (DoctorController's /me/** — those must stay scoped by
    // getCurrentUserId() so each staff doctor manages only their own
    // schedule).
    public Long getCurrentTenantId() {
        AppUser user = getCurrentUser();
        return user.getTenantId() != null ? user.getTenantId() : user.getId();
    }

    public boolean isTenantRoot() {
        return getCurrentUser().getTenantId() == null;
    }
}
