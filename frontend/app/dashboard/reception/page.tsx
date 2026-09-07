"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Receipt, AlertTriangle, CalendarClock, CalendarCheck, Banknote, CreditCard,
  Wallet, Landmark, Building2, X, ChevronDown, ChevronUp, History,
} from "lucide-react";
import api from "../../../lib/api";

type Invoice = {
  id: number;
  appointmentId: number;
  patientId: number;
  patientName: string;
  patientEmail: string;
  sessionType?: string;
  mode?: string;
  appointmentDate: string; // YYYY-MM-DD
  amount: number;
  discountAmount?: number;
  finalAmount?: number;
  status: string; // UNPAID, PARTIALLY_PAID, PAID, WAIVED
  paymentHandledBy?: string; // SELF, RECEPTION
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
};

type PaymentEntry = {
  id: number;
  amount: number;
  paymentMethod?: string;
  bankAccountName?: string;
  remark?: string;
  paidAt: string;
};

type BankAccount = { id: number; accountName: string; bankName: string; isDefault: boolean; active: boolean };

const PAYMENT_METHODS = [
  { value: "CASH",            label: "Cash",          icon: Banknote },
  { value: "CARD",            label: "Card",          icon: CreditCard },
  { value: "UPI",             label: "UPI",           icon: Wallet },
  { value: "MANUAL_TRANSFER", label: "Bank Transfer", icon: Landmark },
  { value: "INSURANCE",       label: "Insurance",     icon: Building2 },
];
const BANK_METHODS = new Set(["CARD", "UPI", "MANUAL_TRANSFER"]);

type Bucket = "OVERDUE" | "TODAY" | "UPCOMING";

// Local wall-clock date, not UTC — a UTC-based cutoff would misclassify
// rows near midnight for any clinic east of Greenwich.
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const bucketOf = (inv: Invoice, todayStr: string): Bucket => {
  if (inv.appointmentDate < todayStr) return "OVERDUE";
  if (inv.appointmentDate === todayStr) return "TODAY";
  return "UPCOMING";
};

const BUCKET_META: Record<Bucket, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  OVERDUE:  { label: "Overdue",  color: "var(--danger)",  bg: "var(--danger-bg)",  icon: AlertTriangle },
  TODAY:    { label: "Today",    color: "var(--accent)",  bg: "var(--accent-surface)", icon: CalendarCheck },
  UPCOMING: { label: "Upcoming", color: "var(--text-3)",  bg: "var(--card-2)",     icon: CalendarClock },
};

export default function ReceptionPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<number, PaymentEntry[]>>({});
  const [historyLoading, setHistoryLoading] = useState<number | null>(null);

  const [collectModal, setCollectModal] = useState<Invoice | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("CASH");
  const [collectBankId, setCollectBankId] = useState<number | "">("");
  const [collectBankName, setCollectBankName] = useState("");
  const [collectRemark, setCollectRemark] = useState("");
  const [collectError, setCollectError] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStr = localToday();

  const fetchData = () => {
    setLoading(true);
    setLoadError(false);
    api.get("/invoices")
      .then(res => setInvoices(res.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    api.get("/bank-accounts").then(r => setBankAccounts(r.data)).catch(() => {});
  };

  useEffect(() => { fetchData(); }, []);

  // The pending-payments queue: only invoices the therapist explicitly
  // deferred to reception, and only ones still owing something.
  const pending = useMemo(
    () => invoices.filter(inv => inv.paymentHandledBy === "RECEPTION" && (inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID")),
    [invoices]
  );

  const buckets: Record<Bucket, Invoice[]> = { OVERDUE: [], TODAY: [], UPCOMING: [] };
  pending.forEach(inv => buckets[bucketOf(inv, todayStr)].push(inv));
  buckets.OVERDUE.sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
  buckets.TODAY.sort((a, b) => a.patientName.localeCompare(b.patientName));
  buckets.UPCOMING.sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  const fmtDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  const fmtDateTime = (dt: string) =>
    new Date(dt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const toggleHistory = (inv: Invoice) => {
    if (expandedId === inv.id) { setExpandedId(null); return; }
    setExpandedId(inv.id);
    if (!history[inv.id]) {
      setHistoryLoading(inv.id);
      api.get(`/invoices/${inv.id}/payments`)
        .then(r => setHistory(prev => ({ ...prev, [inv.id]: r.data })))
        .catch(() => setHistory(prev => ({ ...prev, [inv.id]: [] })))
        .finally(() => setHistoryLoading(null));
    }
  };

  const openCollectModal = (inv: Invoice) => {
    setCollectModal(inv);
    setCollectAmount(String(inv.balanceDue ?? inv.finalAmount ?? inv.amount));
    setCollectMethod("CASH");
    const defaultAcc = bankAccounts.find(b => b.isDefault) ?? bankAccounts[0] ?? null;
    setCollectBankId(defaultAcc?.id ?? "");
    setCollectBankName(defaultAcc?.accountName ?? "");
    setCollectRemark("");
    setCollectError("");
  };

  const handleCollect = async () => {
    if (!collectModal) return;
    setCollectError("");
    const val = parseFloat(collectAmount);
    const balance = collectModal.balanceDue ?? collectModal.finalAmount ?? collectModal.amount;
    if (isNaN(val) || val <= 0) { setCollectError("Enter a valid amount greater than ₹0."); return; }
    if (val > balance) { setCollectError(`Amount can't exceed the remaining balance of ${fmt(balance)}.`); return; }

    setSaving(true);
    try {
      const body: Record<string, string> = { amount: val.toString(), paymentMethod: collectMethod };
      if (BANK_METHODS.has(collectMethod) && collectBankId) {
        body.bankAccountId = String(collectBankId);
        body.bankAccountName = collectBankName;
      }
      if (collectRemark.trim()) body.remark = collectRemark.trim();
      await api.post(`/invoices/${collectModal.id}/payments`, body);
      setCollectModal(null);
      setHistory(prev => { const next = { ...prev }; delete next[collectModal.id]; return next; });
      fetchData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setCollectError(msg?.trim() ? msg : "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (inv: Invoice) => {
    const balance = inv.balanceDue ?? inv.finalAmount ?? inv.amount;
    const paidSoFar = inv.amountPaid ?? 0;
    const isPartial = inv.status === "PARTIALLY_PAID";
    const isExpanded = expandedId === inv.id;

    return (
      <div key={inv.id} className="soft-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", minWidth: 160 }}>
            <p style={{ fontWeight: 700, color: "var(--text-1)", fontSize: 14 }}>{inv.patientName}</p>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>{fmtDate(inv.appointmentDate)} · {inv.sessionType || "Session"}</p>
          </div>

          <div style={{ minWidth: 130 }}>
            {isPartial ? (
              <>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                  <span style={{ color: "var(--success)", fontWeight: 700 }}>{fmt(paidSoFar)}</span> collected
                </p>
                <p style={{ fontSize: 13, fontWeight: 800, color: "var(--warning)" }}>{fmt(balance)} due</p>
              </>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text-1)" }}>{fmt(balance)} due</p>
            )}
          </div>

          <span style={{
            padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
            background: isPartial ? "var(--warning-bg)" : "var(--danger-bg)",
            color: isPartial ? "var(--warning)" : "var(--danger)",
          }}>
            {isPartial ? "Partially Paid" : "Unpaid"}
          </span>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => toggleHistory(inv)} className="btn-nm" style={{ padding: "8px 12px", fontSize: 11, gap: 4 }}>
              <History style={{ width: 13, height: 13 }} />
              History {isExpanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
            </button>
            <button onClick={() => openCollectModal(inv)} className="btn-nm-accent" style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700 }}>
              Collect Payment
            </button>
          </div>
        </div>

        {isExpanded && (
          <div style={{ borderTop: "1px solid var(--glass-border-dim)", padding: "12px 18px", background: "var(--card-2)" }}>
            {historyLoading === inv.id ? (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>Loading…</p>
            ) : (history[inv.id]?.length ?? 0) === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>No payments collected yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history[inv.id].map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-2)" }}>
                    <span>{fmtDateTime(p.paidAt)} · {(p.paymentMethod || "").replace("_", " ")}{p.remark ? ` · ${p.remark}` : ""}</span>
                    <span style={{ fontWeight: 700, color: "var(--success)" }}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (bucket: Bucket) => {
    const rows = buckets[bucket];
    const meta = BUCKET_META[bucket];
    const Icon = meta.icon;
    return (
      <div key={bucket} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="icon-badge" style={{ width: 28, height: 28, background: meta.bg, color: meta.color }}>
            <Icon style={{ width: 15, height: 15 }} />
          </span>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>{meta.label}</h3>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>({rows.length})</span>
        </div>
        {rows.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-3)", padding: "4px 4px 8px" }}>Nothing here.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map(renderRow)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="anim-fade-up" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em", marginBottom: 4 }}>
          Pending Payments
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-3)" }}>
          Sessions a therapist scheduled and deliberately left for the front desk to collect payment for.
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2].map(i => <div key={i} className="skel" style={{ height: 64, width: "100%", borderRadius: 16 }} />)}
        </div>
      ) : loadError ? (
        <div className="soft-card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <AlertTriangle style={{ width: 40, height: 40, color: "var(--danger)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-2)", fontSize: 14, fontWeight: 600 }}>Couldn&apos;t load pending payments.</p>
          <button onClick={fetchData} className="btn-nm-accent" style={{ padding: "10px 20px", marginTop: 16 }}>Retry</button>
        </div>
      ) : pending.length === 0 ? (
        <div className="soft-card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Receipt style={{ width: 40, height: 40, color: "var(--text-3)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-3)", fontSize: 14 }}>Nothing waiting on the front desk right now.</p>
          <p style={{ color: "var(--text-3)", fontSize: 12, marginTop: 4 }}>
            Sessions show up here when a therapist picks &quot;Pass to Reception&quot; while scheduling.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {renderSection("OVERDUE")}
          {renderSection("TODAY")}
          {renderSection("UPCOMING")}
        </div>
      )}

      {/* Collect Payment Modal */}
      {collectModal && typeof document !== "undefined" && createPortal(
        <div className="overlay-enter" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 9999 }} onClick={() => setCollectModal(null)}>
          <div className="soft-card anim-scale-in" style={{ width: "100%", maxWidth: 420, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)" }}>Collect Payment</h3>
              <button onClick={() => setCollectModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
              {collectModal.patientName} · {fmt(collectModal.balanceDue ?? collectModal.finalAmount ?? collectModal.amount)} remaining
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>Amount Collected (₹)</label>
                <input type="number" className="nm-input" value={collectAmount} onChange={e => setCollectAmount(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, color: "var(--text-1)" }} />
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                  Enter less than the full balance to record a partial payment — the rest stays in this queue.
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>Payment Method</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} type="button" onClick={() => setCollectMethod(m.value)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 10,
                        border: `1.5px solid ${collectMethod === m.value ? "var(--accent)" : "transparent"}`,
                        background: collectMethod === m.value ? "var(--accent-surface)" : "var(--card-2)",
                        color: collectMethod === m.value ? "var(--accent)" : "var(--text-2)",
                        fontWeight: 600, fontSize: 11, cursor: "pointer",
                      }}>
                      <m.icon style={{ width: 12, height: 12 }} /> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {BANK_METHODS.has(collectMethod) && bankAccounts.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>Credited To</label>
                  <select className="nm-input" style={{ width: "100%", padding: "10px 12px", borderRadius: 12, color: "var(--text-1)" }}
                    value={collectBankId}
                    onChange={e => {
                      const acc = bankAccounts.find(b => b.id === Number(e.target.value));
                      setCollectBankId(acc ? acc.id : "");
                      setCollectBankName(acc ? acc.accountName : "");
                    }}>
                    <option value="">-- Select account --</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.accountName} — {b.bankName}{b.isDefault ? " (Default)" : ""}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>Remark (optional)</label>
                <input type="text" className="nm-input" value={collectRemark} onChange={e => setCollectRemark(e.target.value)}
                  placeholder="e.g. first installment"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, color: "var(--text-1)" }} />
              </div>

              {collectError && (
                <p style={{ fontSize: 12, color: "var(--danger)", background: "var(--danger-bg)", padding: "8px 12px", borderRadius: 10 }}>
                  {collectError}
                </p>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 22 }}>
              <button onClick={() => setCollectModal(null)} className="btn-nm" style={{ padding: "10px 20px", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleCollect} disabled={saving} className="btn-nm-accent" style={{ padding: "10px 20px", fontWeight: 700 }}>
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
