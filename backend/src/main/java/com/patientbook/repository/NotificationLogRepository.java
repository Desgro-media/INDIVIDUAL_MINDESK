package com.patientbook.repository;

import com.patientbook.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {
    List<NotificationLog> findByAppointmentId(Long appointmentId);
    void deleteByAppointmentId(Long appointmentId);
}
