package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

// One row per login session for a clinic staff member (any AppUser with
// tenantId set — see StaffAttendanceService). Tenant scoping for the "who's
// currently active" / history views is derived by joining staff.tenantId,
// not stored redundantly here.
@Entity
@Table(name = "staff_attendance")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "staff_id", nullable = false)
    private AppUser staff;

    @Column(nullable = false)
    private LocalDateTime loginTime;

    private LocalDateTime logoutTime; // null = still active

    private Long workMinutes; // calculated on logout

    @Column(nullable = false)
    private LocalDate date;
}
