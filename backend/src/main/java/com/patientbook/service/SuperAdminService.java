package com.patientbook.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
        int active = 0, trialing = 0, expired = 0, cancelled = 0;
        for (TenantSummaryDto t : tenants) {
            if ("CLINIC".equals(t.getAccountType())) totalClinics++; else totalIndividuals++;
            switch (t.getSubscriptionStatus()) {
                case "ACTIVE": active++; break;
                case "TRIALING": trialing++; break;
                case "EXPIRED": expired++; break;
                case "CANCELLED": cancelled++; break;
                default: break; // "NONE" — no subscription row yet, shouldn't happen post-signup
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
                .filter(u -> Roles.PSYCHOLOGIST.equals(u.getRole()) && u.getTenantId() == null)
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
        boolean isClinic = tenant.getAccountType() == com.patientbook.entity.AccountType.CLINIC;
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
