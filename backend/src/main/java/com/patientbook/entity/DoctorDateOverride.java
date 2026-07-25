package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "doctor_date_override")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorDateOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "psychologist_id", nullable = false)
    private AppUser psychologist;

    @Column(nullable = false)
    private LocalDate specificDate;

    // HH:mm e.g. "09:00" — null for a whole-day block (see `available`)
    private String slotTime;

    // true = this slot is available on this date (add/keep), false = blocked (remove from weekly schedule)
    @Column(nullable = false)
    private boolean available = true;

    // ONLINE, OFFLINE, or null. Null means "applies to both calendars" —
    // the only legitimate use is a whole-day block (leave/holiday is
    // channel-independent). Any override that carries a specific slotTime
    // must carry an explicit mode; see DoctorAvailabilityService.
    private String mode;
}
