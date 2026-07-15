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

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private boolean offered = true;
}
