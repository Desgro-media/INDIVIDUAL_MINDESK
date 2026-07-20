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
        return evaluateAndSync(loadOrFailClosed(psychologistId));
    }

    @Transactional
    public SubscriptionStatusDto getStatus(Long psychologistId) {
        Subscription sub = loadOrFailClosed(psychologistId);
        boolean allowed = evaluateAndSync(sub);
        return SubscriptionStatusDto.builder()
                .status(sub.getStatus())
                .locked(!allowed)
                .plan(sub.getPlan())
                .amount(sub.getAmount())
                .trialStartDate(sub.getTrialStartDate())
                .trialEndDate(sub.getTrialEndDate())
                .currentPeriodEnd(sub.getCurrentPeriodEnd())
                .daysRemaining(daysRemaining(sub))
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

    // Applies the TRIALING/ACTIVE/EXPIRED/CANCELLED state machine, lazily
    // persisting an EXPIRED flip the first time a lapsed date is observed
    // (same "check on read, correct if stale" idiom as SettingsService's
    // get-or-create). Returns whether access is currently allowed.
    private boolean evaluateAndSync(Subscription sub) {
        LocalDateTime now = LocalDateTime.now();
        boolean allowed;
        switch (sub.getStatus()) {
            case "ACTIVE":
                allowed = sub.getCurrentPeriodEnd() == null || sub.getCurrentPeriodEnd().isAfter(now);
                break;
            case "TRIALING":
                allowed = sub.getTrialEndDate() != null && sub.getTrialEndDate().isAfter(now);
                break;
            default: // EXPIRED, CANCELLED
                allowed = false;
        }
        if (!allowed && !"EXPIRED".equals(sub.getStatus()) && !"CANCELLED".equals(sub.getStatus())) {
            sub.setStatus("EXPIRED");
            subscriptionRepository.save(sub);
        }
        return allowed;
    }

    private Integer daysRemaining(Subscription sub) {
        LocalDateTime deadline = "TRIALING".equals(sub.getStatus()) ? sub.getTrialEndDate() : sub.getCurrentPeriodEnd();
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
