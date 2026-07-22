package com.patientbook.controller;

import com.patientbook.dto.PaymentSubmissionDto;
import com.patientbook.dto.PaymentSubmissionRequest;
import com.patientbook.dto.SubscriptionStatusDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// The tenant's own view of their platform subscription — deliberately
// reachable even when SubscriptionAccessFilter has locked the rest of the
// dashboard (see SecurityConfig/SubscriptionAccessFilter's exemption list),
// since a locked-out practitioner still needs to see why and submit proof of
// payment to get unlocked.
@RestController
@RequestMapping("/api/v1/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SubscriptionStatusDto> getStatus() {
        return ResponseEntity.ok(subscriptionService.getStatus(currentUserProvider.getCurrentTenantId()));
    }

    @PostMapping("/payment-submissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentSubmissionDto> submitPayment(@Valid @RequestBody PaymentSubmissionRequest request) {
        return ResponseEntity.ok(subscriptionService.submitPayment(currentUserProvider.getCurrentTenantId(), request));
    }

    @GetMapping("/payment-submissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PaymentSubmissionDto>> getSubmissions() {
        return ResponseEntity.ok(subscriptionService.getSubmissions(currentUserProvider.getCurrentTenantId()));
    }
}
