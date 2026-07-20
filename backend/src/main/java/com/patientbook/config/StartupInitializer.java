package com.patientbook.config;

import com.patientbook.entity.AppUser;
import com.patientbook.entity.Subscription;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.repository.SubscriptionRepository;
import com.patientbook.security.Roles;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

// Runs on every startup, idempotently:
//  1. Grandfathers every pre-existing practitioner (anyone with no Subscription
//     row yet) as ACTIVE with no forced expiry — launching the trial/paid
//     system must never lock out an account that was already using the
//     product, only new signups from here on get the 14-day trial.
//  2. Seeds the single superadmin account from SUPERADMIN_EMAIL/PASSWORD env
//     vars, if configured and not already created. There is no signup path
//     for this role — this is the only way it's ever provisioned.
@Component
@RequiredArgsConstructor
@Slf4j
public class StartupInitializer implements ApplicationRunner {

    private final AppUserRepository appUserRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${superadmin.email:}")
    private String superadminEmail;

    @Value("${superadmin.password:}")
    private String superadminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        grandfatherExistingTenants();
        seedSuperAdmin();
    }

    private void grandfatherExistingTenants() {
        List<AppUser> tenants = appUserRepository.findByRoleOrderByCreatedAtDesc(Roles.PSYCHOLOGIST);
        int created = 0;
        for (AppUser tenant : tenants) {
            if (subscriptionRepository.existsByPsychologistId(tenant.getId())) continue;
            subscriptionRepository.save(Subscription.builder()
                    .psychologistId(tenant.getId())
                    .status("ACTIVE")
                    .currentPeriodEnd(null) // no forced expiry — grandfathered
                    .build());
            created++;
        }
        if (created > 0) {
            log.info("Grandfathered {} pre-existing account(s) with an unrestricted ACTIVE subscription", created);
        }
    }

    private void seedSuperAdmin() {
        if (!StringUtils.hasText(superadminEmail) || !StringUtils.hasText(superadminPassword)) {
            log.warn("SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD not set — no superadmin account will be seeded. " +
                    "Set both env vars and restart to provision one.");
            return;
        }
        String email = superadminEmail.trim().toLowerCase();
        if (appUserRepository.existsByUsernameAndRole(email, Roles.SUPERADMIN)) {
            return;
        }
        if (appUserRepository.findByUsername(email).isPresent()) {
            log.error("SUPERADMIN_EMAIL {} is already registered as a regular account — refusing to seed a " +
                    "superadmin with the same email. Use a distinct email for the superadmin account.", email);
            return;
        }

        AppUser admin = AppUser.builder()
                .username(email)
                .password(passwordEncoder.encode(superadminPassword))
                .name("Super Admin")
                .role(Roles.SUPERADMIN)
                .slug(uniqueAdminSlug())
                .bookable(false)
                .build();
        appUserRepository.save(admin);
        log.info("Seeded superadmin account for {}", email);
    }

    // The superadmin row still needs a unique, non-null slug to satisfy
    // AppUser's schema, even though it's never reachable via /book/{slug}
    // (PublicController/AppointmentService only resolve slugs scoped to
    // ROLE_PSYCHOLOGIST).
    private String uniqueAdminSlug() {
        String base = "superadmin";
        String candidate = base;
        int suffix = 1;
        while (appUserRepository.existsBySlug(candidate)) {
            suffix++;
            candidate = base + "-" + suffix;
        }
        return candidate;
    }
}
