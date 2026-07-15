package com.patientbook.repository;

import com.patientbook.entity.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    List<BankAccount> findByPsychologistIdAndActiveTrue(Long psychologistId);
    Optional<BankAccount> findByPsychologistIdAndIsDefaultTrueAndActiveTrue(Long psychologistId);
    List<BankAccount> findByPsychologistIdOrderByIsDefaultDescAccountNameAsc(Long psychologistId);
    Optional<BankAccount> findByIdAndPsychologistId(Long id, Long psychologistId);
}
