package com.patientbook.repository;

import com.patientbook.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findByPsychologistId(Long psychologistId);
    boolean existsByPsychologistId(Long psychologistId);
}
