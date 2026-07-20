package com.patientbook.controller;

import com.patientbook.dto.PaymentSubmissionReviewDto;
import com.patientbook.dto.RejectSubmissionRequest;
import com.patientbook.dto.SubscriptionOverrideRequest;
import com.patientbook.dto.TenantSummaryDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.SuperAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Superadmin-only surface — every method AND the class carry
// @PreAuthorize("hasAuthority('ROLE_SUPERADMIN')") in addition to the
// URL-level rule in SecurityConfig (defense in depth: a mistake in one layer
// doesn't expose this). Every mutation writes an AdminAuditLog row (see
// SuperAdminService) since this role can flip any tenant's paid-access state.
@RestController
@RequestMapping("/api/v1/superadmin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class SuperAdminController {

    private final SuperAdminService superAdminService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/tenants")
    public ResponseEntity<List<TenantSummaryDto>> listTenants() {
        return ResponseEntity.ok(superAdminService.listTenants());
    }

    @GetMapping("/tenants/{id}/payment-submissions")
    public ResponseEntity<List<PaymentSubmissionReviewDto>> tenantSubmissions(@PathVariable Long id) {
        return ResponseEntity.ok(superAdminService.listSubmissionsForTenant(id));
    }

    @PostMapping("/tenants/{id}/subscription")
    public ResponseEntity<TenantSummaryDto> overrideSubscription(
            @PathVariable Long id,
            @Valid @RequestBody SubscriptionOverrideRequest request) {
        return ResponseEntity.ok(superAdminService.overrideSubscription(id, currentUserProvider.getCurrentUserId(), request));
    }

    @GetMapping("/payment-submissions")
    public ResponseEntity<List<PaymentSubmissionReviewDto>> pendingSubmissions() {
        return ResponseEntity.ok(superAdminService.listPendingSubmissions());
    }

    @PostMapping("/payment-submissions/{id}/approve")
    public ResponseEntity<PaymentSubmissionReviewDto> approve(@PathVariable Long id) {
        return ResponseEntity.ok(superAdminService.approve(id, currentUserProvider.getCurrentUserId()));
    }

    @PostMapping("/payment-submissions/{id}/reject")
    public ResponseEntity<PaymentSubmissionReviewDto> reject(
            @PathVariable Long id,
            @Valid @RequestBody RejectSubmissionRequest request) {
        return ResponseEntity.ok(superAdminService.reject(id, currentUserProvider.getCurrentUserId(), request.getReason()));
    }
}
