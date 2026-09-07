package com.patientbook.controller;

import com.patientbook.dto.InvoiceDto;
import com.patientbook.dto.InvoicePaymentDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.security.Roles;
import com.patientbook.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final CurrentUserProvider currentUserProvider;

    // A receptionist's only lever on an invoice is collecting money
    // (POST /payments below) — pricing, discounting and waiving stay
    // owner/therapist-only, even though both share the same BILLING
    // permission gate (StaffPermissionFilter). Checked here rather than via
    // a second permission flag because it's a strict subset carve-out of an
    // existing one, not an independent grant.
    private void requireNotReceptionist() {
        if (Roles.RECEPTIONIST.equals(currentUserProvider.getCurrentUser().getRole())) {
            throw new AccessDeniedException("Receptionists can collect payments but can't adjust pricing, discount, or waive invoices.");
        }
    }

    // GET /api/v1/invoices — own billing page
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InvoiceDto>> getAllInvoices() {
        return ResponseEntity.ok(invoiceService.getAllInvoices(currentUserProvider.getCurrentTenantId()));
    }

    // GET /api/v1/invoices/patient/{id}
    @GetMapping("/patient/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InvoiceDto>> getInvoicesByPatient(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoicesByPatient(id, currentUserProvider.getCurrentTenantId()));
    }

    // GET /api/v1/invoices/appointment/{id}
    @GetMapping("/appointment/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceDto> getInvoiceByAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoiceByAppointmentId(id, currentUserProvider.getCurrentTenantId()));
    }

    // GET /api/v1/invoices/summary — Revenue analytics
    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getRevenueSummary() {
        return ResponseEntity.ok(invoiceService.getRevenueSummary(currentUserProvider.getCurrentTenantId()));
    }

    // PATCH /api/v1/invoices/{id}/pay — settle in full, with an optional
    // discount. Owner/therapist only; a receptionist's collect-only
    // equivalent is POST /{id}/payments below.
    // Body: { paymentMethod, discountAmount (optional), discountReason (optional) }
    @PatchMapping("/{id}/pay")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceDto> markAsPaid(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        requireNotReceptionist();
        String paymentMethod = body.getOrDefault("paymentMethod", "CASH");
        BigDecimal discountAmount = null;
        if (body.containsKey("discountAmount") && body.get("discountAmount") != null && !body.get("discountAmount").isBlank()) {
            try {
                discountAmount = new BigDecimal(body.get("discountAmount"));
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        String discountReason = body.get("discountReason");
        String remark = body.get("remark");
        Long bankAccountId = null;
        if (body.containsKey("bankAccountId") && body.get("bankAccountId") != null && !body.get("bankAccountId").isBlank()) {
            try { bankAccountId = Long.parseLong(body.get("bankAccountId")); } catch (NumberFormatException ignored) {}
        }
        String bankAccountName = body.get("bankAccountName");
        return ResponseEntity.ok(invoiceService.markAsPaid(
                id, currentUserProvider.getCurrentTenantId(), paymentMethod, discountAmount, discountReason, remark,
                bankAccountId, bankAccountName, currentUserProvider.getCurrentUserId()));
    }

    // POST /api/v1/invoices/{id}/payments — collect a full or partial
    // payment. This is the receptionist's action: no discount field exists
    // on this endpoint at all, so there's nothing to lock down beyond what
    // the shape of the request already enforces.
    // Body: { amount, paymentMethod, bankAccountId (optional), bankAccountName (optional), remark (optional) }
    @PostMapping("/{id}/payments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceDto> recordPayment(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String raw = body.get("amount");
        if (raw == null || raw.isBlank()) return ResponseEntity.badRequest().build();
        BigDecimal amount;
        try {
            amount = new BigDecimal(raw);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }
        String paymentMethod = body.getOrDefault("paymentMethod", "CASH");
        Long bankAccountId = null;
        if (body.get("bankAccountId") != null && !body.get("bankAccountId").isBlank()) {
            try { bankAccountId = Long.parseLong(body.get("bankAccountId")); } catch (NumberFormatException ignored) {}
        }
        String bankAccountName = body.get("bankAccountName");
        String remark = body.get("remark");
        return ResponseEntity.ok(invoiceService.recordPayment(
                id, currentUserProvider.getCurrentTenantId(), amount, paymentMethod, bankAccountId, bankAccountName,
                remark, currentUserProvider.getCurrentUserId()));
    }

    // GET /api/v1/invoices/{id}/payments — the collection history the
    // receptionist queue shows (date/time of each payment recorded).
    @GetMapping("/{id}/payments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InvoicePaymentDto>> getPaymentHistory(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getPaymentHistory(id, currentUserProvider.getCurrentTenantId()));
    }

    // PATCH /api/v1/invoices/{id}/amount — override price before it's fully
    // settled (UNPAID or PARTIALLY_PAID). This is scheduling-time pricing,
    // not a discount/waive decision, so it isn't part of the
    // receptionist restriction above.
    // Body: { amount: "800" }
    @PatchMapping("/{id}/amount")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceDto> updateAmount(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String raw = body.get("amount");
        if (raw == null || raw.isBlank()) return ResponseEntity.badRequest().build();
        try {
            BigDecimal newAmount = new BigDecimal(raw);
            return ResponseEntity.ok(invoiceService.updateAmount(id, currentUserProvider.getCurrentTenantId(), newAmount));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // PATCH /api/v1/invoices/{id}/waive — owner/therapist only, same reasoning as /pay.
    @PatchMapping("/{id}/waive")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceDto> markAsWaived(@PathVariable Long id) {
        requireNotReceptionist();
        return ResponseEntity.ok(invoiceService.markAsWaived(id, currentUserProvider.getCurrentTenantId()));
    }
}
