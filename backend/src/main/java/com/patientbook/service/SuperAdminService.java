package com.patientbook.service;

import com.patientbook.dto.AdminSetPasswordResponse;
import com.patientbook.dto.PaymentHistoryEntryDto;
import com.patientbook.dto.PaymentSubmissionReviewDto;
import com.patientbook.dto.SubscriptionOverrideRequest;
import com.patientbook.dto.SuperAdminDashboardStatsDto;
import com.patientbook.dto.TenantSummaryDto;
import com.patientbook.entity.AccountType;
import com.patientbook.entity.AdminAuditLog;
import com.patientbook.entity.AppUser;
import com.patientbook.entity.PaymentSubmission;
import com.patientbook.entity.Subscription;
import com.patientbook.repository.AdminAuditLogRepository;
import com.patientbook.repository.AppUserRepository;
import com.patientbook.repository.PaymentSubmissionRepository;
import com.patientbook.repository.SubscriptionRepository;
import com.patientbook.security.Roles;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

// Everything a superadmin can do: see every tenant's subscription state,
// review/approve/reject submitted payment proofs, and manually override a
// tenant's subscription (comps/refunds/suspension). Every mutation is
// audit-logged — see AdminAuditLog — since this role can flip anyone's paid
// access, unlike every other role in this codebase.
@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private final AppUserRepository appUserRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentSubmissionRepository paymentSubmissionRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final SubscriptionService subscriptionService;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;

    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter AUDIT_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // Sanity bounds on manual date entry — wide enough never to block a real
    // billing arrangement, tight enough to catch a mistyped year.
    private static final int MAX_SCHEDULE_AHEAD_YEARS = 5;
    private static final int MAX_PERIOD_YEARS = 10;

    public List<TenantSummaryDto> listTenants() {
        // tenantId IS NULL excludes clinic staff-doctors, who share the
        // PSYCHOLOGIST role string with real tenants but aren't billed
        // independently — see AppUserRepository.
        return appUserRepository.findByRoleAndTenantIdIsNullOrderByCreatedAtDesc(Roles.PSYCHOLOGIST)
                .stream().map(this::toSummary).collect(Collectors.toList());
    }

    public List<PaymentSubmissionReviewDto> listPendingSubmissions() {
        return paymentSubmissionRepository.findByStatusOrderByCreatedAtAsc("PENDING")
                .stream().map(this::toReviewDto).collect(Collectors.toList());
    }

    public List<PaymentSubmissionReviewDto> listSubmissionsForTenant(Long tenantId) {
        return paymentSubmissionRepository.findByPsychologistIdOrderByCreatedAtDesc(tenantId)
                .stream().map(this::toReviewDto).collect(Collectors.toList());
    }

    // Powers the overview screen: tenant mix + subscription-state breakdown
    // come from listTenants()'s live status (never a raw, possibly-stale read
    // of the subscription table) so these counts can never disagree with the
    // Tenants table rendered right below them. Payment counts/revenue are
    // status="APPROVED" only for revenue — a rejected or still-pending
    // submission isn't money actually collected.
    @Transactional
    public SuperAdminDashboardStatsDto getDashboardStats() {
        List<TenantSummaryDto> tenants = listTenants();

        int totalClinics = 0, totalIndividuals = 0;
        int active = 0, trialing = 0, scheduled = 0, expired = 0, cancelled = 0;
        for (TenantSummaryDto t : tenants) {
            if ("CLINIC".equals(t.getAccountType())) totalClinics++; else totalIndividuals++;
            switch (t.getSubscriptionStatus()) {
                case SubscriptionService.ACTIVE: active++; break;
                case SubscriptionService.TRIALING: trialing++; break;
                case SubscriptionService.SCHEDULED: scheduled++; break;
                case SubscriptionService.EXPIRED: expired++; break;
                case SubscriptionService.CANCELLED: cancelled++; break;
                // Anything unrecognised is counted as expired rather than
                // dropped: these five buckets are rendered as a breakdown of
                // totalTenants, so silently skipping a row would make the
                // segments stop summing to the total with no visible cause.
                default: expired++; break;
            }
        }

        long successful = paymentSubmissionRepository.countByStatus("APPROVED");
        long pendingCount = paymentSubmissionRepository.countByStatus("PENDING");
        long failed = paymentSubmissionRepository.countByStatus("REJECTED");
        BigDecimal totalRevenue = paymentSubmissionRepository.sumAmountClaimedByStatus("APPROVED");
        if (totalRevenue == null) totalRevenue = BigDecimal.ZERO;

        List<PaymentHistoryEntryDto> recent = paymentSubmissionRepository.findTop20ByOrderByCreatedAtDesc()
                .stream().map(this::toHistoryDto).collect(Collectors.toList());

        return SuperAdminDashboardStatsDto.builder()
                .totalClinics(totalClinics)
                .totalIndividuals(totalIndividuals)
                .totalTenants(tenants.size())
                .activeSubscriptions(active)
                .trialingSubscriptions(trialing)
                .scheduledSubscriptions(scheduled)
                .expiredSubscriptions(expired)
                .cancelledSubscriptions(cancelled)
                .totalPayments((int) (successful + pendingCount + failed))
                .successfulPayments((int) successful)
                .pendingPayments((int) pendingCount)
                .failedPayments((int) failed)
                .totalRevenue(totalRevenue)
                .recentPayments(recent)
                .build();
    }

    @Transactional
    public PaymentSubmissionReviewDto approve(Long submissionId, Long adminId) {
        PaymentSubmission submission = paymentSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        if (!"PENDING".equals(submission.getStatus())) {
            throw new IllegalStateException("This submission has already been reviewed");
        }

        AppUser tenant = appUserRepository.findById(submission.getPsychologistId())
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));
        Subscription sub = subscriptionRepository.findByPsychologistId(tenant.getId())
                .orElseGet(() -> Subscription.builder().psychologistId(tenant.getId()).status("EXPIRED").build());

        LocalDateTime now = LocalDateTime.now();
        // Renewals queue after any time already paid for rather than resetting
        // to today, so approving early never costs the tenant remaining days.
        LocalDateTime extendFrom = (sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isAfter(now))
                ? sub.getCurrentPeriodEnd() : now;
        sub.setStatus(SubscriptionService.ACTIVE);
        sub.setCurrentPeriodStart(extendFrom);
        sub.setCurrentPeriodEnd(extendFrom.plusYears(1));
        subscriptionRepository.save(sub);

        submission.setStatus("APPROVED");
        submission.setReviewedByAdminId(adminId);
        submission.setReviewedAt(now);
        submission = paymentSubmissionRepository.save(submission);

        audit(adminId, "APPROVE_PAYMENT", tenant.getId(), "submissionId=" + submissionId);
        notificationService.sendSubscriptionActivatedEmail(tenant.getName(), tenant.getUsername(),
                sub.getCurrentPeriodEnd().format(DISPLAY_DATE));

        return toReviewDto(submission);
    }

    @Transactional
    public PaymentSubmissionReviewDto reject(Long submissionId, Long adminId, String reason) {
        PaymentSubmission submission = paymentSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        if (!"PENDING".equals(submission.getStatus())) {
            throw new IllegalStateException("This submission has already been reviewed");
        }

        submission.setStatus("REJECTED");
        submission.setReviewNote(reason);
        submission.setReviewedByAdminId(adminId);
        submission.setReviewedAt(LocalDateTime.now());
        submission = paymentSubmissionRepository.save(submission);

        AppUser tenant = appUserRepository.findById(submission.getPsychologistId()).orElse(null);
        audit(adminId, "REJECT_PAYMENT", submission.getPsychologistId(), "submissionId=" + submissionId + " reason=" + reason);
        if (tenant != null) {
            notificationService.sendPaymentRejectedEmail(tenant.getName(), tenant.getUsername(), reason);
        }

        return toReviewDto(submission);
    }

    @Transactional
    public TenantSummaryDto overrideSubscription(Long tenantId, Long adminId, SubscriptionOverrideRequest request) {
        AppUser tenant = appUserRepository.findById(tenantId)
                .filter(u -> Roles.PSYCHOLOGIST.equals(u.getRole()) && u.getTenantId() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));
        Subscription sub = subscriptionRepository.findByPsychologistId(tenantId)
                .orElseGet(() -> Subscription.builder().psychologistId(tenantId).status("EXPIRED").build());

        String detail;
        if ("SUSPEND".equals(request.getAction())) {
            // Dates are deliberately left untouched — suspension is a hold, not
            // a deletion, so reactivating restores the original window instead
            // of forcing the admin to retype dates they never changed.
            sub.setStatus(SubscriptionService.CANCELLED);
            detail = "suspended; window preserved " + describeWindow(sub);
        } else { // ACTIVATE
            LocalDateTime before = sub.getCurrentPeriodEnd();
            Window window = resolveWindow(sub, request);
            sub.setCurrentPeriodStart(window.start());
            sub.setCurrentPeriodEnd(window.end());
            // Clears any prior CANCELLED hold. resolve() decides ACTIVE vs
            // SCHEDULED from the dates on the very next read, so writing ACTIVE
            // here is just a starting point, never the final word.
            sub.setStatus(SubscriptionService.ACTIVE);
            detail = "preset=" + (request.getPreset() != null ? request.getPreset() : "LEGACY")
                    + " window=" + describeWindow(sub)
                    + " previousEnd=" + (before != null ? before.format(AUDIT_DATE) : "none");
        }
        subscriptionRepository.save(sub);
        audit(adminId, "MANUAL_OVERRIDE_" + request.getAction(), tenantId, detail);

        return toSummary(tenant);
    }

    // ── Password rescue ───────────────────────────────────────────────────

    // Last resort for a tenant (individual practitioner or clinic owner) who
    // can't sign in. There is no self-service reset in this product and no
    // email dependency — the admin issues a new password here and passes it to
    // the client over whatever channel they're already talking on.
    //
    // This SETS a password; it cannot reveal the existing one. AppUser.password
    // is a bcrypt hash with a per-row salt, which is one-way by construction —
    // no code path, privilege level, or database access can turn it back into
    // the original text. That's the property that makes a breach of this table
    // survivable, so it is not a limitation to engineer around.
    //
    // Scoped to tenant ROOTS only, matching listTenants(): a clinic's staff are
    // recovered by their own clinic admin (StaffService.updateCredentials), so
    // the superadmin never needs to reach past a tenant boundary to fix a login.
    @Transactional
    public AdminSetPasswordResponse resetTenantPassword(Long tenantId, Long adminId, String requestedPassword) {
        AppUser tenant = appUserRepository.findById(tenantId)
                .filter(u -> Roles.PSYCHOLOGIST.equals(u.getRole()) && u.getTenantId() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));

        String password;
        if (requestedPassword != null && !requestedPassword.isBlank()) {
            if (requestedPassword.length() < 8) {
                throw new IllegalArgumentException("Password must be at least 8 characters");
            }
            password = requestedPassword;
        } else {
            password = generatePassword();
        }

        tenant.setPassword(passwordEncoder.encode(password));
        // Signs out every device the tenant was already logged in on. Matters
        // most in the case this feature exists for: an account someone else may
        // have gotten into. See AppUser.credentialsChangedAt.
        LocalDateTime now = LocalDateTime.now();
        tenant.setCredentialsChangedAt(now);
        appUserRepository.save(tenant);

        // Records that the rescue happened and who performed it. The password
        // itself is deliberately NOT in the detail string — an audit trail that
        // stores working credentials is a liability, not a record.
        audit(adminId, "RESET_TENANT_PASSWORD", tenantId,
                "issued a new password for " + tenant.getUsername() + "; existing sessions revoked");

        return AdminSetPasswordResponse.builder()
                .tenantId(tenant.getId())
                .name(tenant.getName())
                .email(tenant.getUsername())
                .temporaryPassword(password)
                .changedAt(now)
                .build();
    }

    // Read-aloud-safe: no characters that sound or look alike (0/O, 1/l/I),
    // grouped into blocks so an admin can dictate it over a phone call without
    // the client mistyping it. ~62 bits of entropy, which is far beyond what a
    // password meant to be changed within the hour needs.
    private String generatePassword() {
        final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder(14);
        for (int i = 0; i < 12; i++) {
            if (i > 0 && i % 4 == 0) sb.append('-');
            sb.append(alphabet.charAt(SECURE_RANDOM.nextInt(alphabet.length())));
        }
        return sb.toString();
    }

    // A resolved paid window, already normalized to its time-of-day bounds.
    private record Window(LocalDateTime start, LocalDateTime end) {}

    // Turns the admin's date-only intent into a concrete [start, end) window.
    //
    // Start defaults to max(today, currentPeriodEnd) rather than today: that's
    // what makes "give them another year" queue after time the tenant has
    // already paid for instead of silently swallowing it. An explicit startDate
    // always wins, which is how backdating and future-scheduling are expressed.
    //
    // Boundaries are inclusive-by-day: start at 00:00:00 of its date, end at
    // 23:59:59.999999999 of its date. An admin who types "31 Aug" as the end
    // means "through the 31st", so the tenant keeps access all that day —
    // normalizing to start-of-day here would cut them off a full day early.
    private Window resolveWindow(Subscription sub, SubscriptionOverrideRequest request) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime defaultStart = (sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isAfter(now))
                ? sub.getCurrentPeriodEnd() : now;

        LocalDateTime start = request.getStartDate() != null
                ? request.getStartDate().atStartOfDay()
                : defaultStart;

        String preset = request.getPreset();
        LocalDateTime end;
        if ("CUSTOM".equals(preset)) {
            if (request.getEndDate() == null) {
                throw new IllegalArgumentException("An end date is required for a custom period");
            }
            end = endOfDay(request.getEndDate());
        } else if (preset != null) {
            // Calendar-aware arithmetic, not a fixed day count: "1 month" from
            // 31 Jan is 28/29 Feb, and "1 year" spans a leap day correctly.
            // plusMonths/plusYears clamp to the last valid day of the target
            // month on their own, so no month-length special-casing is needed.
            LocalDateTime base = start;
            end = switch (preset) {
                case "ONE_MONTH" -> base.plusMonths(1);
                case "SIX_MONTHS" -> base.plusMonths(6);
                default -> base.plusYears(1); // ONE_YEAR
            };
        } else {
            // Legacy path: {action, extendDays} with no preset. Preserved so an
            // older client (or a stored integration) keeps behaving exactly as
            // it did before date-editing shipped.
            int days = request.getExtendDays() != null ? request.getExtendDays() : 365;
            end = start.plusDays(days);
        }

        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("The end date must be after the start date");
        }
        // Guards against a mistyped year (2206 instead of 2026) handing out a
        // two-century subscription that nobody would notice until renewal.
        if (start.isAfter(now.plusYears(MAX_SCHEDULE_AHEAD_YEARS))) {
            throw new IllegalArgumentException("A period can't start more than "
                    + MAX_SCHEDULE_AHEAD_YEARS + " years from now — check the start date");
        }
        if (end.isAfter(start.plusYears(MAX_PERIOD_YEARS))) {
            throw new IllegalArgumentException("A period can't be longer than "
                    + MAX_PERIOD_YEARS + " years — check the end date");
        }
        return new Window(start, end);
    }

    // The last instant of the given day, so the whole day counts as inside the
    // window (see resolveWindow).
    //
    // Deliberately NOT LocalTime.MAX (23:59:59.999999999): the column is
    // timestamp(6), and Postgres rounds those nanoseconds up to the next
    // microsecond — storing 00:00:00 of the FOLLOWING day and silently
    // reintroducing the off-by-one this method exists to prevent. Verified
    // against the live DB, not theoretical. Microsecond precision is the
    // most this column can hold, so stop exactly there.
    private static LocalDateTime endOfDay(LocalDate date) {
        return date.atTime(LocalTime.of(23, 59, 59, 999_999_000));
    }

    private static String describeWindow(Subscription sub) {
        String start = sub.getCurrentPeriodStart() != null ? sub.getCurrentPeriodStart().format(AUDIT_DATE) : "open";
        String end = sub.getCurrentPeriodEnd() != null ? sub.getCurrentPeriodEnd().format(AUDIT_DATE) : "open";
        return start + ".." + end;
    }

    private void audit(Long adminId, String action, Long targetPsychologistId, String detail) {
        adminAuditLogRepository.save(AdminAuditLog.builder()
                .adminUserId(adminId)
                .action(action)
                .targetPsychologistId(targetPsychologistId)
                .detail(detail)
                .build());
    }

    // Delegates entirely to SubscriptionService's getStatus (same status/
    // locked/daysRemaining computation the access filter enforces) so this
    // list can never drift out of sync with what's actually being gated.
    private TenantSummaryDto toSummary(AppUser tenant) {
        var status = subscriptionService.getStatus(tenant.getId());
        boolean isClinic = tenant.getAccountType() == com.patientbook.entity.AccountType.CLINIC;
        return TenantSummaryDto.builder()
                .id(tenant.getId())
                .name(tenant.getName())
                .email(tenant.getUsername())
                .phone(tenant.getPhone())
                .slug(tenant.getSlug())
                .createdAt(tenant.getCreatedAt())
                .subscriptionStatus(status.getStatus())
                .locked(status.isLocked())
                .trialEndDate(status.getTrialEndDate())
                .currentPeriodEnd(status.getCurrentPeriodEnd())
                .daysRemaining(status.getDaysRemaining())
                // Pre-clinic-feature tenants have no accountType set — every
                // one of them really was an individual freelancer, so that's
                // the correct label rather than leaving it blank/null.
                .accountType(isClinic ? "CLINIC" : "INDIVIDUAL")
                .staffCount(isClinic ? appUserRepository.findByTenantIdOrderByNameAsc(tenant.getId()).size() : 0)
                .build();
    }

    private PaymentHistoryEntryDto toHistoryDto(PaymentSubmission s) {
        AppUser tenant = appUserRepository.findById(s.getPsychologistId()).orElse(null);
        boolean isClinic = tenant != null && tenant.getAccountType() == AccountType.CLINIC;
        return PaymentHistoryEntryDto.builder()
                .id(s.getId())
                .psychologistId(s.getPsychologistId())
                .psychologistName(tenant != null ? tenant.getName() : "Unknown")
                .psychologistEmail(tenant != null ? tenant.getUsername() : "")
                .accountType(isClinic ? "CLINIC" : "INDIVIDUAL")
                .upiTransactionRef(s.getUpiTransactionRef())
                .amountClaimed(s.getAmountClaimed())
                .status(s.getStatus())
                .reviewNote(s.getReviewNote())
                .reviewedAt(s.getReviewedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private PaymentSubmissionReviewDto toReviewDto(PaymentSubmission s) {
        AppUser tenant = appUserRepository.findById(s.getPsychologistId()).orElse(null);
        return PaymentSubmissionReviewDto.builder()
                .id(s.getId())
                .psychologistId(s.getPsychologistId())
                .psychologistName(tenant != null ? tenant.getName() : "Unknown")
                .psychologistEmail(tenant != null ? tenant.getUsername() : "")
                .upiTransactionRef(s.getUpiTransactionRef())
                .amountClaimed(s.getAmountClaimed())
                .screenshotBase64(s.getScreenshotBase64())
                .status(s.getStatus())
                .reviewNote(s.getReviewNote())
                .reviewedAt(s.getReviewedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
