package com.patientbook.repository;

import com.patientbook.entity.PaymentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentSubmissionRepository extends JpaRepository<PaymentSubmission, Long> {
    List<PaymentSubmission> findByPsychologistIdOrderByCreatedAtDesc(Long psychologistId);
    List<PaymentSubmission> findByStatusOrderByCreatedAtAsc(String status);
    long countByPsychologistIdAndCreatedAtAfter(Long psychologistId, LocalDateTime after);
}
