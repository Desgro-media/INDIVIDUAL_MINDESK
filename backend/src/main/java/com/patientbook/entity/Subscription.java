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
//
// The paid window is [currentPeriodStart, currentPeriodEnd). Either bound may
// be null and each null means something different:
//   start == null -> no start gate; the period is considered already begun
//                    (every row written before superadmin date-editing shipped
//                    reads this way, which is exactly the old behavior).
//   end   == null -> no forced expiry (grandfathered, as above).
// A period whose start is still in the future resolves to SCHEDULED, NOT
// ACTIVE — see SubscriptionService.resolve, which is the single authority on
// turning these columns into a status. Never re-derive that logic anywhere
// else; a scheduled row looks "not currently allowed" and any independent
// check risks flipping it to EXPIRED and destroying the admin's schedule.
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

    // TRIALING, SCHEDULED, ACTIVE, EXPIRED, CANCELLED — see
    // SubscriptionService.resolve for how these are interpreted and lazily
    // corrected on access, and SubscriptionAccessFilter for enforcement.
    @Column(nullable = false)
    private String status;

    private LocalDateTime trialStartDate;
    private LocalDateTime trialEndDate;

    // Null = no start gate (period already begun). Set whenever a paid period
    // is written, so the window is always explicit going forward.
    private LocalDateTime currentPeriodStart;

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
