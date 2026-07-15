package com.patientbook.repository;

import com.patientbook.entity.RebookRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RebookRequestRepository extends JpaRepository<RebookRequest, Long> {
    Optional<RebookRequest> findByOriginalAppointmentId(Long originalAppointmentId);
}
