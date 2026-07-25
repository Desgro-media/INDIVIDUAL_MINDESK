package com.patientbook.repository;

import com.patientbook.entity.DoctorWeeklySlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorWeeklySlotRepository extends JpaRepository<DoctorWeeklySlot, Long> {
    List<DoctorWeeklySlot> findByPsychologistId(Long psychologistId);

    // Mode-filtered — this legacy model has no create UI anymore, so it
    // only ever contributes to the OFFLINE calendar in practice, but slot
    // generation still filters explicitly rather than assuming that.
    List<DoctorWeeklySlot> findByPsychologistIdAndDayOfWeekAndModeAndActiveTrue(Long psychologistId, String dayOfWeek, String mode);

    void deleteByPsychologistId(Long psychologistId);
    void deleteByIdAndPsychologistId(Long id, Long psychologistId);

    // One-time, idempotent backfill — see StartupInitializer.
    @Modifying
    @Query("UPDATE DoctorWeeklySlot s SET s.mode = 'OFFLINE' WHERE s.mode IS NULL")
    int backfillModeToOffline();
}
