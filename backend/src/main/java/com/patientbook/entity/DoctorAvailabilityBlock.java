package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "doctor_availability_block")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorAvailabilityBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "psychologist_id", nullable = false)
    private AppUser psychologist;

    // MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
    @Column(nullable = false)
    private String dayOfWeek;

    // HH:mm e.g. "09:00"
    @Column(nullable = false)
    private String startTime;

    // HH:mm e.g. "11:00"  — slots generated while start < endTime
    @Column(nullable = false)
    private String endTime;

    // Slot interval in minutes (30, 45, 60, 90, 120)
    @Column(nullable = false)
    private int intervalMinutes;

    // ONLINE or OFFLINE — which calendar this block belongs to. Nullable at
    // the column level only for the startup backfill window (see
    // StartupInitializer); every pre-existing row predates this feature and
    // is backfilled to OFFLINE, since that's the only mode that existed
    // before online sessions were introduced.
    private String mode;
}
