package com.patientbook.controller;

import com.patientbook.dto.InvoiceDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    // GET /api/v1/invoices — own billing page
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InvoiceDto>> getAllInvoices() {
        return ResponseEntity.ok(invoiceService.getAllInvoices(currentUserProvider.getCurrentUserId()));
    }

    // GET /api/v1/invoices/patient/{id}
    @GetMapping("/patient/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InvoiceDto>> getInvoicesByPatient(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoicesByPatient(id, currentUserProvider.getCurrentUserId()));
    }

    // GET /api/v1/invoices/appointment/{id}
    @GetMapping("/appointment/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceDto> getInvoiceByAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoiceByAppointmentId(id, currentUserProvider.getCurrentUserId()));
    }

    // GET /api/v1/invoices/summary — Revenue analytics
    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getRevenueSummary() {
        return ResponseEntity.ok(invoiceService.getRevenueSummary(currentUserProvider.getCurrentUserId()));
    }

    // PATCH /api/v1/invoices/{id}/pay
    // Body: { paymentMethod, discountAmount (optional), discountReason (optional) }
    @PatchMapping("/{id}/pay")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceDto> markAsPaid(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
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
                id, currentUserProvider.getCurrentUserId(), paymentMethod, discountAmount, discountReason, remark, bankAccountId, bankAccountName));
    }

    // PATCH /api/v1/invoices/{id}/amount — override price before patient pays (UNPAID only)
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
            return ResponseEntity.ok(invoiceService.updateAmount(id, currentUserProvider.getCurrentUserId(), newAmount));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // PATCH /api/v1/invoices/{id}/waive
    @PatchMapping("/{id}/waive")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceDto> markAsWaived(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.markAsWaived(id, currentUserProvider.getCurrentUserId()));
    }
}
