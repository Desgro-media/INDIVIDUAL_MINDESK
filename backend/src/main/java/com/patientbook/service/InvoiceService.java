package com.patientbook.service;

import com.patientbook.dto.InvoiceDto;
import com.patientbook.entity.Appointment;
import com.patientbook.entity.Invoice;
import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.ClinicServiceRepository;
import com.patientbook.repository.ClinicSettingsRepository;
import com.patientbook.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final AppointmentRepository appointmentRepository;
    private final ClinicServiceRepository clinicServiceRepository;
    private final ClinicSettingsRepository clinicSettingsRepository;
    private final NotificationService notificationService;
    private final DoctorAvailabilityService doctorAvailabilityService;
    private final BankAccountService bankAccountService;

    // ── Auto-create invoice when appointment is COMPLETED ─────────────────
    @Transactional
    public InvoiceDto createInvoiceForAppointment(Long appointmentId) {
        return createInvoiceForAppointment(appointmentId, null);
    }

    @Transactional
    public InvoiceDto createInvoiceForAppointment(Long appointmentId, BigDecimal manualFee) {
        // Skip if invoice already exists
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
                fee = doctorAvailabilityService.resolvePrice(appointment.getPsychologistId(), serviceId);
            } catch (NumberFormatException ignored) {
                // sessionType is a name string, not an ID
            }
        }

        Invoice invoice = Invoice.builder()
                .psychologistId(appointment.getPsychologistId())
                .appointment(appointment)
                .patient(appointment.getPatient())
                .amount(fee)
                .status("UNPAID")
                .build();

        return mapToDto(invoiceRepository.save(invoice), resolveBankName(appointment.getPsychologistId()));
    }

    // ── Mark invoice as paid (with optional discount and remark) ─────────
    @Transactional
    public InvoiceDto markAsPaid(Long invoiceId, Long ownerId, String paymentMethod, BigDecimal discountAmount, String discountReason, String remark, Long bankAccountId, String bankAccountName) {
        Invoice invoice = invoiceRepository.findByIdAndPsychologistId(invoiceId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if ("PAID".equals(invoice.getStatus()) || "WAIVED".equals(invoice.getStatus())) {
            throw new IllegalStateException("Invoice is already " + invoice.getStatus());
        }

        BigDecimal discount = (discountAmount != null) ? discountAmount : BigDecimal.ZERO;

        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Discount amount cannot be negative");
        }
        if (discount.compareTo(invoice.getAmount()) > 0) {
            throw new IllegalArgumentException("Discount cannot exceed the invoice amount of " + invoice.getAmount());
        }

        invoice.setStatus("PAID");
        invoice.setPaymentMethod(paymentMethod);
        invoice.setPaidAt(LocalDate.now());
        invoice.setDiscountAmount(discount);
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

        // Sync appointment to CONFIRMED when payment is settled from billing page
        Appointment appointment = invoice.getAppointment();
        String apptStatus = appointment.getStatus();
        if ("AWAITING_PAYMENT".equals(apptStatus)
                || "PAYMENT_UNDER_REVIEW".equals(apptStatus)
                || "PENDING".equals(apptStatus)) {
            appointment.setStatus("CONFIRMED");
            appointmentRepository.save(appointment);
        }

        return mapToDto(invoiceRepository.save(invoice), resolveBankName(ownerId));
    }

    // Internal-only — called after the caller has already verified ownership
    // of the appointment (see AppointmentService.updateAppointmentStatus).
    @Transactional
    public InvoiceDto markAppointmentInvoiceAsPaid(Long appointmentId, String paymentMethod) {
        Invoice invoice = invoiceRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found for appointment: " + appointmentId));

        invoice.setStatus("PAID");
        invoice.setPaymentMethod(paymentMethod);
        invoice.setPaidAt(LocalDate.now());
        // No discount when auto-confirmed via status change

        return mapToDto(invoiceRepository.save(invoice), resolveBankName(invoice.getPsychologistId()));
    }

    // ── Override invoice amount before patient pays ───────────────────────
    @Transactional
    public InvoiceDto updateAmount(Long invoiceId, Long ownerId, BigDecimal newAmount) {
        Invoice invoice = invoiceRepository.findByIdAndPsychologistId(invoiceId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (!"UNPAID".equals(invoice.getStatus())) {
            throw new IllegalStateException("Cannot reprice an invoice that is already " + invoice.getStatus());
        }
        if (newAmount == null || newAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        invoice.setAmount(newAmount);
        Invoice saved = invoiceRepository.save(invoice);

        // When a price is set on an appointment that was auto-confirmed as free (CONFIRMED + UNPAID invoice),
        // reset it to AWAITING_PAYMENT so the patient is notified to pay the new fee.
        Appointment appt = invoice.getAppointment();
        if ("CONFIRMED".equals(appt.getStatus())) {
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
    @Transactional
    public InvoiceDto markAsWaived(Long invoiceId, Long ownerId) {
        Invoice invoice = invoiceRepository.findByIdAndPsychologistId(invoiceId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if ("PAID".equals(invoice.getStatus()) || "WAIVED".equals(invoice.getStatus())) {
            throw new IllegalStateException("Invoice is already " + invoice.getStatus());
        }

        invoice.setStatus("WAIVED");

        Appointment appointment = invoice.getAppointment();
        String apptStatus = appointment.getStatus();
        if ("AWAITING_PAYMENT".equals(apptStatus)
                || "PAYMENT_UNDER_REVIEW".equals(apptStatus)
                || "PENDING".equals(apptStatus)) {
            appointment.setStatus("CONFIRMED");
            appointmentRepository.save(appointment);
        }

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

        // Revenue = what was actually collected (base fee minus any discount)
        BigDecimal totalRevenue = all.stream()
                .filter(i -> "PAID".equals(i.getStatus()))
                .map(i -> {
                    BigDecimal discount = i.getDiscountAmount() != null ? i.getDiscountAmount() : BigDecimal.ZERO;
                    return i.getAmount().subtract(discount);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outstanding = all.stream()
                .filter(i -> "UNPAID".equals(i.getStatus()))
                .map(Invoice::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long paidCount   = all.stream().filter(i -> "PAID".equals(i.getStatus())).count();
        long unpaidCount = all.stream().filter(i -> "UNPAID".equals(i.getStatus())).count();

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
        BigDecimal discount = invoice.getDiscountAmount() != null ? invoice.getDiscountAmount() : BigDecimal.ZERO;
        BigDecimal finalAmount = invoice.getAmount().subtract(discount);

        String toAccount = null;
        if ("PAID".equals(invoice.getStatus()) && invoice.getPaymentMethod() != null) {
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
                .appointmentDate(invoice.getAppointment().getAppointmentDate())
                .amount(invoice.getAmount())
                .discountAmount(discount)
                .finalAmount(finalAmount)
                .discountReason(invoice.getDiscountReason())
                .status(invoice.getStatus())
                .paymentMethod(invoice.getPaymentMethod())
                .remark(invoice.getRemark())
                .toAccount(toAccount)
                .bankAccountId(invoice.getBankAccountId())
                .bankAccountName(invoice.getBankAccountName())
                .paidAt(invoice.getPaidAt())
                .createdAt(invoice.getCreatedAt())
                .build();
    }
}
