package com.patientbook.service;

import com.patientbook.dto.PaymentSubmissionDto;
import com.patientbook.dto.PaymentSubmissionRequest;
import com.patientbook.dto.SubscriptionStatusDto;
import com.patientbook.entity.PaymentSubmission;
import com.patientbook.entity.Subscription;
import com.patientbook.repository.PaymentSubmissionRepository;
import com.patientbook.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

// Single source of truth for "is this practitioner's dashboard access
// currently allowed" — both SubscriptionAccessFilter (enforcement) and
// SuperAdminService (the tenant list view) delegate here instead of each
// keeping their own copy of the trial/expiry state machine.
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentSubmissionRepository paymentSubmissionRepository;

    @Value("${app.payment.upi-id:}")
    private String platformUpiId;

    @Value("${app.payment.upi-qr-base64:}")
    private String platformUpiQrBase64;

    private static final int MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024; // 3MB decoded
    private static final int MAX_SUBMISSIONS_PER_DAY = 5;

    // ── Access gate (used by SubscriptionAccessFilter) ─────────────────────

    @Transactional
    public boolean isAccessAllowed(Long psychologistId) {
        return evaluateAndSync(loadOrFailClosed(psychologistId)).allowed();
    }

    // Status strings. SCHEDULED is the one that didn't exist before superadmin
    // date-editing: a paid window that has been set but hasn't begun yet.
    public static final String TRIALING  = "TRIALING";
    public static final String SCHEDULED = "SCHEDULED";
    public static final String ACTIVE    = "ACTIVE";
    public static final String EXPIRED   = "EXPIRED";
    public static final String CANCELLED = "CANCELLED";

    // What the stored row actually means right now. Kept as a value so callers
    // can't accidentally use one half without the other.
    public record Resolution(String status, boolean allowed) {}

    @Transactional
    public SubscriptionStatusDto getStatus(Long psychologistId) {
        Subscription sub = loadOrFailClosed(psychologistId);
        Resolution res = evaluateAndSync(sub);
        return SubscriptionStatusDto.builder()
                .status(res.status())
                .locked(!res.allowed())
                .plan(sub.getPlan())
                .amount(sub.getAmount())
                .trialStartDate(sub.getTrialStartDate())
                .trialEndDate(sub.getTrialEndDate())
                .currentPeriodStart(sub.getCurrentPeriodStart())
                .currentPeriodEnd(sub.getCurrentPeriodEnd())
                .daysRemaining(daysRemaining(sub, res.status()))
                .platformUpiId(platformUpiId)
                .platformUpiQrBase64(platformUpiQrBase64)
                .build();
    }

    @Transactional
    public PaymentSubmissionDto submitPayment(Long psychologistId, PaymentSubmissionRequest request) {
        LocalDateTime since = LocalDateTime.now().minusDays(1);
        long recentCount = paymentSubmissionRepository.countByPsychologistIdAndCreatedAtAfter(psychologistId, since);
        if (recentCount >= MAX_SUBMISSIONS_PER_DAY) {
            throw new IllegalStateException("Too many payment submissions today — please wait before submitting again.");
        }

        String screenshot = request.getScreenshotBase64();
        if (screenshot != null && !screenshot.isBlank()) {
            validateScreenshot(screenshot);
        }

        PaymentSubmission submission = PaymentSubmission.builder()
                .psychologistId(psychologistId)
                .upiTransactionRef(request.getUpiTransactionRef().trim())
                .screenshotBase64(screenshot)
                .amountClaimed(request.getAmountClaimed())
                .status("PENDING")
                .build();
        submission = paymentSubmissionRepository.save(submission);
        return toDto(submission);
    }

    public List<PaymentSubmissionDto> getSubmissions(Long psychologistId) {
        return paymentSubmissionRepository.findByPsychologistIdOrderByCreatedAtDesc(psychologistId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private Subscription loadOrFailClosed(Long psychologistId) {
        return subscriptionRepository.findByPsychologistId(psychologistId)
                .orElseGet(() -> subscriptionRepository.save(Subscription.builder()
                        .psychologistId(psychologistId)
                        .status("EXPIRED") // no row ever created for this tenant — never fail open
                        .build()));
    }

    // Resolves a stored row into what it means right now, then lazily persists
    // the corrected status (same "check on read, correct if stale" idiom as
    // SettingsService's get-or-create). Every consumer — the access filter,
    // the practitioner's own status page, and the superadmin tenant list —
    // goes through here, so enforcement and display can never disagree.
    private Resolution evaluateAndSync(Subscription sub) {
        Resolution res = resolve(sub, LocalDateTime.now());
        if (!res.status().equals(sub.getStatus())) {
            sub.setStatus(res.status());
            subscriptionRepository.save(sub);
        }
        return res;
    }

    // The single authority on "what is this subscription right now". Pure: no
    // I/O, no clock read — `now` is passed in so this is trivially testable and
    // so one request can't observe two different clocks mid-evaluation.
    //
    // Access is the UNION of the trial window and the paid window, deliberately
    // not a single-status check. That union is what makes it safe for an admin
    // to queue a future paid period for someone who is still mid-trial: the
    // queued period doesn't cut the trial short, it just takes over when the
    // trial lapses.
    //
    // Precedence — paid, then trial, then not-yet-started, then lapsed:
    //   CANCELLED       explicit admin suspension; sticky, never auto-recovers
    //   ACTIVE          now is inside the paid window (or it's grandfathered)
    //   TRIALING        now is inside the trial window
    //   SCHEDULED       a paid window exists but hasn't begun yet
    //   EXPIRED         everything else
    //
    // SCHEDULED is denied access but is NOT a lapse — it must never be rewritten
    // to EXPIRED, or the first page load after an admin schedules a future
    // period would silently erase that period.
    public static Resolution resolve(Subscription sub, LocalDateTime now) {
        // Sticky: a suspended account stays suspended until an admin explicitly
        // reactivates it, even if its dates would otherwise still be valid.
        if (CANCELLED.equals(sub.getStatus())) {
            return new Resolution(CANCELLED, false);
        }

        LocalDateTime periodStart = sub.getCurrentPeriodStart();
        LocalDateTime periodEnd = sub.getCurrentPeriodEnd();
        // A row with neither bound has no paid period at all — distinct from a
        // grandfathered one, which is ACTIVE with an open end (see below).
        boolean hasPaidPeriod = periodStart != null || periodEnd != null;

        // Grandfathered pre-launch accounts: ACTIVE, no bounds, never expire.
        // Checked before anything else so their behavior is untouched forever.
        if (!hasPaidPeriod && ACTIVE.equals(sub.getStatus())) {
            return new Resolution(ACTIVE, true);
        }

        // null start = no start gate (every row written before date-editing
        // shipped); null end = no forced expiry.
        boolean paidStarted = periodStart == null || !now.isBefore(periodStart);
        boolean paidNotEnded = periodEnd == null || now.isBefore(periodEnd);
        if (hasPaidPeriod && paidStarted && paidNotEnded) {
            return new Resolution(ACTIVE, true);
        }

        if (inTrialWindow(sub, now)) {
            return new Resolution(TRIALING, true);
        }

        // Paid window set but still in the future. Denied now, but preserved —
        // it will resolve to ACTIVE on its own once `now` reaches the start.
        if (hasPaidPeriod && !paidStarted) {
            return new Resolution(SCHEDULED, false);
        }

        return new Resolution(EXPIRED, false);
    }

    private static boolean inTrialWindow(Subscription sub, LocalDateTime now) {
        if (sub.getTrialEndDate() == null || !now.isBefore(sub.getTrialEndDate())) return false;
        return sub.getTrialStartDate() == null || !now.isBefore(sub.getTrialStartDate());
    }

    // Counts toward whichever deadline is actually governing access, so this
    // never reports time left against a window that isn't the live one:
    //   TRIALING  -> trial end        SCHEDULED -> days until the period starts
    //   ACTIVE    -> period end       lapsed    -> null
    private Integer daysRemaining(Subscription sub, String resolvedStatus) {
        LocalDateTime deadline = switch (resolvedStatus) {
            case TRIALING -> sub.getTrialEndDate();
            case SCHEDULED -> sub.getCurrentPeriodStart();
            case ACTIVE -> sub.getCurrentPeriodEnd();
            default -> null;
        };
        if (deadline == null) return null;
        long days = ChronoUnit.DAYS.between(LocalDateTime.now(), deadline);
        return (int) Math.max(0, days);
    }

    // Real image-content validation, not just trusting the client's claim —
    // decoded-size cap plus magic-byte sniffing for PNG/JPEG/WebP. Anything
    // else (or anything over the cap) is rejected before it ever reaches the DB.
    //
    // Accepts either a bare base64 string or a full "data:image/...;base64,"
    // data URL — the latter is what this codebase's existing FileReader-based
    // uploads produce (see BankAccount.qrCodeBase64, Appointment.paymentScreenshotBase64,
    // and settings/page.tsx's handleQrUpload) and is what actually gets stored,
    // so the frontend can render it straight back with <img src={...}> with no
    // reconstruction needed.
    private void validateScreenshot(String value) {
        String payload = value;
        String declaredMime = null;
        int commaIdx = value.indexOf(',');
        if (value.startsWith("data:") && commaIdx > 0) {
            // "data:image/png;base64" -> "image/png"
            String header = value.substring(5, commaIdx);
            int semi = header.indexOf(';');
            declaredMime = (semi >= 0 ? header.substring(0, semi) : header).trim().toLowerCase();
            payload = value.substring(commaIdx + 1);
        }

        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Screenshot is not valid base64 image data");
        }
        if (decoded.length > MAX_SCREENSHOT_BYTES) {
            throw new IllegalArgumentException("Screenshot is too large (max 3MB)");
        }

        String sniffedMime = sniffImageMime(decoded);
        if (sniffedMime == null) {
            throw new IllegalArgumentException("Screenshot must be a PNG, JPEG, or WebP image");
        }
        // The declared data-URL MIME type must match what the bytes actually
        // are — otherwise a client could label arbitrary content (e.g.
        // text/html) with a spoofed-but-passing PNG signature and have it
        // stored/served as if it were that declared type.
        if (declaredMime != null && !declaredMime.equals(sniffedMime)) {
            throw new IllegalArgumentException("Screenshot's declared type doesn't match its actual content");
        }
    }

    private String sniffImageMime(byte[] b) {
        if (b.length < 12) return null;
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "image/png";
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        return null;
    }

    private PaymentSubmissionDto toDto(PaymentSubmission s) {
        return PaymentSubmissionDto.builder()
                .id(s.getId())
                .upiTransactionRef(s.getUpiTransactionRef())
                .amountClaimed(s.getAmountClaimed())
                .hasScreenshot(s.getScreenshotBase64() != null && !s.getScreenshotBase64().isBlank())
                .status(s.getStatus())
                .reviewNote(s.getReviewNote())
                .reviewedAt(s.getReviewedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
