package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "doctor_service_price",
        uniqueConstraints = @UniqueConstraint(columnNames = {"psychologist_id", "clinic_service_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorServicePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "psychologist_id", nullable = false)
    private AppUser psychologist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clinic_service_id", nullable = false)
    private ClinicService clinicService;

    // Per-mode price/opt-in. Nullable — a doctor may configure only one
    // mode for a given service. The old single `price`/`offered` columns
    // are gone from this mapping but still physically exist in Postgres
    // under ddl-auto=update; StartupInitializer's one-time backfill reads
    // them via native SQL to populate offlinePrice/offlineOffered below.
    private BigDecimal onlinePrice;

    private BigDecimal offlinePrice;

    // SQL-level default is required (not just @Builder.Default) so the
    // ALTER TABLE adding this NOT NULL column succeeds against the
    // already-populated table.
    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean onlineOffered;

    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean offlineOffered;
}
