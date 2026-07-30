import api from './api';

// Everything the superadmin dashboard needs — cross-tenant, unlike every
// other file in lib/, which always operates on the logged-in user's own
// account. Every call here hits /api/v1/superadmin/**, which the backend
// restricts to ROLE_SUPERADMIN regardless of what the frontend does.

// SCHEDULED = a paid window the superadmin set that hasn't begun yet: locked
// today, becomes ACTIVE on its own once the start date arrives.
export type SubscriptionStatus =
    'TRIALING' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'NONE';

export interface TenantSummary {
    id: number;
    name: string;
    email: string;
    slug: string;
    createdAt: string;
    subscriptionStatus: SubscriptionStatus;
    locked: boolean;
    trialEndDate: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    // Counts toward whichever deadline governs access right now: trial end
    // while TRIALING, period start while SCHEDULED, period end while ACTIVE.
    daysRemaining: number | null;
    accountType: 'INDIVIDUAL' | 'CLINIC';
    staffCount: number;
}

export interface PaymentSubmissionReview {
    id: number;
    psychologistId: number;
    psychologistName: string;
    psychologistEmail: string;
    upiTransactionRef: string;
    amountClaimed: number | null;
    screenshotBase64: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
}

// Recent Payment History row — same shape as PaymentSubmissionReview minus
// the screenshot (never needed once a submission isn't actively being
// reviewed), plus accountType so the history feed can badge clinic vs
// individual the same way the Tenants table does.
export interface PaymentHistoryEntry {
    id: number;
    psychologistId: number;
    psychologistName: string;
    psychologistEmail: string;
    accountType: 'INDIVIDUAL' | 'CLINIC';
    upiTransactionRef: string;
    amountClaimed: number | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
}

export interface SuperAdminDashboardStats {
    totalClinics: number;
    totalIndividuals: number;
    totalTenants: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    scheduledSubscriptions: number;
    expiredSubscriptions: number;
    cancelledSubscriptions: number;
    totalPayments: number;
    successfulPayments: number;
    pendingPayments: number;
    failedPayments: number;
    totalRevenue: number;
    recentPayments: PaymentHistoryEntry[];
}

export const listTenants = async (): Promise<TenantSummary[]> => {
    const res = await api.get('/superadmin/tenants');
    return res.data;
};

export const getDashboardStats = async (): Promise<SuperAdminDashboardStats> => {
    const res = await api.get('/superadmin/dashboard/stats');
    return res.data;
};

export const listTenantSubmissions = async (tenantId: number): Promise<PaymentSubmissionReview[]> => {
    const res = await api.get(`/superadmin/tenants/${tenantId}/payment-submissions`);
    return res.data;
};

export const listPendingSubmissions = async (): Promise<PaymentSubmissionReview[]> => {
    const res = await api.get('/superadmin/payment-submissions');
    return res.data;
};

export const approveSubmission = async (id: number): Promise<PaymentSubmissionReview> => {
    const res = await api.post(`/superadmin/payment-submissions/${id}/approve`);
    return res.data;
};

export const rejectSubmission = async (id: number, reason: string): Promise<PaymentSubmissionReview> => {
    const res = await api.post(`/superadmin/payment-submissions/${id}/reject`, { reason });
    return res.data;
};

// Fixed-duration presets derive the end date from the start; CUSTOM requires
// an explicit endDate. The backend recomputes all of this itself — nothing
// here is trusted, these are just the same rules mirrored for live preview.
export type PeriodPreset = 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR' | 'CUSTOM';

export interface SubscriptionOverride {
    action: 'ACTIVATE' | 'SUSPEND';
    preset?: PeriodPreset;
    /** yyyy-MM-dd. Omit to start at max(today, current period end). */
    startDate?: string;
    /** yyyy-MM-dd. Required when preset is CUSTOM. */
    endDate?: string;
    /** Legacy day-count path, only used when no preset is given. */
    extendDays?: number;
}

export const overrideSubscription = async (
    tenantId: number,
    override: SubscriptionOverride
): Promise<TenantSummary> => {
    const res = await api.post(`/superadmin/tenants/${tenantId}/subscription`, override);
    return res.data;
};
