package com.patientbook.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthEntryPoint unauthorizedHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final PublicApiRateLimitFilter publicApiRateLimitFilter;
    private final SubscriptionAccessFilter subscriptionAccessFilter;
    private final SuperAdminIpFilter superAdminIpFilter;

    // Comma-separated list of allowed frontend origins, e.g.
    // "https://app.yourdomain.com,https://yourdomain.com". Defaults to "*"
    // (any origin) for local/dev convenience — set ALLOWED_ORIGINS in
    // production to lock this down.
    @Value("${app.cors.allowed-origins:*}")
    private String allowedOrigins;

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // There is no single "the clinic" anymore — every public read is scoped by
    // a practitioner's slug (see PublicController, /api/v1/public/{slug}/...).
    // Nothing that used to be a clinic-wide public endpoint (doctor directory,
    // global services list, global settings) survives unscoped in this list.
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Explicit production-grade headers — this is a pure JSON API (no
            // HTML views), so a locked-down CSP costs nothing functionally but
            // closes off clickjacking/framing and stray-referrer leakage.
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
            )
            .authorizeHttpRequests(auth ->
                auth.requestMatchers("/api/v1/auth/me").authenticated() // must precede the wildcard below
                    .requestMatchers("/api/v1/auth/**").permitAll()
                    .requestMatchers("/api/v1/public/**").permitAll() // Slug-scoped public booking surface
                    .requestMatchers("/api/v1/appointments").permitAll() // POST is public (booking submit)
                    .requestMatchers("/api/v1/demo-booking").permitAll()
                    .requestMatchers("/api/v1/track/**").permitAll() // Track & rebook
                    .requestMatchers("/api/v1/chat").permitAll() // Public chatbot
                    .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/mood").permitAll()
                    .requestMatchers("/actuator/**").permitAll()
                    // Spring Boot's internal error-page forward. A denied
                    // request (e.g. a non-superadmin hitting /superadmin/**)
                    // triggers AccessDeniedHandlerImpl's sendError(403), which
                    // re-enters this SAME filter chain as a fresh dispatch to
                    // /error — but JwtAuthenticationFilter (an OncePerRequestFilter)
                    // skips ERROR dispatches by default, so that re-entry has
                    // no authentication. Without this permitAll, /error itself
                    // gets rejected by anyRequest().authenticated() and its 401
                    // clobbers the original 403. First real trigger for this is
                    // the superadmin rule below (previously every rule here was
                    // permitAll or plain authenticated(), which only ever
                    // produces 401s, not this 403-via-error-dispatch path).
                    .requestMatchers("/error").permitAll()
                    // URL-level rule for the superadmin surface — belt-and-braces
                    // alongside SuperAdminController's own @PreAuthorize.
                    .requestMatchers("/api/v1/superadmin/**").hasAuthority(Roles.SUPERADMIN)
                    .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(publicApiRateLimitFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(superAdminIpFilter, UsernamePasswordAuthenticationFilter.class);
        // Runs after the JWT filter (needs SecurityContextHolder already
        // populated) — blocks the tenant dashboard API once a trial/subscription
        // has lapsed. See SubscriptionAccessFilter for the exact scope.
        http.addFilterAfter(subscriptionAccessFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toList();
        configuration.setAllowedOriginPatterns(origins.isEmpty() ? List.of("*") : origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("authorization", "content-type", "x-auth-token"));
        configuration.setExposedHeaders(List.of("x-auth-token"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
