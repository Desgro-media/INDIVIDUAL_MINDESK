"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, LogOut, Users, CheckCircle2, XCircle,
  X, Search, Ban, PlayCircle, Building2, User,
  IndianRupee, ListChecks, Clock, History,
  LayoutDashboard, Repeat, Receipt, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../../lib/api";
import { clearSession } from "../../../lib/authSession";
import ThemeToggle from "../../../components/ThemeToggle";
import { SpotlightDiv } from "../../../components/Spotlight";
import { useCountUp } from "../../../lib/chartTheme";
import {
  listTenants, listPendingSubmissions, approveSubmission, rejectSubmission, overrideSubscription,
  getDashboardStats,
  TenantSummary, PaymentSubmissionReview, SuperAdminDashboardStats,
} from "../../../lib/superAdminApi";

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  TRIALING:  { color: "var(--accent)",  bg: "var(--accent-surface)", label: "Trial" },
  ACTIVE:    { color: "var(--success)", bg: "var(--success-bg)",     label: "Active" },
  EXPIRED:   { color: "var(--danger)",  bg: "rgba(239,68,68,0.10)",  label: "Expired" },
  CANCELLED: { color: "var(--text-3)",  bg: "var(--sd)",             label: "Suspended" },
  NONE:      { color: "var(--text-3)",  bg: "var(--sd)",             label: "None" },
};

// PaymentSubmission.status (PENDING/APPROVED/REJECTED) rendered with the
// Successful/Pending/Failed labels the superadmin update asked for — same
// three-state model as STATUS_STYLE above, just a different vocabulary
// since payments and subscriptions are different lifecycles.
const PAYMENT_STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  APPROVED: { color: "var(--success)", bg: "var(--success-bg)",    label: "Successful" },
  PENDING:  { color: "var(--warning)", bg: "var(--warning-bg)",    label: "Pending" },
  REJECTED: { color: "var(--danger)",  bg: "rgba(239,68,68,0.10)", label: "Failed" },
};

// Visual indicator distinguishing a solo freelancer from a multi-staff
// clinic tenant — at a glance in the tenant table, and repeated (with staff
// count) in the tenant detail context.
function AccountTypeBadge({ accountType, staffCount }: { accountType: 'INDIVIDUAL' | 'CLINIC'; staffCount: number }) {
  const isClinic = accountType === "CLINIC";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 8, fontWeight: 700, fontSize: 11,
      background: isClinic ? "rgba(139,92,246,0.12)" : "var(--sd)",
      color: isClinic ? "#8b5cf6" : "var(--text-3)",
      whiteSpace: "nowrap",
    }}>
      {isClinic ? <Building2 style={{ width: 11, height: 11 }} /> : <User style={{ width: 11, height: 11 }} />}
      {isClinic ? `Clinic${staffCount > 0 ? ` · ${staffCount}` : ""}` : "Individual"}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// Cycles through the app's 6 mount-time stagger delays (see .d1–.d6 in
// globals.css) so tiles within a row pop in left-to-right instead of all
// at once — same "cascade on mount" convention the main dashboard uses.
function delayClass(i: number): string {
  return `d${(i % 6) + 1}`;
}

const HERO_GRID_STYLE: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16,
};
const STAT_GRID_STYLE: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14,
};

// A small colored icon-badge + title/subtitle pair, reused across every
// section on this page (stat rows and the table cards below them) so the
// whole dashboard reads as one system instead of ad hoc headers per section.
function SectionHeading({
  icon, title, subtitle, variant = "accent",
}: {
  icon: React.ReactNode; title: React.ReactNode; subtitle?: string;
  variant?: "accent" | "success" | "warning" | "danger" | "pink";
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div className={`icon-badge icon-badge--${variant}`} style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)" }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// The 4 headline KPIs (Dashboard Statistics row) — full gradient hero
// treatment matching the main dashboard's grad-card tiles: mesh texture,
// oversized watermark icon, on-glass icon badge. Optionally clickable to
// jump straight to the table that backs the number.
function HeroStatTile({
  icon, label, value, active, gradient, money = false, caption, onClick, index,
}: {
  icon: React.ReactNode; label: string; value: number; active: boolean;
  gradient: 1 | 2 | 3 | 4; money?: boolean; caption?: string; onClick?: () => void; index: number;
}) {
  const animated = useCountUp(value, active);
  return (
    <SpotlightDiv
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`grad-card grad-card--${gradient} card-hover anim-fade-up ${delayClass(index)}`}
      style={{ cursor: onClick ? "pointer" : "default", display: "flex", flexDirection: "column" }}
    >
      <span className="grad-card-mesh" aria-hidden="true" />
      <span className="grad-card-watermark" aria-hidden="true" style={{ width: 92, height: 92, right: -18, bottom: -20, transform: "rotate(-12deg)" }}>
        {icon}
      </span>
      <div className="icon-badge icon-badge--on-grad">{icon}</div>
      <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, marginTop: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, marginTop: 3, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {money ? fmtMoney(animated) : animated.toLocaleString("en-IN")}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 14 }}>
        <span style={{ fontSize: 11, opacity: 0.85 }}>{caption}</span>
        {onClick && <span className="circle-icon-btn"><ArrowUpRight /></span>}
      </div>
    </SpotlightDiv>
  );
}

// Track/fill tint per variant — same token the tile's own icon-badge uses,
// so the bar reads as "this card's color, just as a meter" rather than an
// unrelated accent.
const METER_TRACK_BG: Record<string, string> = {
  accent: "var(--accent-surface)", success: "var(--success-bg)",
  warning: "var(--warning-bg)", danger: "rgba(239,68,68,0.10)", pink: "var(--pink-bg)",
};
const METER_FILL_COLOR: Record<string, string> = {
  accent: "var(--accent)", success: "var(--success)",
  warning: "var(--warning)", danger: "var(--danger)", pink: "var(--pink)",
};

// Secondary breakdown numbers (Subscriptions / Payments rows) — a calmer
// soft-card treatment (not full gradient, so the hero row above keeps top
// billing), following the same icon-badge + label + progress-meter shape as
// the main dashboard's "Progress row" cards for a consistent visual system.
// The share-of-total reads off the meter instead of a floating percentage
// chip — the earlier chip sat in the same bottom-right corner as the
// watermark icon and visibly collided with it.
function BreakdownTile({
  icon, label, value, active, variant = "accent", percentOf, unit, onClick, index, barsIn,
}: {
  icon: React.ReactNode; label: string; value: number; active: boolean;
  variant?: "accent" | "success" | "warning" | "danger" | "pink";
  percentOf?: number; unit: string; onClick?: () => void; index: number; barsIn: boolean;
}) {
  const animated = useCountUp(value, active);
  const total = percentOf ?? 0;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <SpotlightDiv
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`soft-card card-hover anim-fade-up ${delayClass(index)}`}
      style={{ padding: 20, position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default" }}
    >
      <span className="soft-card-watermark" aria-hidden="true" style={{ width: 74, height: 74, right: -12, bottom: -14, transform: "rotate(-10deg)" }}>
        {icon}
      </span>
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div className={`icon-badge icon-badge--${variant}`} style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {animated.toLocaleString("en-IN")}
        </span>
      </div>
      <p style={{ position: "relative", fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{label}</p>
      <p style={{ position: "relative", fontSize: 11, color: "var(--text-3)", marginTop: 2, marginBottom: 14 }}>
        {total > 0 ? `${value} of ${total} ${unit}` : `No ${unit} yet`}
      </p>
      <div className="meter-track" style={{ position: "relative", background: METER_TRACK_BG[variant] }}>
        <div className="meter-fill" style={{ width: barsIn ? `${pct}%` : "0%", background: METER_FILL_COLOR[variant] }} />
      </div>
      <p style={{ position: "relative", textAlign: "right", fontSize: 12, fontWeight: 800, marginTop: 6, color: "var(--text-1)" }}>{pct}%</p>
    </SpotlightDiv>
  );
}

function StatSkeletonGrid({ count, tall = false, style = STAT_GRID_STYLE }: { count: number; tall?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skel" style={{ height: tall ? 148 : 78, borderRadius: tall ? 26 : 24 }} />
      ))}
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [admin, setAdmin] = useState<any>(null);

  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [pending, setPending] = useState<PaymentSubmissionReview[]>([]);
  const [stats, setStats] = useState<SuperAdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tenantTab, setTenantTab] = useState<"ALL" | "CLINIC" | "INDIVIDUAL">("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("ALL");
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmissionReview | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [barsIn, setBarsIn] = useState(false);

  const tenantSectionRef = useRef<HTMLDivElement>(null);
  const historySectionRef = useRef<HTMLDivElement>(null);

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
    Promise.all([listTenants(), listPendingSubmissions(), getDashboardStats()])
      .then(([t, p, s]) => { setTenants(t); setPending(p); setStats(s); })
      .catch(() => toast.error("Failed to load superadmin data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (!checking) fetchData(); }, [checking]);

  // Let the breakdown meters mount at width 0, then transition to their real
  // value — same "paint blank, then fill" idiom the practitioner dashboard's
  // Progress row uses, so the bars visibly animate in rather than snapping
  // straight to their final width.
  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setBarsIn(true)));
    return () => cancelAnimationFrame(raf);
  }, [loading]);

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

  // Jumps to the Tenant Management table with an exact filter combination —
  // always resets the OTHER two filters (never just adds one on top of
  // whatever was already set) so the row count that lands always matches
  // the number the user just clicked, with nothing stale hiding rows.
  const goToTenants = (opts: { tab?: "ALL" | "CLINIC" | "INDIVIDUAL"; status?: string }) => {
    setTenantTab(opts.tab ?? "ALL");
    setStatusFilter(opts.status ?? "ALL");
    setSearch("");
    tenantSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Recent Payment History only ever holds the last 20 submissions (see
  // getDashboardStats on the backend) — never enough to be "every Successful
  // payment ever", so this only scrolls there and optionally narrows what's
  // already visible. It deliberately does NOT claim to show "all N" of a
  // status; the section header says "recent" for exactly this reason.
  const goToHistory = (status: string) => {
    setHistoryStatusFilter(status);
    historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      if (tenantTab !== "ALL" && t.accountType !== tenantTab) return false;
      if (statusFilter !== "ALL" && t.subscriptionStatus !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tenants, statusFilter, search, tenantTab]);

  // Counts derived straight from the same `tenants` array the table renders
  // (not from `stats`) so the tab pills can never disagree with what's
  // actually in the table, even for an instant between the two responses.
  const clinicCount = useMemo(() => tenants.filter(t => t.accountType === "CLINIC").length, [tenants]);
  const individualCount = useMemo(() => tenants.filter(t => t.accountType === "INDIVIDUAL").length, [tenants]);
  const tenantSectionTitle =
    tenantTab === "CLINIC" ? "Clinic Management" :
    tenantTab === "INDIVIDUAL" ? "Individual User Management" :
    "Tenant Management";

  const recentPayments = useMemo(() => stats?.recentPayments ?? [], [stats]);
  const filteredHistory = useMemo(() => (
    historyStatusFilter === "ALL" ? recentPayments : recentPayments.filter(p => p.status === historyStatusFilter)
  ), [recentPayments, historyStatusFilter]);
  const historyTabCounts = useMemo(() => ({
    ALL: recentPayments.length,
    APPROVED: recentPayments.filter(p => p.status === "APPROVED").length,
    PENDING: recentPayments.filter(p => p.status === "PENDING").length,
    REJECTED: recentPayments.filter(p => p.status === "REJECTED").length,
  }), [recentPayments]);

  if (checking || !admin) return <div style={{ minHeight: "100vh" }} />;

  return (
    <div style={{ minHeight: "100vh", padding: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
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

      <div className="anim-fade-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "0 2px", marginBottom: 24, minHeight: 20 }}>
        <p style={{ fontSize: 13, color: "var(--text-2)" }}>
          Platform overview
          {!loading && (
            <span style={{ color: "var(--text-3)" }}>
              {" · "}{tenants.length} tenant{tenants.length === 1 ? "" : "s"} onboarded
            </span>
          )}
        </p>
        {!loading && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "var(--success)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 0 3px var(--success-bg)" }} />
            Live data
          </span>
        )}
      </div>

      {/* Dashboard Statistics — Clinics, Individuals, Revenue & Payments */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionHeading icon={<LayoutDashboard />} title="Dashboard Statistics" subtitle="Platform-wide totals at a glance" variant="accent" />
        </div>
        {loading ? <StatSkeletonGrid count={4} tall style={HERO_GRID_STYLE} /> : (
          <div style={HERO_GRID_STYLE}>
            <HeroStatTile index={0} icon={<Building2 />} label="Total Clinics" value={stats?.totalClinics ?? 0} active={!loading}
              gradient={1} caption={`${stats?.totalTenants ?? 0} tenants total`} onClick={() => goToTenants({ tab: "CLINIC" })} />
            <HeroStatTile index={1} icon={<User />} label="Total Individuals" value={stats?.totalIndividuals ?? 0} active={!loading}
              gradient={2} caption={`${stats?.totalTenants ?? 0} tenants total`} onClick={() => goToTenants({ tab: "INDIVIDUAL" })} />
            <HeroStatTile index={2} icon={<IndianRupee />} label="Total Revenue" value={stats?.totalRevenue ?? 0} active={!loading}
              gradient={3} money caption="From approved payments" onClick={() => goToHistory("ALL")} />
            <HeroStatTile index={3} icon={<ListChecks />} label="Total Payments" value={stats?.totalPayments ?? 0} active={!loading}
              gradient={4} caption="All submissions, every tenant" onClick={() => goToHistory("ALL")} />
          </div>
        )}
      </div>

      {/* Subscriptions breakdown */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionHeading icon={<Repeat />} title="Subscriptions" subtitle="Tenant lifecycle — click a tile to filter the table below" variant="pink" />
        </div>
        {loading ? <StatSkeletonGrid count={4} /> : (
          <div style={STAT_GRID_STYLE}>
            <BreakdownTile index={0} icon={<CheckCircle2 />} label="Active" value={stats?.activeSubscriptions ?? 0} active={!loading} barsIn={barsIn}
              variant="success" percentOf={tenants.length} unit="tenants" onClick={() => goToTenants({ status: "ACTIVE" })} />
            <BreakdownTile index={1} icon={<Clock />} label="Trial" value={stats?.trialingSubscriptions ?? 0} active={!loading} barsIn={barsIn}
              variant="accent" percentOf={tenants.length} unit="tenants" onClick={() => goToTenants({ status: "TRIALING" })} />
            <BreakdownTile index={2} icon={<XCircle />} label="Expired" value={stats?.expiredSubscriptions ?? 0} active={!loading} barsIn={barsIn}
              variant="danger" percentOf={tenants.length} unit="tenants" onClick={() => goToTenants({ status: "EXPIRED" })} />
            <BreakdownTile index={3} icon={<Ban />} label="Suspended" value={stats?.cancelledSubscriptions ?? 0} active={!loading} barsIn={barsIn}
              variant="warning" percentOf={tenants.length} unit="tenants" onClick={() => goToTenants({ status: "CANCELLED" })} />
          </div>
        )}
      </div>

      {/* Payments breakdown */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ marginBottom: 14 }}>
          <SectionHeading icon={<Receipt />} title="Payments" subtitle="Submission outcomes across every tenant" variant="warning" />
        </div>
        {loading ? <StatSkeletonGrid count={3} /> : (
          <div style={STAT_GRID_STYLE}>
            <BreakdownTile index={0} icon={<CheckCircle2 />} label="Successful" value={stats?.successfulPayments ?? 0} active={!loading} barsIn={barsIn}
              variant="success" percentOf={stats?.totalPayments} unit="payments" onClick={() => goToHistory("APPROVED")} />
            <BreakdownTile index={1} icon={<Clock />} label="Pending" value={stats?.pendingPayments ?? 0} active={!loading} barsIn={barsIn}
              variant="warning" percentOf={stats?.totalPayments} unit="payments" onClick={() => goToHistory("PENDING")} />
            <BreakdownTile index={2} icon={<XCircle />} label="Failed" value={stats?.failedPayments ?? 0} active={!loading} barsIn={barsIn}
              variant="danger" percentOf={stats?.totalPayments} unit="payments" onClick={() => goToHistory("REJECTED")} />
          </div>
        )}
      </div>

      {/* Pending payment review queue */}
      <div className="soft-card anim-fade-up" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <SectionHeading icon={<Clock />} title="Pending Payment Reviews" subtitle="Manually verify GPay/UPI payments submitted by practitioners" variant="warning" />
        </div>

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

      {/* Recent Payment History — most recent 20 submissions, any status */}
      <div ref={historySectionRef} className="soft-card anim-fade-up" style={{ overflow: "hidden", marginBottom: 24, scrollMarginTop: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(180,185,210,0.2)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <SectionHeading icon={<History />} title="Recent Payment History" subtitle="Most recent 20 submissions, any status" variant="accent" />
          <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexWrap: "wrap" }}>
            {([
              { key: "ALL", label: `All (${historyTabCounts.ALL})` },
              { key: "APPROVED", label: `Successful (${historyTabCounts.APPROVED})` },
              { key: "PENDING", label: `Pending (${historyTabCounts.PENDING})` },
              { key: "REJECTED", label: `Failed (${historyTabCounts.REJECTED})` },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setHistoryStatusFilter(tab.key)}
                className={`tab-pill${historyStatusFilter === tab.key ? " active" : " nm-raised-sm"}`}
                style={{ padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 11,
                  background: historyStatusFilter === tab.key ? "var(--accent)" : "transparent", color: historyStatusFilter === tab.key ? "#fff" : "var(--text-2)" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}><div className="skel" style={{ height: 160, borderRadius: 12 }} /></div>
        ) : recentPayments.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "30px 0" }}>No payment submissions yet.</p>
        ) : filteredHistory.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "30px 0" }}>No {(PAYMENT_STATUS_STYLE[historyStatusFilter]?.label ?? "matching").toLowerCase()} submissions in the recent list.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(180,185,210,0.15)" }}>
                  {["Tenant", "Type", "UTR", "Amount", "Status", "Submitted", "Reviewed"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-3)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(p => {
                  const st = PAYMENT_STATUS_STYLE[p.status] ?? PAYMENT_STATUS_STYLE.PENDING;
                  return (
                    <tr key={p.id} className="list-row" style={{ borderBottom: "1px solid var(--glass-border-dim)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontWeight: 600, color: "var(--text-1)" }}>{p.psychologistName}</p>
                        <p style={{ fontSize: 11, color: "var(--text-3)" }}>{p.psychologistEmail}</p>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <AccountTypeBadge accountType={p.accountType} staffCount={0} />
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-2)" }}>{p.upiTransactionRef}</td>
                      <td style={{ padding: "14px 16px", color: "var(--text-2)" }}>{fmtMoney(p.amountClaimed)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 8, background: st.bg, color: st.color, fontWeight: 700, fontSize: 11 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-3)", whiteSpace: "nowrap" }}>{fmtDate(p.createdAt)}</td>
                      <td style={{ padding: "14px 16px", color: "var(--text-3)", whiteSpace: "nowrap" }}>{fmtDate(p.reviewedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tenant list — filterable by account type (Clinic Management / Individual User Management) */}
      <div ref={tenantSectionRef} className="soft-card anim-fade-up" style={{ overflow: "hidden", scrollMarginTop: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(180,185,210,0.2)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <SectionHeading icon={<Users />} title={tenantSectionTitle} subtitle={`${filteredTenants.length} of ${tenants.length} tenants`} variant="accent" />
          <div style={{ display: "flex", gap: 4 }}>
            {([
              { key: "ALL" as const, label: `All (${tenants.length})` },
              { key: "CLINIC" as const, label: `Clinics (${clinicCount})` },
              { key: "INDIVIDUAL" as const, label: `Individuals (${individualCount})` },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setTenantTab(tab.key)}
                className={`tab-pill${tenantTab === tab.key ? " active" : " nm-raised-sm"}`}
                style={{ padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 11,
                  background: tenantTab === tab.key ? "var(--accent)" : "transparent", color: tenantTab === tab.key ? "#fff" : "var(--text-2)" }}>
                {tab.label}
              </button>
            ))}
          </div>
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
        ) : filteredTenants.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "36px 0" }}>No tenants match this filter.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(180,185,210,0.15)" }}>
                  {["Name", "Type", "Email", "Slug", "Status", "Days Left", "Ends/Renews", "Joined", "Actions"].map(h => (
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
                      <td style={{ padding: "14px 16px" }}>
                        <AccountTypeBadge accountType={t.accountType} staffCount={t.staffCount} />
                      </td>
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
