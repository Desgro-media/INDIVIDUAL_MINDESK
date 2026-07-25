package com.patientbook.repository;

import com.patientbook.entity.DoctorAvailabilityBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface DoctorAvailabilityBlockRepository extends JpaRepository<DoctorAvailabilityBlock, Long> {

    // Unfiltered — used by the Settings UI, which shows both modes' blocks
    // at once (tagged with `mode`) rather than refetching per tab.
    List<DoctorAvailabilityBlock> findByPsychologistIdOrderByDayOfWeekAscStartTimeAsc(Long psychologistId);

    // Mode-filtered — used by slot generation, which must only draw from
    // the calendar matching the mode the client actually booked.
    List<DoctorAvailabilityBlock> findByPsychologistIdAndDayOfWeekAndMode(Long psychologistId, String dayOfWeek, String mode);

    @Transactional
    void deleteByPsychologistIdAndDayOfWeekAndMode(Long psychologistId, String dayOfWeek, String mode);

    @Transactional
    void deleteByIdAndPsychologistId(Long id, Long psychologistId);

    // One-time, idempotent backfill — every pre-existing block predates the
    // mode feature and is backfilled to OFFLINE (see StartupInitializer).
    @Modifying
    @Query("UPDATE DoctorAvailabilityBlock b SET b.mode = 'OFFLINE' WHERE b.mode IS NULL")
    int backfillModeToOffline();
}
