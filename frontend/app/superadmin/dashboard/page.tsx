"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, LogOut, Users, CheckCircle2, XCircle,
  X, Search, Ban, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../../lib/api";
import { clearSession } from "../../../lib/authSession";
import ThemeToggle from "../../../components/ThemeToggle";
import {
  listTenants, listPendingSubmissions, approveSubmission, rejectSubmission, overrideSubscription,
  TenantSummary, PaymentSubmissionReview,
} from "../../../lib/superAdminApi";

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  TRIALING:  { color: "var(--accent)",  bg: "var(--accent-surface)", label: "Trial" },
  ACTIVE:    { color: "var(--success)", bg: "var(--success-bg)",     label: "Active" },
  EXPIRED:   { color: "var(--danger)",  bg: "rgba(239,68,68,0.10)",  label: "Expired" },
  CANCELLED: { color: "var(--text-3)",  bg: "var(--sd)",             label: "Suspended" },
  NONE:      { color: "var(--text-3)",  bg: "var(--sd)",             label: "None" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [admin, setAdmin] = useState<any>(null);

  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [pending, setPending] = useState<PaymentSubmissionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmissionReview | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) { router.replace("/superadmin/login"); return; }
    api.get("/auth/me")
      .then(res => {
        if (res.data.role !== "ROLE_SUPERADMIN") { clearSession(); router.replace("/superadmin/login"); return; }
        setAdmin(res.data);
        setChecking(false);
      })
      .catch(() => { clearSession(); router.replace("/superadmin/login"); });
  }, [router]);

  const fetchData = () => {
    Promise.all([listTenants(), listPendingSubmissions()])
      .then(([t, p]) => { setTenants(t); setPending(p); })
      .catch(() => toast.error("Failed to load superadmin data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (!checking) fetchData(); }, [checking]);

  const handleLogout = () => { clearSession(); router.push("/superadmin/login"); };

  const handleApprove = async (submissionId: number) => {
    setBusyId(submissionId);
    try {
      await approveSubmission(submissionId);
      toast.success("Payment approved — subscription activated");
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) { toast.error("Enter a reason"); return; }
    setBusyId(rejectTarget.id);
    try {
      await rejectSubmission(rejectTarget.id, rejectReason.trim());
      toast.success("Submission rejected");
      setRejectTarget(null);
      setRejectReason("");
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  const handleOverride = async (tenantId: number, action: "ACTIVATE" | "SUSPEND") => {
    if (!confirm(`${action === "ACTIVATE" ? "Activate" : "Suspend"} this tenant's subscription?`)) return;
    setBusyId(tenantId);
    try {
      await overrideSubscription(tenantId, action, action === "ACTIVATE" ? 365 : undefined);
      toast.success(action === "ACTIVATE" ? "Activated" : "Suspended");
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update");
    } finally {
      setBusyId(null);
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      if (statusFilter !== "ALL" && t.subscriptionStatus !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tenants, statusFilter, search]);

  if (checking || !admin) return <div style={{ minHeight: "100vh" }} />;

  return (
    <div style={{ minHeight: "100vh", padding: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="icon-badge icon-badge--danger" style={{ width: 40, height: 40 }}>
            <ShieldCheck style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)" }}>Superadmin</h1>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>{admin.username}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <button onClick={handleLogout} className="btn-nm" style={{ padding: "10px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut style={{ width: 14, height: 14 }} /> Logout
          </button>
        </div>
      </header>

      {/* Pending payment review queue */}
      <div className="soft-card anim-fade-up" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", marginBottom: 4 }}>Pending Payment Reviews</h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>Manually verify GPay/UPI payments submitted by practitioners.</p>

        {loading ? (
          <div className="skel" style={{ height: 60, borderRadius: 12 }} />
        ) : pending.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "20px 0" }}>Nothing pending review.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map(sub => (
              <div key={sub.id} className="soft-card-2" style={{ padding: 16, borderRadius: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                {sub.screenshotBase64 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.screenshotBase64} alt="Payment proof" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", background: "#fff", border: "1px solid var(--border)", cursor: "pointer" }}
                    onClick={() => window.open(sub.screenshotBase64!, "_blank", "noopener,noreferrer")} />
                )}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{sub.psychologistName}</p>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>{sub.psychologistEmail}</p>
                </div>
                <div style={{ minWidth: 140 }}>
                  <p style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>UTR</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{sub.upiTransactionRef}</p>
                </div>
                <div style={{ minWidth: 100 }}>
                  <p style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>Amount</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{fmtMoney(sub.amountClaimed)}</p>
                </div>
                <div style={{ minWidth: 90 }}>
                  <p style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>Submitted</p>
                  <p style={{ fontSize: 13, color: "var(--text-2)" }}>{fmtDate(sub.createdAt)}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={busyId === sub.id} onClick={() => handleApprove(sub.id)} className="btn-nm-accent" style={{ padding: "8px 16px", fontSize: 12 }}>
                    <CheckCircle2 style={{ width: 14, height: 14 }} /> Approve
                  </button>
                  <button disabled={busyId === sub.id} onClick={() => { setRejectTarget(sub); setRejectReason(""); }} className="btn-nm" style={{ padding: "8px 16px", fontSize: 12, color: "var(--danger)" }}>
                    <XCircle style={{ width: 14, height: 14 }} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tenant list */}
      <div className="soft-card anim-fade-up" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(180,185,210,0.2)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Users style={{ width: 16, height: 16, color: "var(--text-3)" }} />
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)" }}>Tenants ({tenants.length})</h2>
          <div className="header-search" style={{ maxWidth: 260 }}>
            <Search style={{ width: 14, height: 14, color: "var(--text-3)" }} />
            <input placeholder="Search name, email, slug..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["ALL", "TRIALING", "ACTIVE", "EXPIRED", "CANCELLED"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`tab-pill${statusFilter === s ? " active" : " nm-raised-sm"}`}
                style={{ padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 11,
                  background: statusFilter === s ? "var(--accent)" : "transparent", color: statusFilter === s ? "#fff" : "var(--text-2)" }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}><div className="skel" style={{ height: 200, borderRadius: 12 }} /></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(180,185,210,0.15)" }}>
                  {["Name", "Email", "Slug", "Status", "Days Left", "Ends/Renews", "Joined", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-3)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(t => {
                  const st = STATUS_STYLE[t.subscriptionStatus] || STATUS_STYLE.NONE;
                  return (
                    <tr key={t.id} className="list-row" style={{ borderBottom: "1px solid var(--glass-border-dim)" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-1)" }}>{t.name}</td>
                      <td style={{ padding: "14px 16px", color: "var(--text-2)" }}>{t.email}</td>
                      <td style={{ padding: "14px 16px", color: "var(--text-3)", fontSize: 12 }}>{t.slug}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 8, background: st.bg, color: st.color, fontWeight: 700, fontSize: 11 }}>
                          {t.locked ? "🔒 " : ""}{st.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-2)" }}>{t.daysRemaining ?? "—"}</td>
                      <td style={{ padding: "14px 16px", color: "var(--text-2)", whiteSpace: "nowrap" }}>
                        {fmtDate(t.subscriptionStatus === "TRIALING" ? t.trialEndDate : t.currentPeriodEnd)}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-3)", whiteSpace: "nowrap" }}>{fmtDate(t.createdAt)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button disabled={busyId === t.id} onClick={() => handleOverride(t.id, "ACTIVATE")}
                            title="Manually activate for 1 year" className="icon-btn" style={{ color: "var(--success)" }}>
                            <PlayCircle style={{ width: 15, height: 15 }} />
                          </button>
                          <button disabled={busyId === t.id} onClick={() => handleOverride(t.id, "SUSPEND")}
                            title="Suspend access" className="icon-btn" style={{ color: "var(--danger)" }}>
                            <Ban style={{ width: 15, height: 15 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setRejectTarget(null)} />
          <div className="soft-card anim-scale-in" style={{ position: "relative", padding: 28, width: 400, maxWidth: "90vw" }}>
            <button onClick={() => setRejectTarget(null)} className="icon-btn" style={{ position: "absolute", top: 14, right: 14 }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", marginBottom: 4 }}>Reject Payment</h3>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>{rejectTarget.psychologistName} — {rejectTarget.upiTransactionRef}</p>
            <textarea
              className="nm-input no-icon"
              placeholder="Reason (shown to the practitioner)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              style={{ width: "100%", marginBottom: 16, resize: "vertical" }}
            />
            <button onClick={handleReject} disabled={busyId === rejectTarget.id} className="btn-nm-accent" style={{ width: "100%", padding: 12 }}>
              Confirm Rejection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
