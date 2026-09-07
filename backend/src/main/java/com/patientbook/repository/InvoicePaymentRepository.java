package com.patientbook.repository;

import com.patientbook.entity.InvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoicePaymentRepository extends JpaRepository<InvoicePayment, Long> {
    List<InvoicePayment> findByInvoiceIdOrderByPaidAtAsc(Long invoiceId);
    List<InvoicePayment> findByInvoiceId(Long invoiceId);
    void deleteByInvoiceId(Long invoiceId);
    // Nested-path deletes so callers wiping an appointment/patient's invoice
    // (AppointmentService.deleteAppointment, PatientService.deletePatient)
    // can clear this ledger first — the FK to invoice would otherwise reject
    // the invoice delete for any appointment that ever had a payment recorded.
    void deleteByInvoice_Appointment_Id(Long appointmentId);
    void deleteByInvoice_Patient_Id(Long patientId);
}
