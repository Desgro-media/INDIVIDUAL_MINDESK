package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

// One row per practitioner (not a global singleton) — same convention as
// ClinicSettings. Tracks the platform subscription (trial → paid), separate
// from anything in ClinicSettings/BankAccount, which are about the
// practitioner's OWN patient billing, not what they owe us.
//
// currentPeriodEnd == null with status ACTIVE means "no forced expiry" —
// used for grandfathered pre-launch accounts that never went through the
// trial/payment flow. New signups always get a real trialEndDate.
@Entity
@Table(name = "subscription")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "psychologist_id", unique = true, nullable = false)
    private Long psychologistId;

    // TRIALING, ACTIVE, EXPIRED, CANCELLED — see SubscriptionAccessFilter for
    // how these are interpreted and lazily flipped to EXPIRED on access.
    @Column(nullable = false)
    private String status;

    private LocalDateTime trialStartDate;
    private LocalDateTime trialEndDate;

    // Null = grandfathered/no forced expiry. Set on every approved payment.
    private LocalDateTime currentPeriodEnd;

    @Builder.Default
    private String plan = "INDIVIDUAL_ANNUAL";

    @Builder.Default
    private java.math.BigDecimal amount = new java.math.BigDecimal("9999");

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
