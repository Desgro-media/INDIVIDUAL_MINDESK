package com.patientbook.service;

import com.patientbook.dto.InvoiceDto;
import com.patientbook.dto.InvoicePaymentDto;
import com.patientbook.entity.Appointment;
import com.patientbook.entity.Invoice;
import com.patientbook.entity.InvoicePayment;
import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.ClinicServiceRepository;
import com.patientbook.repository.ClinicSettingsRepository;
import com.patientbook.repository.InvoicePaymentRepository;
import com.patientbook.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InvoicePaymentRepository invoicePaymentRepository;
    private final AppointmentRepository appointmentRepository;
    private final ClinicServiceRepository clinicServiceRepository;
    private final ClinicSettingsRepository clinicSettingsRepository;
    private final NotificationService notificationService;
    private final DoctorAvailabilityService doctorAvailabilityService;
    private final BankAccountService bankAccountService;

    // ── Auto-create invoice when appointment is COMPLETED ─────────────────
    @Transactional
    public InvoiceDto createInvoiceForAppointment(Long appointmentId) {
        return createInvoiceForAppointment(appointmentId, null, null);
    }

    @Transactional
    public InvoiceDto createInvoiceForAppointment(Long appointmentId, BigDecimal manualFee) {
        return createInvoiceForAppointment(appointmentId, manualFee, null);
    }

    @Transactional
    public InvoiceDto createInvoiceForAppointment(Long appointmentId, BigDecimal manualFee, String paymentHandledBy) {
        // Skip if invoice already exists — payment routing is decided once,
        // at creation time, and never retroactively changed by a later call
        // (e.g. the appointment reaching COMPLETED).
        if (invoiceRepository.findByAppointmentId(appointmentId).isPresent()) {
            Invoice existing = invoiceRepository.findByAppointmentId(appointmentId).get();
            return mapToDto(existing, resolveBankName(existing.getPsychologistId()));
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + appointmentId));

        BigDecimal fee = BigDecimal.ZERO;

        if (manualFee != null) {
            fee = manualFee;
        } else if (appointment.getSessionType() != null) {
            try {
                Long serviceId = Long.parseLong(appointment.getSessionType());
                // Pricing is per-PRACTITIONER (DoctorServicePrice is keyed by
                // the doctor's own id), never per-tenant — using
                // psychologistId here would silently charge every patient the
                // clinic owner's price regardless of which staff doctor they
                // actually saw. Falls back to psychologistId only for rows
                // that predate assignedDoctorId (individuals: same value).
                Long pricingDoctorId = appointment.getAssignedDoctorId() != null
                        ? appointment.getAssignedDoctorId() : appointment.getPsychologistId();
                String mode = appointment.getMode() != null ? appointment.getMode() : "OFFLINE";
                fee = doctorAvailabilityService.resolveBookablePrice(appointment.getPsychologistId(), pricingDoctorId, serviceId, mode);
            } catch (NumberFormatException ignored) {
                // sessionType is a name string, not an ID
            } catch (IllegalArgumentException ignored) {
                // The doctor's offerings changed since this appointment was
                // created (e.g. convertDemoToAppointment/recordPastSession,
                // which don't pre-validate the way live booking does) —
                // degrade to a zero fee rather than fail invoice creation
                // for an appointment that already exists; an admin can
                // reprice via InvoiceService.updateAmount.
            }
        }

        Invoice invoice = Invoice.builder()
                .psychologistId(appointment.getPsychologistId())
                .appointment(appointment)
                .patient(appointment.getPatient())
                .amount(fee)
                .status("UNPAID")
                .paymentHandledBy("RECEPTION".equals(paymentHandledBy) ? "RECEPTION" : "SELF")
                .build();

        return mapToDto(invoiceRepository.save(invoice), resolveBankName(appointment.getPsychologistId()));
    }

    // ── Mark invoice as paid in full (with optional discount and remark) —
    // owner/therapist action from the Billing page. Never used by
    // receptionists (see InvoiceController role guard); their collect-only
    // action is recordPayment below. ─────────────────────────────────────
    @Transactional
    public InvoiceDto markAsPaid(Long invoiceId, Long ownerId, String paymentMethod, BigDecimal discountAmount,
                                  String discountReason, String remark, Long bankAccountId, String bankAccountName,
                                  Long collectedByStaffId) {
        Invoice invoice = invoiceRepository.findByIdAndPsychologistId(invoiceId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if ("PAID".equals(invoice.getStatus()) || "WAIVED".equals(invoice.getStatus())) {
            throw new IllegalStateException("Invoice is already " + invoice.getStatus());
        }

        // A previously partially-paid invoice already has money in the
        // ledger — the discount and "amount to collect now" both apply only
        // to what's still outstanding, never to the original full amount.
        BigDecimal alreadyPaid = totalPaid(invoice);
        BigDecimal existingDiscount = nvl(invoice.getDiscountAmount());
        BigDecimal remainingBeforeDiscount = invoice.getAmount().subtract(existingDiscount).subtract(alreadyPaid);

        BigDecimal newDiscount = (discountAmount != null) ? discountAmount : BigDecimal.ZERO;
        if (newDiscount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Discount amount cannot be negative");
        }
        if (newDiscount.compareTo(remainingBeforeDiscount) > 0) {
            throw new IllegalArgumentException("Discount cannot exceed the remaining balance of " + remainingBeforeDiscount);
        }

        if (newDiscount.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setDiscountAmount(existingDiscount.add(newDiscount));
        }
        invoice.setPaymentMethod(paymentMethod);
        if (discountReason != null) {
            invoice.setDiscountReason(discountReason.trim().isEmpty() ? null : discountReason.trim());
        }
        if (remark != null) {
            invoice.setRemark(remark.trim().isEmpty() ? null : remark.trim());
        }
        if (bankAccountId != null) {
            invoice.setBankAccountId(bankAccountId);
        }
        if (bankAccountName != null && !bankAccountName.isBlank()) {
            invoice.setBankAccountName(bankAccountName.trim());
        }

        BigDecimal amountToCollectNow = remainingBeforeDiscount.subtract(newDiscount);
        if (amountToCollectNow.compareTo(BigDecimal.ZERO) > 0) {
            invoicePaymentRepository.save(InvoicePayment.builder()
                    .invoice(invoice)
                    .amount(amountToCollectNow)
                    .paymentMethod(paymentMethod)
                    .bankAccountId(bankAccountId)
                    .bankAccountName(invoice.getBankAccountName())
                    .remark(invoice.getRemark())
                    .collectedByStaffId(collectedByStaffId)
                    .paidAt(LocalDateTime.now())
                    .build());
        }

        invoice.setStatus("PAID");
        invoice.setPaidAt(LocalDate.now());

        confirmAppointmentIfPending(invoice.getAppointment());

        return mapToDto(invoiceRepository.save(invoice), resolveBankName(ownerId));
    }

    // ── Record a payment — full or partial — the receptionist's collect-only
    // action for a "pass to reception" invoice (also reusable for anyone
    // taking an installment). Never touches discount/waive; those stay
    // owner/therapist-only via markAsPaid/markAsWaived. Invoice.version
    // makes a second, near-simultaneous call against the same invoice fail
    // with an optimistic-lock conflict (409, see GlobalExceptionHandler)
    // instead of silently over-collecting past the true remaining balance.
    @Transactional
    public InvoiceDto recordPayment(Long invoiceId, Long tenantId, BigDecimal amount, String paymentMethod,
                                     Long bankAccountId, String bankAccountName, String remark, Long collectedByStaffId) {
        Invoice invoice = invoiceRepository.findByIdAndPsychologistId(invoiceId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if ("PAID".equals(invoice.getStatus()) || "WAIVED".equals(invoice.getStatus())) {
            throw new IllegalStateException("Invoice is already " + invoice.getStatus());
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }

        BigDecimal remaining = remainingBalance(invoice);
        if (amount.compareTo(remaining) > 0) {
            throw new IllegalArgumentException("Payment cannot exceed the remaining balance of " + remaining);
        }

        invoicePaymentRepository.save(InvoicePayment.builder()
                .invoice(invoice)
                .amount(amount)
                .paymentMethod(paymentMethod)
                .bankAccountId(bankAccountId)
                .bankAccountName(bankAccountName)
                .remark(remark != null && !remark.isBlank() ? remark.trim() : null)
                .collectedByStaffId(collectedByStaffId)
                .paidAt(LocalDateTime.now())
                .build());

        invoice.setPaymentMethod(paymentMethod);
        if (bankAccountId != null) invoice.setBankAccountId(bankAccountId);
        if (bankAccountName != null && !bankAccountName.isBlank()) invoice.setBankAccountName(bankAccountName.trim());

        if (remaining.subtract(amount).compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setStatus("PAID");
            invoice.setPaidAt(LocalDate.now());
            confirmAppointmentIfPending(invoice.getAppointment());
        } else {
            invoice.setStatus("PARTIALLY_PAID");
        }

        return mapToDto(invoiceRepository.save(invoice), resolveBankName(tenantId));
    }

    // ── Payment history for one invoice — what the receptionist queue shows
    // as "collected so far", each with the date/time it was recorded. ─────
    @Transactional(readOnly = true)
    public List<InvoicePaymentDto> getPaymentHistory(Long invoiceId, Long tenantId) {
        Invoice invoice = invoiceRepository.findByIdAndPsychologistId(invoiceId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
        return invoicePaymentRepository.findByInvoiceIdOrderByPaidAtAsc(invoice.getId()).stream()
                .map(p -> InvoicePaymentDto.builder()
                        .id(p.getId())
                        .amount(p.getAmount())
                        .paymentMethod(p.getPaymentMethod())
                        .bankAccountName(p.getBankAccountName())
                        .remark(p.getRemark())
                        .paidAt(p.getPaidAt())
                        .build())
                .collect(Collectors.toList());
    }

    // Internal-only — called after the caller has already verified ownership
    // of the appointment (see AppointmentService.updateAppointmentStatus).
    @Transactional
    public InvoiceDto markAppointmentInvoiceAsPaid(Long appointmentId, String paymentMethod) {
        Invoice invoice = invoiceRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found for appointment: " + appointmentId));

        if ("PAID".equals(invoice.getStatus()) || "WAIVED".equals(invoice.getStatus())) {
            return mapToDto(invoice, resolveBankName(invoice.getPsychologistId()));
        }

        BigDecimal remaining = remainingBalance(invoice);
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            invoicePaymentRepository.save(InvoicePayment.builder()
                    .invoice(invoice)
                    .amount(remaining)
                    .paymentMethod(paymentMethod)
                    .paidAt(LocalDateTime.now())
                    .build());
        }
        invoice.setStatus("PAID");
        invoice.setPaymentMethod(paymentMethod);
        invoice.setPaidAt(LocalDate.now());
        // No discount when auto-confirmed via status change

        return mapToDto(invoiceRepository.save(invoice), resolveBankName(invoice.getPsychologistId()));
    }

    // ── Override invoice amount before it's fully settled ─────────────────
    @Transactional
    public InvoiceDto updateAmount(Long invoiceId, Long ownerId, BigDecimal newAmount) {
        Invoice invoice = invoiceRepository.findByIdAndPsychologistId(invoiceId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (!("UNPAID".equals(invoice.getStatus()) || "PARTIALLY_PAID".equals(invoice.getStatus()))) {
            throw new IllegalStateException("Cannot reprice an invoice that is already " + invoice.getStatus());
        }
        if (newAmount == null || newAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        BigDecimal alreadyCommitted = totalPaid(invoice).add(nvl(invoice.getDiscountAmount()));
        if (newAmount.compareTo(alreadyCommitted) < 0) {
            throw new IllegalArgumentException("Amount cannot be less than what's already been collected or discounted (" + alreadyCommitted + ")");
        }

        invoice.setAmount(newAmount);
        Invoice saved = invoiceRepository.save(invoice);

        // When a price is set on an appointment that was auto-confirmed as
        // free (CONFIRMED + UNPAID invoice) and the PATIENT is responsible
        // for paying it, reset it to AWAITING_PAYMENT so they're notified to
        // pay the new fee. A RECEPTION-routed invoice is deliberately
        // excluded — its appointment is confirmed by design regardless of
        // payment status, and emailing that patient a "pay online" link here
        // would open exactly the second payment channel this feature exists
        // to avoid (see AppointmentService.bookAppointmentForOwner).
        Appointment appt = invoice.getAppointment();
        if ("CONFIRMED".equals(appt.getStatus()) && !"RECEPTION".equals(invoice.getPaymentHandledBy())) {
            appt.setStatus("AWAITING_PAYMENT");
            appointmentRepository.save(appt);
            notificationService.sendPaymentLink(
                    appt.getPatient().getName(),
                    appt.getPatient().getEmail(),
                    appt.getPatient().getPhone(),
                    appt.getAppointmentDate().toString(),
                    appt.getStartTime().toString(),
                    appt.getTrackingToken()
            );
        }

        return mapToDto(saved, resolveBankName(ownerId));
    }

    // ── Mark invoice as waived ────────────────────────────────────────────
    // If money was already collected against this invoice (a partial
    // payment before the rest was forgiven), that stays collected — only the
    // uncollected remainder is waived, folded into discountAmount so
    // amount-discount still equals what was actually paid (see
    // getRevenueSummary). Status only becomes the bare "WAIVED" label when
    // nothing was ever collected, matching pre-existing behavior exactly.
    @Transactional
    public InvoiceDto markAsWaived(Long invoiceId, Long ownerId) {
        Invoice invoice = invoiceRepository.findByIdAndPsychologistId(invoiceId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if ("PAID".equals(invoice.getStatus()) || "WAIVED".equals(invoice.getStatus())) {
            throw new IllegalStateException("Invoice is already " + invoice.getStatus());
        }

        BigDecimal alreadyPaid = totalPaid(invoice);
        BigDecimal remaining = remainingBalance(invoice);
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setDiscountAmount(nvl(invoice.getDiscountAmount()).add(remaining));
        }
        if (alreadyPaid.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setStatus("PAID");
            if (invoice.getPaidAt() == null) invoice.setPaidAt(LocalDate.now());
        } else {
            invoice.setStatus("WAIVED");
        }

        confirmAppointmentIfPending(invoice.getAppointment());

        return mapToDto(invoiceRepository.save(invoice), resolveBankName(ownerId));
    }

    // ── Get all invoices (own account) ────────────────────────────────────
    @Transactional(readOnly = true)
    public List<InvoiceDto> getAllInvoices(Long ownerId) {
        String bankName = resolveBankName(ownerId);
        return invoiceRepository.findByPsychologistIdOrderByCreatedAtDesc(ownerId)
                .stream().map(inv -> mapToDto(inv, bankName)).collect(Collectors.toList());
    }

    // ── Get invoices for a specific patient (own account) ─────────────────
    @Transactional(readOnly = true)
    public List<InvoiceDto> getInvoicesByPatient(Long patientId, Long ownerId) {
        String bankName = resolveBankName(ownerId);
        return invoiceRepository.findByPatientIdAndPsychologistIdOrderByCreatedAtDesc(patientId, ownerId)
                .stream().map(inv -> mapToDto(inv, bankName)).collect(Collectors.toList());
    }

    // ── Get invoice for a specific appointment (own account) ──────────────
    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceByAppointmentId(Long appointmentId, Long ownerId) {
        Invoice invoice = invoiceRepository.findByAppointmentIdAndPsychologistId(appointmentId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found for appointment: " + appointmentId));
        return mapToDto(invoice, resolveBankName(ownerId));
    }

    // ── Revenue summary (own account) ──────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getRevenueSummary(Long ownerId) {
        List<Invoice> all = invoiceRepository.findByPsychologistIdOrderByCreatedAtDesc(ownerId);

        // Revenue = what was actually collected. A fully PAID invoice
        // contributes its full amount-discount; a PARTIALLY_PAID one (e.g. a
        // reception collection still in progress) contributes only what's
        // actually been collected against it so far — not the full invoice —
        // so revenue always reflects real cash in hand, synced with the
        // same InvoicePayment ledger the receptionist queue reads from.
        BigDecimal totalRevenue = all.stream()
                .filter(i -> "PAID".equals(i.getStatus()) || "PARTIALLY_PAID".equals(i.getStatus()))
                .map(i -> "PAID".equals(i.getStatus())
                        ? i.getAmount().subtract(nvl(i.getDiscountAmount()))
                        : totalPaid(i))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Outstanding = what's still owed — the full amount for an untouched
        // UNPAID invoice, or just the remaining balance for one already
        // partially collected.
        BigDecimal outstanding = all.stream()
                .filter(i -> "UNPAID".equals(i.getStatus()) || "PARTIALLY_PAID".equals(i.getStatus()))
                .map(this::remainingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long paidCount   = all.stream().filter(i -> "PAID".equals(i.getStatus())).count();
        // "Unpaid" here means "still needs attention" — an untouched invoice
        // or one that's only partially collected are both still open.
        long unpaidCount = all.stream()
                .filter(i -> "UNPAID".equals(i.getStatus()) || "PARTIALLY_PAID".equals(i.getStatus()))
                .count();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalRevenue", totalRevenue);
        summary.put("outstanding", outstanding);
        summary.put("paidCount", paidCount);
        summary.put("unpaidCount", unpaidCount);
        summary.put("totalInvoices", all.size());
        return summary;
    }

    // ── Mapper ────────────────────────────────────────────────────────────
    private String resolveBankName(Long ownerId) {
        // Prefer the new multi-account system
        try {
            String newBankName = bankAccountService.resolveDefaultBankName(ownerId);
            if (newBankName != null && !newBankName.isBlank()) return newBankName;
        } catch (Exception ignored) {}
        // Fall back to legacy single bank name in ClinicSettings
        try {
            com.patientbook.entity.ClinicSettings settings = clinicSettingsRepository.findByPsychologistId(ownerId).orElse(null);
            if (settings != null && settings.getBankAccountName() != null && !settings.getBankAccountName().isBlank()) {
                return settings.getBankAccountName();
            }
        } catch (Exception ignored) {}
        return "Bank Account";
    }

    private InvoiceDto mapToDto(Invoice invoice, String bankName) {
        BigDecimal discount = nvl(invoice.getDiscountAmount());
        BigDecimal finalAmount = invoice.getAmount().subtract(discount);
        BigDecimal amountPaid = totalPaid(invoice);
        BigDecimal balanceDue = ("PAID".equals(invoice.getStatus()) || "WAIVED".equals(invoice.getStatus()))
                ? BigDecimal.ZERO
                : finalAmount.subtract(amountPaid).max(BigDecimal.ZERO);

        String toAccount = null;
        boolean settledOrInProgress = "PAID".equals(invoice.getStatus()) || "PARTIALLY_PAID".equals(invoice.getStatus());
        if (settledOrInProgress && invoice.getPaymentMethod() != null) {
            if ("CASH".equals(invoice.getPaymentMethod())) {
                toAccount = "Cash in hand";
            } else if (invoice.getBankAccountName() != null && !invoice.getBankAccountName().isBlank()) {
                toAccount = invoice.getBankAccountName();
            } else {
                toAccount = bankName;
            }
        }

        return InvoiceDto.builder()
                .id(invoice.getId())
                .appointmentId(invoice.getAppointment().getId())
                .patientId(invoice.getPatient().getId())
                .patientName(invoice.getPatient().getName())
                .patientEmail(invoice.getPatient().getEmail())
                .sessionType(invoice.getAppointment().getSessionType())
                .mode(invoice.getAppointment().getMode() != null ? invoice.getAppointment().getMode() : "OFFLINE")
                .appointmentDate(invoice.getAppointment().getAppointmentDate())
                .amount(invoice.getAmount())
                .discountAmount(discount)
                .finalAmount(finalAmount)
                .discountReason(invoice.getDiscountReason())
                .status(invoice.getStatus())
                .paymentHandledBy(invoice.getPaymentHandledBy())
                .amountPaid(amountPaid)
                .balanceDue(balanceDue)
                .paymentMethod(invoice.getPaymentMethod())
                .remark(invoice.getRemark())
                .toAccount(toAccount)
                .bankAccountId(invoice.getBankAccountId())
                .bankAccountName(invoice.getBankAccountName())
                .paidAt(invoice.getPaidAt())
                .createdAt(invoice.getCreatedAt())
                .build();
    }

    // ── Shared money-math helpers ──────────────────────────────────────────
    private BigDecimal nvl(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal totalPaid(Invoice invoice) {
        return invoicePaymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(InvoicePayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal remainingBalance(Invoice invoice) {
        BigDecimal remaining = invoice.getAmount().subtract(nvl(invoice.getDiscountAmount())).subtract(totalPaid(invoice));
        return remaining.max(BigDecimal.ZERO);
    }

    // Sync appointment to CONFIRMED when a payment fully settles an invoice
    // that was still gating confirmation on it (the online self-pay path —
    // AWAITING_PAYMENT/PAYMENT_UNDER_REVIEW/PENDING). A no-op for
    // RECEPTION-routed invoices, whose appointment is already CONFIRMED from
    // the moment it was scheduled (see AppointmentService.bookAppointmentForOwner).
    private void confirmAppointmentIfPending(Appointment appointment) {
        String apptStatus = appointment.getStatus();
        if ("AWAITING_PAYMENT".equals(apptStatus)
                || "PAYMENT_UNDER_REVIEW".equals(apptStatus)
                || "PENDING".equals(apptStatus)) {
            appointment.setStatus("CONFIRMED");
            appointmentRepository.save(appointment);
        }
    }
}
