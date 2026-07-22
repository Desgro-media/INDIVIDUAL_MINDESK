package com.patientbook.security;

import com.patientbook.entity.AppUser;
import com.patientbook.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser appUser = appUserRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found with username: " + username));

        // Spring Security's User has first-class support for a disabled
        // account — DaoAuthenticationProvider checks this automatically and
        // throws DisabledException (handled by GlobalExceptionHandler) for a
        // deactivated staff member, rather than us needing a bespoke check
        // somewhere after authentication.
        return new User(
                appUser.getUsername(),
                appUser.getPassword(),
                appUser.isEnabled(),
                true, true, true,
                Collections.singletonList(new SimpleGrantedAuthority(appUser.getRole()))
        );
    }
}
