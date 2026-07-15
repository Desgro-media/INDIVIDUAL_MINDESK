"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Receipt, CheckCircle2, Clock, TrendingUp,
  CreditCard, Wallet, Building2, Banknote, X, Filter, ArrowDownCircle, Landmark, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import api from "../../../lib/api";
import MonthFilter, { monthKey, monthLabel } from "../../../components/MonthFilter";
import { SpotlightDiv } from "../../../components/Spotlight";

type Invoice = {
  id: number;
  appointmentId: number;
  patientId: number;
  patientName: string;
  patientEmail: string;
  sessionType?: string;
  appointmentDate: string;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  discountReason?: string;
  status: string;
  paymentMethod?: string;
  remark?: string;
  toAccount?: string;
  paidAt?: string;
  createdAt: string;
};

type RevenueSummary = {
  totalRevenue: number;
  outstanding: number;
  paidCount: number;
  unpaidCount: number;
  totalInvoices: number;
};

// Payment methods that go into the bank account (not cash, not insurance)
const BANK_METHODS = new Set(["CARD", "UPI", "MANUAL_TRANSFER"]);

const PAYMENT_METHODS = [
  { value: "CASH",            label: "Cash",          icon: Banknote },
  { value: "CARD",            label: "Card",          icon: CreditCard },
  { value: "UPI",             label: "UPI",           icon: Wallet },
  { value: "MANUAL_TRANSFER", label: "Bank Transfer", icon: Landmark },
  { value: "INSURANCE",       label: "Insurance",     icon: Building2 },
];

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  UNPAID: { color: "var(--warning)", bg: "var(--warning-bg)", label: "Unpaid" },
  PAID:   { color: "var(--success)", bg: "var(--success-bg)", label: "Paid"   },
  WAIVED: { color: "var(--text-2)", bg: "var(--sd)", label: "Waived" },
};

export default function BillingPage() {
  const [invoices, setInvoices]       = useState<Invoice[]>([]);
  const [summary, setSummary]         = useState<RevenueSummary | null>(null);
  const [services, setServices]       = useState<Record<string, string>>({});
  const [bankAccountName, setBankAccountName] = useState<string>("");
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<"ALL" | "UNPAID" | "PAID" | "WAIVED">("ALL");
  const [monthFilter, setMonthFilter] = useState<string | null>(null);

  const [payModal, setPayModal]       = useState<Invoice | null>(null);
  const [payMethod, setPayMethod]     = useState("CASH");
  const [discountInput, setDiscountInput] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [remarkInput, setRemarkInput] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [saving, setSaving]           = useState(false);


  const fetchData = () => {
    Promise.all([
      api.get("/invoices"),
      api.get("/invoices/summary"),
    ]).then(([invRes, sumRes]) => {
      setInvoices(invRes.data);
      setSummary(sumRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    api.get("/services").then(r => {
      const map: Record<string, string> = {};
      r.data.forEach((s: { id: number; name: string }) => { map[String(s.id)] = s.name; });
      setServices(map);
    }).catch(() => {});
    // Fetch bank account name from settings for the balance column header label
    api.get("/settings").then(r => {
      setBankAccountName(r.data?.bankAccountName || r.data?.bank_account_name || "");
    }).catch(() => {});
  }, []);

  // Transaction date — payment date when paid, otherwise appointment date.
  // Used for sorting, the running balance, AND the month filter so a row
  // always lands in the month of the money movement it represents.
  const txnDate = (inv: Invoice) =>
    inv.status === "PAID" && inv.paidAt ? inv.paidAt : inv.appointmentDate;

  // Shared sort key — transaction date, then id.
  // Used by BOTH the balance computation and the table display so they stay in sync.
  const sortKey = (inv: Invoice) => txnDate(inv) + String(inv.id).padStart(10, "0");

  // Resolve the "To" label for a given invoice.
  // Priority: backend-resolved toAccount (already has the saved bank name) → settings state → fallback
  const resolveToAccount = (inv: Invoice): string => {
    if (inv.status !== "PAID" || !inv.paymentMethod) return "—";
    if (inv.paymentMethod === "CASH") return "Cash in hand";
    if (inv.paymentMethod === "INSURANCE") return "Insurance";
    return inv.toAccount || bankAccountName || "Bank Account";
  };

  // Running balance — computed in ASC chronological order so bMap[id] = accumulated
  // totals AFTER that transaction. Display order is DESC (bank-statement style: newest
  // first), so the top row shows the current balance and it decreases reading downward.
  const balanceMap = (() => {
    const sorted = [...invoices].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    let cash = 0, bank = 0;
    const bMap: Record<number, { total: number; cash: number; bank: number }> = {};
    sorted.forEach(inv => {
      if (inv.status === "PAID" && inv.paymentMethod) {
        const amt = inv.finalAmount ?? 0;
        if (inv.paymentMethod === "CASH") cash += amt;
        else if (BANK_METHODS.has(inv.paymentMethod)) bank += amt;
      }
      bMap[inv.id] = { total: cash + bank, cash, bank };
    });
    return bMap;
  })();

  // Months (newest first) that have transactions, for the month filter
  const availableMonths = useMemo(
    () => Array.from(new Set(invoices.map(inv => monthKey(txnDate(inv))))).sort().reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices]
  );

  // Month filter applies to the visible rows, tab counts, footer totals and
  // summary cards. The running "Balance After Txn" column intentionally stays
  // global (all-time), like a bank statement filtered by period.
  const monthInvoices = monthFilter
    ? invoices.filter(inv => monthKey(txnDate(inv)) === monthFilter)
    : invoices;

  // Table rows — same chronological key, DESC so most-recent transaction is on top.
  const filtered = monthInvoices
    .filter(inv => filter === "ALL" ? true : inv.status === filter)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  // Footer totals — separate cash, bank, and insurance (within the selected month)
  const cashTotal = monthInvoices
    .filter(inv => inv.status === "PAID" && inv.paymentMethod === "CASH")
    .reduce((s, inv) => s + (inv.finalAmount ?? 0), 0);

  const bankTotal = monthInvoices
    .filter(inv => inv.status === "PAID" && BANK_METHODS.has(inv.paymentMethod ?? ""))
    .reduce((s, inv) => s + (inv.finalAmount ?? 0), 0);

  const insuranceTotal = monthInvoices
    .filter(inv => inv.status === "PAID" && inv.paymentMethod === "INSURANCE")
    .reduce((s, inv) => s + (inv.finalAmount ?? 0), 0);

  // Summary cards — server totals for all time; computed client-side when a
  // month is selected so the cards describe exactly the period on screen.
  const displaySummary: RevenueSummary | null = monthFilter
    ? {
        totalRevenue: monthInvoices
          .filter(inv => inv.status === "PAID")
          .reduce((s, inv) => s + (inv.finalAmount ?? 0), 0),
        outstanding: monthInvoices
          .filter(inv => inv.status === "UNPAID")
          .reduce((s, inv) => s + (inv.finalAmount ?? inv.amount ?? 0), 0),
        paidCount: monthInvoices.filter(inv => inv.status === "PAID").length,
        unpaidCount: monthInvoices.filter(inv => inv.status === "UNPAID").length,
        totalInvoices: monthInvoices.length,
      }
    : summary;

  const handleMarkPaid = async () => {
    if (!payModal) return;
    setDiscountError("");

    const discountVal = discountInput.trim() === "" ? 0 : parseFloat(discountInput);
    if (isNaN(discountVal) || discountVal < 0) {
      setDiscountError("Discount must be a positive number.");
      return;
    }
    if (discountVal > payModal.amount) {
      setDiscountError(`Discount cannot exceed the base fee of ${fmt(payModal.amount)}.`);
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { paymentMethod: payMethod };
      if (discountVal > 0) {
        body.discountAmount = discountVal.toString();
        if (discountReason.trim()) body.discountReason = discountReason.trim();
      }
      if (remarkInput.trim()) body.remark = remarkInput.trim();
      await api.patch(`/invoices/${payModal.id}/pay`, body);
      setPayModal(null);
      setDiscountInput("");
      setDiscountReason("");
      setRemarkInput("");
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleWaive = async (inv: Invoice) => {
    if (!confirm(`Waive invoice for ${inv.patientName}?`)) return;
    try {
      await api.patch(`/invoices/${inv.id}/waive`, {});
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const fmtDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

  // Bank label for the balance column header — prefer settings state, then first invoice's toAccount
  const bankLabel = bankAccountName
    || invoices.find(inv => inv.status === "PAID" && BANK_METHODS.has(inv.paymentMethod ?? ""))?.toAccount
    || "Bank Account";

  return (
    <div className="anim-fade-up" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em", marginBottom: 4 }}>
          Billing & Payments
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-3)" }}>Track session invoices and revenue</p>
      </div>

      {/* Summary Cards — reflect the selected month when one is chosen */}
      {displaySummary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {[
            { label: monthFilter ? `Revenue · ${monthLabel(monthFilter)}` : "Total Revenue", value: fmt(displaySummary.totalRevenue), icon: <TrendingUp />, badge: "icon-badge--success", color: "var(--success)" },
            { label: "Outstanding",     value: fmt(displaySummary.outstanding),  icon: <Clock />, badge: "icon-badge--warning", color: "var(--warning)" },
            { label: "Paid Sessions",   value: displaySummary.paidCount.toString(), icon: <CheckCircle2 />, badge: "icon-badge--accent", color: "var(--accent)" },
            { label: "Unpaid Invoices", value: displaySummary.unpaidCount.toString(), icon: <Receipt />, badge: "icon-badge--danger", color: "var(--danger)" },
          ].map((card, i) => (
            <SpotlightDiv key={card.label} className={`soft-card card-hover anim-fade-up d${i + 1}`} style={{ padding: "24px 20px" }}>
              <span className="soft-card-watermark" aria-hidden="true" style={{ width: 76, height: 76, right: 10, bottom: 6 }}>
                {card.icon}
              </span>
              <div className={`icon-badge ${card.badge}`} style={{ marginBottom: 16 }}>
                {card.icon}
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {card.label}
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>
                {loading ? "—" : card.value}
              </p>
            </SpotlightDiv>
          ))}
        </div>
      )}

      {/* Bank name not configured — show only when there are bank payments but no name set */}
      {!bankAccountName && invoices.some(inv => inv.status === "PAID" && BANK_METHODS.has(inv.paymentMethod ?? "")) && (
        <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 20px", borderRadius: 16,
            background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)",
            cursor: "pointer",
          }}>
            <AlertTriangle style={{ width: 16, height: 16, color: "#d97706", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#d97706" }}>Bank account name not configured</span>
              <span style={{ fontSize: 12, color: "#92400e", marginLeft: 8 }}>
                Billing shows "Bank Account" instead of your account name. Click here to set it in Settings → Payment & Banking.
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Filter Tabs + Table */}
      <div className="soft-card anim-fade-up d5" style={{ overflow: "hidden" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "16px 20px", borderBottom: "1px solid rgba(180,185,210,0.2)", alignItems: "center", flexWrap: "wrap" }}>
          <Filter style={{ width: 16, height: 16, color: "var(--text-3)", marginRight: 8 }} />
          {(["ALL", "UNPAID", "PAID", "WAIVED"] as const).map(tab => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`tab-pill${filter === tab ? " active" : " nm-raised-sm"}`}
              style={{
                padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 12,
                background: filter === tab ? "var(--accent)" : "transparent",
                color: filter === tab ? "#fff" : "var(--text-2)",
                boxShadow: filter === tab ? "0 4px 14px rgba(79,110,247,0.38), inset 0 1px 0 rgba(255,255,255,0.20)" : undefined,
              }}>
              {tab}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <MonthFilter months={availableMonths} value={monthFilter} onChange={setMonthFilter} />
            <span style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>
              {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skel" style={{ height: 44, width: "100%", borderRadius: 12 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Receipt style={{ width: 40, height: 40, color: "var(--text-3)", margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-3)", fontSize: 14 }}>
              {monthFilter ? `No invoices in ${monthLabel(monthFilter)}.` : "No invoices found."}
            </p>
            <p style={{ color: "var(--text-3)", fontSize: 12, marginTop: 4 }}>Invoices are auto-generated when sessions are marked as Completed.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(180,185,210,0.15)" }}>
                    {["Date", "Amount", "Type", "To", "From", "Session", "Remark", "Status", "Balance After Txn", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-3)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const st = STATUS_STYLE[inv.status] || STATUS_STYLE.UNPAID;
                    const isPaid = inv.status === "PAID";
                    const toLabel = resolveToAccount(inv);
                    const bal = balanceMap[inv.id];
                    const isBankPayment = isPaid && BANK_METHODS.has(inv.paymentMethod ?? "");
                    const isCashPayment = isPaid && inv.paymentMethod === "CASH";

                    return (
                      <tr key={inv.id} className="list-row"
                        style={{ borderBottom: "1px solid var(--glass-border-dim)" }}>

                        {/* Date */}
                        <td style={{ padding: "14px 16px", color: "var(--text-2)", whiteSpace: "nowrap" }}>
                          {fmtDate(inv.appointmentDate)}
                        </td>

                        {/* Amount */}
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          {inv.discountAmount > 0 ? (
                            <div>
                              <span style={{ fontWeight: 700, color: "var(--text-1)" }}>{fmt(inv.finalAmount)}</span>
                              <span style={{ fontSize: 11, color: "var(--text-3)", textDecoration: "line-through", marginLeft: 5 }}>{fmt(inv.amount)}</span>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 700, color: "var(--text-1)" }}>{fmt(inv.amount)}</span>
                          )}
                        </td>

                        {/* Type */}
                        <td style={{ padding: "14px 16px" }}>
                          {isPaid ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 12, color: "var(--success)" }}>
                              <ArrowDownCircle style={{ width: 14, height: 14 }} /> Cr
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* To */}
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          {isPaid ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              fontSize: 13, fontWeight: 700,
                              color: isBankPayment ? "var(--accent)" : isCashPayment ? "var(--success)" : "var(--text-2)",
                            }}>
                              {isBankPayment && <Landmark style={{ width: 13, height: 13 }} />}
                              {isCashPayment && <Banknote style={{ width: 13, height: 13 }} />}
                              {toLabel}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* From */}
                        <td style={{ padding: "14px 16px" }}>
                          <p style={{ fontWeight: 600, color: "var(--text-1)" }}>{inv.patientName}</p>
                          <p style={{ fontSize: 11, color: "var(--text-3)" }}>{inv.patientEmail}</p>
                        </td>

                        {/* Session */}
                        <td style={{ padding: "14px 16px", color: "var(--text-2)", fontSize: 12 }}>
                          {inv.sessionType ? (services[inv.sessionType] ?? inv.sessionType.replace(/_/g, " ")) : "—"}
                        </td>

                        {/* Remark */}
                        <td style={{ padding: "14px 16px", fontSize: 12, maxWidth: 130 }}>
                          {inv.remark ? (
                            <span title={inv.remark} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-2)" }}>
                              {inv.remark}
                            </span>
                          ) : inv.discountReason ? (
                            <span style={{ color: "var(--success)", fontSize: 11 }}>↓ {inv.discountReason}</span>
                          ) : (
                            <span style={{ color: "var(--text-3)" }}>—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "4px 10px", borderRadius: 8, background: st.bg, color: st.color, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>
                            {st.label}
                          </span>
                        </td>

                        {/* Balance after transactions — running per-account totals */}
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap", minWidth: 170 }}>
                          {bal ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {/* Bank account line */}
                              <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                                padding: "5px 9px", borderRadius: 8,
                                background: isPaid && isBankPayment ? "var(--accent-surface)" : "var(--card-2)",
                                border: isPaid && isBankPayment ? "1px solid var(--accent-border)" : "1px solid var(--card-border)",
                              }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                                  <Landmark style={{ width: 10, height: 10 }} />
                                  {bankLabel}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: bal.bank > 0 ? "var(--accent)" : "var(--text-3)" }}>
                                  {fmt(bal.bank)}
                                </span>
                              </div>
                              {/* Cash in hand line */}
                              <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                                padding: "5px 9px", borderRadius: 8,
                                background: isPaid && isCashPayment ? "var(--success-bg)" : "var(--card-2)",
                                border: isPaid && isCashPayment ? "1px solid var(--success-brd)" : "1px solid var(--card-border)",
                              }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--success)", fontWeight: 600 }}>
                                  <Banknote style={{ width: 10, height: 10 }} />
                                  Cash in hand
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: bal.cash > 0 ? "var(--success)" : "var(--text-3)" }}>
                                  {fmt(bal.cash)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 16px" }}>
                          {inv.status === "UNPAID" && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                              <button
                                onClick={() => { setPayModal(inv); setPayMethod("CASH"); setDiscountInput(""); setDiscountReason(""); setRemarkInput(""); setDiscountError(""); }}
                                className="btn-nm"
                                style={{ padding: "6px 12px", fontSize: 11, gap: 4 }}>
                                <CheckCircle2 style={{ width: 13, height: 13 }} /> Mark Paid
                              </button>
                              <button
                                onClick={() => handleWaive(inv)}
                                style={{ padding: "6px 10px", borderRadius: 10, border: "none", cursor: "pointer", color: "var(--text-3)", fontWeight: 600, fontSize: 11, background: "transparent", whiteSpace: "nowrap" }}>
                                Waive
                              </button>
                            </div>
                          )}
                          {inv.status !== "UNPAID" && (
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                              {inv.paidAt ? fmtDate(inv.paidAt) : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Balance After Transactions Footer ── */}
            {(cashTotal > 0 || bankTotal > 0 || insuranceTotal > 0) && (
              <div style={{ borderTop: "2px solid var(--card-border)" }}>
                <div style={{ padding: "8px 20px 6px", background: "var(--accent-surface)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {monthFilter ? `Collected in ${monthLabel(monthFilter)}` : "Balance after transactions"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
                  {bankTotal > 0 && (
                    <div style={{
                      flex: 1, minWidth: 180, padding: "16px 24px",
                      borderRight: "1px solid var(--card-border)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div className="icon-badge icon-badge--accent" style={{ width: 32, height: 32, borderRadius: 10 }}>
                          <Landmark style={{ width: 15, height: 15 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{bankLabel}</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>{fmt(bankTotal)}</p>
                      <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>Card · UPI · Bank Transfer</p>
                    </div>
                  )}
                  {cashTotal > 0 && (
                    <div style={{
                      flex: 1, minWidth: 180, padding: "16px 24px",
                      borderRight: insuranceTotal > 0 ? "1px solid var(--card-border)" : undefined,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div className="icon-badge icon-badge--success" style={{ width: 32, height: 32, borderRadius: 10 }}>
                          <Banknote style={{ width: 15, height: 15 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Cash in hand</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "var(--success)", lineHeight: 1 }}>{fmt(cashTotal)}</p>
                      <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>Cash payments received</p>
                    </div>
                  )}
                  {insuranceTotal > 0 && (
                    <div style={{ flex: 1, minWidth: 180, padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div className="icon-badge" style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(107,114,128,0.12)", color: "#6b7280" }}>
                          <Building2 style={{ width: 15, height: 15 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Insurance</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "#6b7280", lineHeight: 1 }}>{fmt(insuranceTotal)}</p>
                      <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>Insurance claims received</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pay Modal */}
      {payModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="overlay-enter" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setPayModal(null)} />
          <div className="soft-card anim-scale-in" style={{ position: "relative", padding: 32, width: 420, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setPayModal(null)} className="icon-btn"
              style={{ position: "absolute", top: 16, right: 16 }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", marginBottom: 4 }}>Mark as Paid</h3>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}>
              {payModal.patientName} — Base fee: {fmt(payModal.amount)}
            </p>

            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 12 }}>Payment Method</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
              {PAYMENT_METHODS.map(m => (
                <button key={m.value} onClick={() => setPayMethod(m.value)}
                  className="soft-card-2 card-hover"
                  style={{
                    padding: "12px 8px",
                    border: `2px solid ${payMethod === m.value ? "var(--accent)" : "transparent"}`,
                    background: payMethod === m.value ? "var(--accent-surface)" : "var(--card-2)",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    color: payMethod === m.value ? "var(--accent)" : "var(--text-2)",
                    fontWeight: 600, fontSize: 11,
                  }}>
                  <m.icon style={{ width: 18, height: 18 }} />
                  {m.label}
                  {/* Show which account it goes to */}
                  {m.value !== "CASH" && m.value !== "INSURANCE" && bankAccountName && (
                    <span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500 }}>→ {bankAccountName}</span>
                  )}
                  {m.value === "CASH" && (
                    <span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500 }}>→ Cash in hand</span>
                  )}
                </button>
              ))}
            </div>

            {/* Remark */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 8 }}>Remark (Optional)</p>
            <input
              type="text"
              placeholder='e.g. "followup", "advance", "session 2 of 4"'
              value={remarkInput}
              onChange={e => setRemarkInput(e.target.value)}
              className="nm-input no-icon"
              style={{ marginBottom: 20 }}
            />

            {/* Discount */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 12 }}>Discount (Optional)</p>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number" min="0" step="any"
                  placeholder="₹ 0"
                  value={discountInput}
                  onChange={e => { setDiscountInput(e.target.value); setDiscountError(""); }}
                  className="nm-input no-icon"
                />
              </div>
              <div style={{ flex: 2 }}>
                <input
                  type="text"
                  placeholder='e.g. "Follow-up discount"'
                  value={discountReason}
                  onChange={e => setDiscountReason(e.target.value)}
                  className="nm-input no-icon"
                />
              </div>
            </div>
            {discountError && <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}>{discountError}</p>}
            {discountInput && !discountError && parseFloat(discountInput) > 0 && parseFloat(discountInput) <= payModal.amount && (
              <p style={{ fontSize: 12, color: "var(--success)", marginBottom: 16 }}>
                Patient pays: <strong>{fmt(payModal.amount - parseFloat(discountInput))}</strong>
              </p>
            )}

            <button onClick={handleMarkPaid} disabled={saving} className="btn-nm-accent"
              style={{ width: "100%", padding: "14px", marginTop: 8 }}>
              <CheckCircle2 style={{ width: 18, height: 18 }} />
              {saving ? "Saving..." : "Confirm Payment"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}