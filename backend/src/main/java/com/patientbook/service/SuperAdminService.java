package com.patientbook.service;

import com.patientbook.dto.PaymentSubmissionReviewDto;
import com.patientbook.dto.SubscriptionOverrideRequest;
import com.patientbook.dto.TenantSummaryDto;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd MMM yyyy");

    public List<TenantSummaryDto> listTenants() {
        return appUserRepository.findByRoleOrderByCreatedAtDesc(Roles.PSYCHOLOGIST)
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
        LocalDateTime extendFrom = (sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isAfter(now))
                ? sub.getCurrentPeriodEnd() : now;
        sub.setStatus("ACTIVE");
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
                .filter(u -> Roles.PSYCHOLOGIST.equals(u.getRole()))
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));
        Subscription sub = subscriptionRepository.findByPsychologistId(tenantId)
                .orElseGet(() -> Subscription.builder().psychologistId(tenantId).status("EXPIRED").build());

        if ("SUSPEND".equals(request.getAction())) {
            sub.setStatus("CANCELLED");
        } else { // ACTIVATE
            LocalDateTime now = LocalDateTime.now();
            int days = request.getExtendDays() != null ? request.getExtendDays() : 365;
            LocalDateTime extendFrom = (sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isAfter(now))
                    ? sub.getCurrentPeriodEnd() : now;
            sub.setStatus("ACTIVE");
            sub.setCurrentPeriodEnd(extendFrom.plusDays(days));
        }
        subscriptionRepository.save(sub);
        audit(adminId, "MANUAL_OVERRIDE_" + request.getAction(), tenantId, "extendDays=" + request.getExtendDays());

        return toSummary(tenant);
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
        return TenantSummaryDto.builder()
                .id(tenant.getId())
                .name(tenant.getName())
                .email(tenant.getUsername())
                .slug(tenant.getSlug())
                .createdAt(tenant.getCreatedAt())
                .subscriptionStatus(status.getStatus())
                .locked(status.isLocked())
                .trialEndDate(status.getTrialEndDate())
                .currentPeriodEnd(status.getCurrentPeriodEnd())
                .daysRemaining(status.getDaysRemaining())
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
