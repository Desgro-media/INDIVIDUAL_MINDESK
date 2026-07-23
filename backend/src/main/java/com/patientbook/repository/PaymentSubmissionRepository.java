package com.patientbook.repository;

import com.patientbook.entity.PaymentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentSubmissionRepository extends JpaRepository<PaymentSubmission, Long> {
    List<PaymentSubmission> findByPsychologistIdOrderByCreatedAtDesc(Long psychologistId);
    List<PaymentSubmission> findByStatusOrderByCreatedAtAsc(String status);
    long countByPsychologistIdAndCreatedAtAfter(Long psychologistId, LocalDateTime after);

    // Superadmin dashboard: payment-status breakdown (PENDING/APPROVED/REJECTED
    // -> Pending/Successful/Failed) and the Recent Payment History feed.
    long countByStatus(String status);
    List<PaymentSubmission> findTop20ByOrderByCreatedAtDesc();

    // Null (not zero) when there are no matching rows — SUM's own quirk, not
    // this codebase's — so callers must null-check. Deliberately NOT wrapped
    // in COALESCE(SUM(...), 0): mixing a BigDecimal column with an integer
    // literal there is a known Hibernate type-coercion trap that can throw a
    // ClassCastException at runtime depending on dialect/version.
    @Query("SELECT SUM(p.amountClaimed) FROM PaymentSubmission p WHERE p.status = :status")
    BigDecimal sumAmountClaimedByStatus(@Param("status") String status);
}
