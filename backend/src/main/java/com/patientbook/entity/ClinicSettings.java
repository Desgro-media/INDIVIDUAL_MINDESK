package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;

// One row per practitioner (not a global singleton) — see SettingsService,
// which resolves this by the caller's own id instead of a hardcoded row id.
@Entity
@Table(name = "clinic_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "psychologist_id", unique = true, nullable = false)
    private Long psychologistId;

    private String clinicName;
    private String doctorName;
    private String address;
    private String contactPhone;
    private String contactEmail;
    private String demoCallNumber;

    // Legacy payment fields kept for DB compatibility; new multi-account setup uses BankAccount entity
    @Column(columnDefinition = "TEXT")
    private String paymentQrCodeUrl;

    private String bankAccountName;
}
