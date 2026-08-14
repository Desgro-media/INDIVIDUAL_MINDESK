package com.patientbook.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.time.LocalDateTime;
import java.util.Collection;

// Spring Security's User plus the one extra fact JwtAuthenticationFilter
// needs: when this account's credentials were last changed out from under it.
//
// Carried on the principal rather than re-read from the DB in the filter,
// because loadUserByUsername already fetched the AppUser row on this very
// request — a second query per request to learn one timestamp would be pure
// waste. See AppUser.credentialsChangedAt for what the value means.
public class AppUserDetails extends User {

    private final LocalDateTime credentialsChangedAt;

    public AppUserDetails(String username, String password, boolean enabled,
                          Collection<? extends GrantedAuthority> authorities,
                          LocalDateTime credentialsChangedAt) {
        super(username, password, enabled, true, true, true, authorities);
        this.credentialsChangedAt = credentialsChangedAt;
    }

    // Null means "never changed" — no tokens are cut off.
    public LocalDateTime getCredentialsChangedAt() {
        return credentialsChangedAt;
    }
}
