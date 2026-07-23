import api from './api';

// Everything the superadmin dashboard needs — cross-tenant, unlike every
// other file in lib/, which always operates on the logged-in user's own
// account. Every call here hits /api/v1/superadmin/**, which the backend
// restricts to ROLE_SUPERADMIN regardless of what the frontend does.

export interface TenantSummary {
    id: number;
    name: string;
    email: string;
    slug: string;
    createdAt: string;
    subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'NONE';
    locked: boolean;
    trialEndDate: string | null;
    currentPeriodEnd: string | null;
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

export const overrideSubscription = async (
    tenantId: number,
    action: 'ACTIVATE' | 'SUSPEND',
    extendDays?: number
): Promise<TenantSummary> => {
    const res = await api.post(`/superadmin/tenants/${tenantId}/subscription`, { action, extendDays });
    return res.data;
};
