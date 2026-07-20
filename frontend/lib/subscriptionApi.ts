import api from './api';

// The logged-in practitioner's own platform subscription — trial/paid status
// and payment-proof submissions. Always operates on the caller's own account.

export interface SubscriptionStatus {
    status: 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    locked: boolean;
    plan: string;
    amount: number;
    trialStartDate: string | null;
    trialEndDate: string | null;
    currentPeriodEnd: string | null;
    daysRemaining: number | null;
    platformUpiId: string | null;
    platformUpiQrBase64: string | null;
}

export interface PaymentSubmission {
    id: number;
    upiTransactionRef: string;
    amountClaimed: number | null;
    hasScreenshot: boolean;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
}

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
    const res = await api.get('/subscription/me');
    return res.data;
};

export const getPaymentSubmissions = async (): Promise<PaymentSubmission[]> => {
    const res = await api.get('/subscription/payment-submissions');
    return res.data;
};

export const submitPayment = async (data: {
    upiTransactionRef: string;
    screenshotBase64?: string;
    amountClaimed?: number;
}): Promise<PaymentSubmission> => {
    const res = await api.post('/subscription/payment-submissions', data);
    return res.data;
};
