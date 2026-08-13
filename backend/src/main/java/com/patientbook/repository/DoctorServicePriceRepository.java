package com.patientbook.repository;

import com.patientbook.entity.DoctorServicePrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorServicePriceRepository extends JpaRepository<DoctorServicePrice, Long> {
    List<DoctorServicePrice> findByPsychologistId(Long psychologistId);
    Optional<DoctorServicePrice> findByPsychologistIdAndClinicServiceId(Long psychologistId, Long clinicServiceId);
    void deleteByPsychologistId(Long psychologistId);
    void deleteByClinicServiceId(Long clinicServiceId);

    // One-time, idempotent backfill from the pre-mode `price`/`offered`
    // columns — ddl-auto=update never drops them, they're just unmapped
    // from the entity now, so a native query can still read them. Every
    // existing row's single price/opt-in becomes its OFFLINE price/opt-in
    // (the only mode that existed before this feature); ONLINE starts
    // unconfigured. Native SQL because `price`/`offered` no longer exist
    // in the JPA mapping. Guarded so it only ever runs once per row.
    @Modifying
    @Query(value = "UPDATE doctor_service_price " +
            "SET offline_price = price, offline_offered = offered, online_price = NULL, online_offered = false " +
            "WHERE offline_price IS NULL AND online_price IS NULL AND price IS NOT NULL",
            nativeQuery = true)
    int backfillOfflineFromLegacyPrice();
}
