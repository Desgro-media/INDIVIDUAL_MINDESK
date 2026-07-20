"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck, Clock, CalendarClock, IndianRupee, QrCode,
  CheckCircle2, XCircle, Hourglass, Lock, Send, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSubscriptionStatus, getPaymentSubmissions, submitPayment,
  SubscriptionStatus, PaymentSubmission,
} from "../../../lib/subscriptionApi";
import { SpotlightDiv } from "../../../components/Spotlight";

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  TRIALING:  { color: "var(--accent)",  bg: "var(--accent-surface)", label: "Free Trial" },
  ACTIVE:    { color: "var(--success)", bg: "var(--success-bg)",     label: "Active" },
  EXPIRED:   { color: "var(--danger)",  bg: "rgba(239,68,68,0.10)",  label: "Expired" },
  CANCELLED: { color: "var(--text-3)",  bg: "var(--sd)",             label: "Suspended" },
};

const SUBMISSION_STYLE: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  PENDING:  { color: "var(--warning)", bg: "var(--warning-bg)", icon: Hourglass, label: "Pending Review" },
  APPROVED: { color: "var(--success)", bg: "var(--success-bg)", icon: CheckCircle2,  label: "Approved" },
  REJECTED: { color: "var(--danger)",  bg: "rgba(239,68,68,0.10)", icon: XCircle,     label: "Rejected" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function SubscriptionPage() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const [upiRef, setUpiRef] = useState("");
  const [amount, setAmount] = useState("9999");
  const [screenshot, setScreenshot] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    Promise.all([getSubscriptionStatus(), getPaymentSubmissions()])
      .then(([s, subs]) => { setStatus(s); setSubmissions(subs); })
      .catch(() => toast.error("Failed to load subscription status"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!upiRef.trim()) { toast.error("Enter the UPI transaction reference (UTR)"); return; }
    setSubmitting(true);
    try {
      await submitPayment({
        upiTransactionRef: upiRef.trim(),
        amountClaimed: amount ? parseFloat(amount) : undefined,
        screenshotBase64: screenshot || undefined,
      });
      toast.success("Submitted — we'll verify and activate your subscription shortly.");
      setUpiRef("");
      setScreenshot("");
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !status) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {[0, 1, 2].map(i => <div key={i} className="skel" style={{ height: 90, width: "100%", borderRadius: 16 }} />)}
      </div>
    );
  }

  const st = STATUS_STYLE[status.status] || STATUS_STYLE.EXPIRED;
  const deadline = status.status === "TRIALING" ? status.trialEndDate : status.currentPeriodEnd;

  return (
    <div className="anim-fade-up" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em", marginBottom: 4 }}>
          Subscription
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-3)" }}>Manage your Mindesk plan and payment verification</p>
      </div>

      {status.locked && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 22px", borderRadius: 18,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
        }}>
          <Lock style={{ width: 20, height: 20, color: "var(--danger)", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>Your dashboard is locked</p>
            <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
              Your trial/subscription has ended. Pay via GPay/UPI below and submit your transaction reference —
              your dashboard unlocks as soon as it's verified. Your public booking page keeps working for patients in the meantime.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        <SpotlightDiv className="soft-card card-hover anim-fade-up d1" style={{ padding: "24px 20px" }}>
          <div className="icon-badge" style={{ marginBottom: 16, background: st.bg, color: st.color }}>
            <ShieldCheck />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Status</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.label}</p>
        </SpotlightDiv>

        <SpotlightDiv className="soft-card card-hover anim-fade-up d2" style={{ padding: "24px 20px" }}>
          <div className="icon-badge icon-badge--accent" style={{ marginBottom: 16 }}>
            <Clock />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Days Remaining</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>
            {status.daysRemaining != null ? status.daysRemaining : "—"}
          </p>
        </SpotlightDiv>

        <SpotlightDiv className="soft-card card-hover anim-fade-up d3" style={{ padding: "24px 20px" }}>
          <div className="icon-badge icon-badge--success" style={{ marginBottom: 16 }}>
            <CalendarClock />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            {status.status === "TRIALING" ? "Trial Ends" : "Renews On"}
          </p>
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", lineHeight: 1.2 }}>{fmtDate(deadline)}</p>
        </SpotlightDiv>

        <SpotlightDiv className="soft-card card-hover anim-fade-up d4" style={{ padding: "24px 20px" }}>
          <div className="icon-badge icon-badge--warning" style={{ marginBottom: 16 }}>
            <IndianRupee />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Plan</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", lineHeight: 1.2 }}>{fmtMoney(status.amount)} / year</p>
        </SpotlightDiv>
      </div>

      {/* Payment section */}
      <div className="soft-card anim-fade-up d5" style={{ padding: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", marginBottom: 4 }}>Pay via GPay / UPI</h3>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Pay {fmtMoney(status.amount)} to the UPI ID below, then submit your transaction reference (UTR) for verification.
        </p>

        {status.platformUpiId && (
          <div className="soft-card-2" style={{ borderRadius: 16, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
            {status.platformUpiQrBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={status.platformUpiQrBase64} alt="Payment QR" style={{ width: 72, height: 72, borderRadius: 10, background: "#fff", objectFit: "contain" }} />
            )}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>UPI ID</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)" }}>{status.platformUpiId}</p>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              UPI Transaction Ref (UTR) <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input className="nm-input no-icon" placeholder="e.g. 123456789012"
              value={upiRef} onChange={e => setUpiRef(e.target.value)} maxLength={100} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Amount Paid
            </label>
            <input className="nm-input no-icon" type="number" min="0" placeholder="9999"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
            Payment Screenshot (optional)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {screenshot ? (
              <div style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: "#fff", border: "1px solid var(--border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screenshot} alt="Payment screenshot" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                <button type="button" onClick={() => setScreenshot("")}
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, background: "var(--danger)", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: 11 }}>×</button>
              </div>
            ) : (
              <label style={{ width: 64, height: 64, borderRadius: 10, border: "2px dashed var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-3)", gap: 4 }}>
                <QrCode style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 9 }}>Upload</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleScreenshotUpload} />
              </label>
            )}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="btn-nm-accent" style={{ padding: "14px 28px" }}>
          {submitting ? <Loader2 style={{ width: 16, height: 16, animation: "spinSlow 1s linear infinite" }} /> : <Send style={{ width: 16, height: 16 }} />}
          {submitting ? "Submitting..." : "Submit for Verification"}
        </button>
      </div>

      {/* History */}
      <div className="soft-card anim-fade-up d6" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(180,185,210,0.2)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)" }}>Submission History</h3>
        </div>
        {submissions.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>No payment submissions yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(180,185,210,0.15)" }}>
                  {["Date", "UTR", "Amount", "Status", "Note"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-3)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => {
                  const ss = SUBMISSION_STYLE[sub.status] || SUBMISSION_STYLE.PENDING;
                  return (
                    <tr key={sub.id} className="list-row" style={{ borderBottom: "1px solid var(--glass-border-dim)" }}>
                      <td style={{ padding: "14px 16px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{fmtDate(sub.createdAt)}</td>
                      <td style={{ padding: "14px 16px", color: "var(--text-1)", fontWeight: 600 }}>{sub.upiTransactionRef}</td>
                      <td style={{ padding: "14px 16px", color: "var(--text-1)" }}>{fmtMoney(sub.amountClaimed)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: ss.bg, color: ss.color, fontWeight: 700, fontSize: 11 }}>
                          <ss.icon style={{ width: 12, height: 12 }} />
                          {ss.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-3)", fontSize: 12 }}>{sub.reviewNote || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
