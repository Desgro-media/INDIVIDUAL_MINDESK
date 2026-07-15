package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "doctor_weekly_slot")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorWeeklySlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "psychologist_id", nullable = false)
    private AppUser psychologist;

    // MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
    @Column(nullable = false)
    private String dayOfWeek;

    // HH:mm e.g. "09:00", "14:30"
    @Column(nullable = false)
    private String slotTime;

    @Column(nullable = false)
    private boolean active = true;
}
