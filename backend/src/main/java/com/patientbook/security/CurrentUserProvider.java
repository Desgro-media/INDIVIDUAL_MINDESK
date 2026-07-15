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
}
