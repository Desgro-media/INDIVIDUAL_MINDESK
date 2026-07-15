package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "clinic_holiday",
        uniqueConstraints = @UniqueConstraint(columnNames = {"holiday_date", "psychologist_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicHoliday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "psychologist_id", nullable = false)
    private Long psychologistId;

    @Column(nullable = false)
    private LocalDate holidayDate;

    private String reason;
}
