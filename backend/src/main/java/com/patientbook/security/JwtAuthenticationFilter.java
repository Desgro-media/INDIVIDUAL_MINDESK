package com.patientbook.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                String username = jwtUtil.extractUsername(jwt);

                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // Reloaded from the DB on every request (never cached),
                    // so a staff deactivation (see StaffService.deactivateStaff)
                    // takes effect on the very next call, not just on the
                    // next login — an already-issued JWT for a deactivated
                    // account must stop working immediately, not linger
                    // until it naturally expires (up to 8h later).
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    if (userDetails.isEnabled()
                            && !isIssuedBeforeCredentialChange(jwt, userDetails)
                            && jwtUtil.validateToken(jwt, userDetails)) {
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    // A password reset (or a clinic admin changing a staff login) must end the
    // sessions that were already open, not just stop future logins with the old
    // password — otherwise a token minted before the reset keeps working for up
    // to the full 8-hour expiry. AppUser.credentialsChangedAt records the
    // cutoff; anything issued before it is refused here.
    //
    // Compared at millisecond precision using the token's IAT_MILLIS claim
    // rather than the standard whole-second "iat".
    //
    // Whole seconds cannot order a token against a change that happened in the
    // same second, and both ways of resolving that ambiguity are wrong:
    // truncating the cutoff down leaves a stale session alive whenever the
    // change lands in the same second as the login, while rounding it up kills
    // the brand-new session created moments after a rescue — which is the
    // normal flow, since an admin issues a password and the client signs in
    // right away. Carrying the real millisecond removes the ambiguity instead
    // of picking which failure to accept.
    //
    // Both values come from this same server's clock, so the comparison is
    // internally consistent regardless of the JVM's zone.
    private boolean isIssuedBeforeCredentialChange(String jwt, UserDetails userDetails) {
        if (!(userDetails instanceof AppUserDetails appUserDetails)) return false;

        LocalDateTime changedAt = appUserDetails.getCredentialsChangedAt();
        if (changedAt == null) return false; // credentials never changed — nothing to cut off

        Long issuedMillis = jwtUtil.extractIssuedAtMillis(jwt);
        if (issuedMillis != null) {
            LocalDateTime issued = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(issuedMillis), ZoneId.systemDefault());
            return issued.isBefore(changedAt);
        }

        // Token predates the IAT_MILLIS claim (minted by an older build, still
        // within its 8h life). Fall back to whole seconds, and resolve the
        // ambiguous same-second case in favour of keeping the session — the
        // alternative would sign out working sessions across a deploy, and
        // these tokens all expire within hours anyway.
        Date issuedAt = jwtUtil.extractIssuedAt(jwt);
        if (issuedAt == null) return true; // no issue time at all → can't prove it postdates the change
        LocalDateTime issued = LocalDateTime.ofInstant(issuedAt.toInstant(), ZoneId.systemDefault());
        return issued.truncatedTo(ChronoUnit.SECONDS).isBefore(changedAt.truncatedTo(ChronoUnit.SECONDS));
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
