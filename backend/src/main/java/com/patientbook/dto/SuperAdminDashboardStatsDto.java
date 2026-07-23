package com.patientbook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

// Everything the superadmin overview screen renders in one round trip —
// tenant mix, subscription-state breakdown, payment-status breakdown,
// revenue, and a recent-history feed. Subscription/tenant counts are derived
// from the same live-status computation SuperAdminService.listTenants() uses
// (SubscriptionService.getStatus, which lazily self-corrects a stale
// TRIALING/ACTIVE row to EXPIRED on read) so these numbers can never drift
// from what the Tenants table below it shows.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuperAdminDashboardStatsDto {
    private int totalClinics;
    private int totalIndividuals;
    private int totalTenants;

    private int activeSubscriptions;
    private int trialingSubscriptions;
    private int expiredSubscriptions;
    private int cancelledSubscriptions;

    private int totalPayments;
    private int successfulPayments;
    private int pendingPayments;
    private int failedPayments;

    private BigDecimal totalRevenue;

    private List<PaymentHistoryEntryDto> recentPayments;
}
