package com.patientbook.repository;

import com.patientbook.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByAppointmentId(Long appointmentId);
    Optional<Invoice> findByAppointmentIdAndPsychologistId(Long appointmentId, Long psychologistId);
    Optional<Invoice> findByIdAndPsychologistId(Long id, Long psychologistId);
    List<Invoice> findByPatientIdAndPsychologistIdOrderByCreatedAtDesc(Long patientId, Long psychologistId);
    List<Invoice> findByStatusAndPsychologistId(String status, Long psychologistId);
    List<Invoice> findByPsychologistIdOrderByCreatedAtDesc(Long psychologistId);
    void deleteByPatientId(Long patientId);
    void deleteByAppointmentId(Long appointmentId);
}
