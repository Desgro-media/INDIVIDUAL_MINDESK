package com.patientbook.repository;

import com.patientbook.entity.DoctorDateOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DoctorDateOverrideRepository extends JpaRepository<DoctorDateOverride, Long> {
    // Unfiltered — used by the Settings UI, which lists every override
    // (tagged with its mode, null meaning "both") in one call.
    List<DoctorDateOverride> findByPsychologistId(Long psychologistId);

    List<DoctorDateOverride> findByPsychologistIdAndSpecificDateGreaterThanEqual(Long psychologistId, LocalDate fromDate);

    // Mode-filtered for slot generation: a null-mode row (whole-day leave)
    // applies to every calendar, plus rows explicitly tagged for the
    // requested mode.
    @Query("SELECT o FROM DoctorDateOverride o WHERE o.psychologist.id = :psychologistId " +
            "AND o.specificDate = :specificDate AND (o.mode IS NULL OR o.mode = :mode)")
    List<DoctorDateOverride> findByPsychologistIdAndSpecificDateAndMode(
            @Param("psychologistId") Long psychologistId,
            @Param("specificDate") LocalDate specificDate,
            @Param("mode") String mode);

    void deleteByPsychologistId(Long psychologistId);
    void deleteByIdAndPsychologistId(Long id, Long psychologistId);

    // One-time, idempotent backfill — see StartupInitializer and the
    // 3-way-split reasoning in DoctorDateOverride.java. Whole-day blocks
    // (slotTime IS NULL) correctly stay mode=NULL (channel-independent,
    // and already null pre-migration, so this is a no-op for them).
    // Slot-specific rows were carved out of the doctor's one pre-existing
    // calendar and are backfilled to OFFLINE, not NULL, so they don't
    // silently start applying to a brand-new ONLINE calendar.
    @Modifying
    @Query("UPDATE DoctorDateOverride o SET o.mode = 'OFFLINE' WHERE o.mode IS NULL AND o.slotTime IS NOT NULL")
    int backfillModeToOffline();
}
