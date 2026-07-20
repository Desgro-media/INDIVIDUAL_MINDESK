package com.patientbook.controller;

import com.patientbook.dto.AuthResponse;
import com.patientbook.dto.LoginRequest;
import com.patientbook.dto.SignupRequest;
import com.patientbook.entity.AppUser;
import com.patientbook.entity.ClinicService;
import com.patientbook.entity.ClinicSettings;
import com.patientbook.entity.Subscription;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.repository.ClinicServiceRepository;
import com.patientbook.repository.ClinicSettingsRepository;
import com.patientbook.repository.SubscriptionRepository;
import com.patientbook.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final AppUserRepository appUserRepository;
    private final ClinicServiceRepository clinicServiceRepository;
    private final ClinicSettingsRepository clinicSettingsRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    private static final int TRIAL_DAYS = 14;

    // Every freelancer creates their own account here — there is no admin
    // who provisions accounts for anyone else.
    @PostMapping("/signup")
    @Transactional
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (appUserRepository.findByUsername(email).isPresent()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "An account with this email already exists"));
        }

        AppUser user = AppUser.builder()
                .username(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName().trim())
                .slug(generateUniqueSlug(request.getName()))
                .build();
        user = appUserRepository.save(user);

        seedDefaultsFor(user.getId(), user.getName());
        startTrial(user.getId());

        return ResponseEntity.ok(buildAuthResponse(user, issueToken(email, request.getPassword())));
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        String jwt = issueToken(loginRequest.getEmail().trim().toLowerCase(), loginRequest.getPassword());

        AppUser appUser = appUserRepository.findByUsername(loginRequest.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(buildAuthResponse(appUser, jwt));
    }

    // Lets the frontend confirm a locally-stored token is still valid (not
    // expired/revoked) before trusting it to grant access to the dashboard.
    // Requires authentication — see SecurityConfig, which carves this path
    // out of the otherwise-public /api/v1/auth/** matcher.
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        AppUser appUser = appUserRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(buildAuthResponse(appUser, null));
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private String issueToken(String email, String password) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        return jwtUtil.generateToken(userDetails);
    }

    private AuthResponse buildAuthResponse(AppUser appUser, String token) {
        return AuthResponse.builder()
                .token(token)
                .id(appUser.getId())
                .username(appUser.getUsername())
                .name(appUser.getName())
                .slug(appUser.getSlug())
                .jobTitle(appUser.getJobTitle())
                .role(appUser.getRole())
                .build();
    }

    // New signups start a 14-day trial. Existing (pre-launch) accounts are
    // handled separately — see StartupInitializer, which grandfathers them
    // as ACTIVE with no forced expiry instead of retroactively trial-gating them.
    private void startTrial(Long psychologistId) {
        LocalDateTime now = LocalDateTime.now();
        subscriptionRepository.save(Subscription.builder()
                .psychologistId(psychologistId)
                .status("TRIALING")
                .trialStartDate(now)
                .trialEndDate(now.plusDays(TRIAL_DAYS))
                .build());
    }

    private String generateUniqueSlug(String name) {
        String base = name.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "practitioner";
        String candidate = base;
        int suffix = 1;
        while (appUserRepository.existsBySlug(candidate)) {
            suffix++;
            candidate = base + "-" + suffix;
        }
        return candidate;
    }

    // Every new account starts with its own copy of the default service
    // catalog and an empty practice-settings row, scoped to that account only.
    private void seedDefaultsFor(Long psychologistId, String name) {
        clinicSettingsRepository.save(ClinicSettings.builder()
                .psychologistId(psychologistId)
                .doctorName(name)
                .build());

        List<ClinicService> defaults = List.of(
            ClinicService.builder().psychologistId(psychologistId).name("Initial Consultation").description("First-time assessment to understand your needs, history, and goals.").duration("50 min").icon("Sparkles").displayOrder(1).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Individual Therapy").description("One-on-one sessions for personal growth, trauma recovery, and coping skills.").duration("50 min").icon("Brain").displayOrder(2).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Psychological Assessment").description("Comprehensive evaluation including IQ, personality, learning disability, and diagnostic testing.").duration("90 min").icon("ClipboardList").displayOrder(3).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Couples Counseling").description("Improve communication, resolve conflicts, and strengthen your relationship.").duration("80 min").icon("Heart").displayOrder(4).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Family Therapy").description("Help families improve communication and resolve conflicts, including parent-child issues.").duration("80 min").icon("Home").displayOrder(5).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Group Therapy").description("Therapy with others facing similar challenges — anxiety, grief, addiction, and social skills.").duration("90 min").icon("Users").displayOrder(6).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Child & Adolescent Therapy").description("Support for children and teens with behavioral issues, ADHD, anxiety, and developmental concerns.").duration("50 min").icon("Baby").displayOrder(7).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("CBT Session").description("Cognitive Behavioral Therapy to identify and change unhelpful thinking and behavior patterns.").duration("50 min").icon("Repeat").displayOrder(8).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Crisis Intervention").description("Immediate support during emergencies — suicidal thoughts, trauma, grief, or abuse.").duration("60 min").icon("AlertCircle").displayOrder(9).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Career & Vocational Guidance").description("Career counseling, aptitude testing, and job-related stress management.").duration("50 min").icon("Briefcase").displayOrder(10).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Follow-Up Session").description("Ongoing follow-up to review progress and adjust your treatment plan.").duration("30 min").icon("RefreshCw").displayOrder(11).active(true).build(),
            ClinicService.builder().psychologistId(psychologistId).name("Other / Unsure").description("Not sure what you need? Book and we'll guide you to the right service.").duration("Flexible").icon("HelpCircle").displayOrder(12).active(true).build()
        );
        clinicServiceRepository.saveAll(defaults);
    }
}
