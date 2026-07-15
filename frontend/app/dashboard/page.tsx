"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users, Calendar as CalendarIcon, CheckCircle2, ArrowUpRight,
  Hourglass, Activity, ChevronRight,
  RefreshCw, CloudOff, CreditCard, Repeat,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import api from "../../lib/api";
import {
  CHART, STATUS_LABELS, useThemeMode, useCountUp, SeriesTooltip, SliceTooltip, type ThemeMode,
} from "../../lib/chartTheme";
import { SpotlightLink, SpotlightDiv } from "../../components/Spotlight";

type Appointment = {
  id: number;
  patientId?: number | null;
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  sessionType?: string;
};

/* Chip text needs more contrast than a chart mark, so it has its own pair. */
const CHIP_TEXT: Record<ThemeMode, Record<string, string>> = {
  light: { AWAITING_PAYMENT: "#92400e", PAYMENT_UNDER_REVIEW: "#6d28d9", CONFIRMED: "#15803d" },
  dark:  { AWAITING_PAYMENT: "#fbbf24", PAYMENT_UNDER_REVIEW: "#a78bfa", CONFIRMED: "#34d399" },
};

/* Local-timezone YYYY-MM-DD — toISOString() is UTC and reports yesterday's
   date until 05:30 in IST, which shifted "today" everywhere it was used. */
function fmtLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StatusChip({ status, mode }: { status: string; mode: ThemeMode }) {
  const styles: Record<string, { bg: string; brd: string }> = {
    AWAITING_PAYMENT:     { bg: "var(--warning-bg)", brd: "var(--warning-brd)" },
    PAYMENT_UNDER_REVIEW: { bg: "rgba(139,92,246,0.10)", brd: "rgba(139,92,246,0.24)" },
    CONFIRMED:            { bg: "var(--success-bg)", brd: "var(--success-brd)" },
  };
  const s = styles[status] ?? { bg: "var(--accent-surface)", brd: "var(--accent-border)" };
  const text = CHIP_TEXT[mode][status] ?? "var(--accent)";
  const label =
    status === "AWAITING_PAYMENT" ? "Pay now" :
    status === "PAYMENT_UNDER_REVIEW" ? "Verifying" :
    STATUS_LABELS[status] ?? status;
  return (
    <span style={{
      padding: "5px 11px", borderRadius: 50,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      background: s.bg, border: `1px solid ${s.brd}`, color: text,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

// Selective direct labels on the status donut — only slices with enough
// room to hold a legible number, never one on every sliver.
function renderDonutSliceLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (percent < 0.12) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10.5, fontWeight: 800, fill: "#fff", pointerEvents: "none" }}>
      {Math.round(percent * 100)}%
    </text>
  );
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [barsIn, setBarsIn] = useState(false);
  // The page is statically prerendered; anything derived from `new Date()`
  // must wait for mount or the server HTML (built at another time) mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const mode = useThemeMode();
  const c = CHART[mode];

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);

    Promise.all([
      api.get("/appointments"),
      api.get("/patients"),
    ]).then(([aRes, pRes]) => {
      setAppointments(aRes.data);
      setPatients(pRes.data);
    }).catch((err) => {
      console.error(err);
      setLoadError(true);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Let progress bars mount at width 0, then transition to their value.
  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setBarsIn(true)));
    return () => cancelAnimationFrame(raf);
  }, [loading]);

  const todayStr = fmtLocalDate(new Date());

  const stats = useMemo(() => ({
    total:              appointments.length,
    awaitingPayment:    appointments.filter(a => a.status === "AWAITING_PAYMENT").length,
    paymentUnderReview: appointments.filter(a => a.status === "PAYMENT_UNDER_REVIEW").length,
    confirmed:          appointments.filter(a => a.status === "CONFIRMED").length,
    completed:          appointments.filter(a => a.status === "COMPLETED").length,
    cancelled:          appointments.filter(a => a.status === "CANCELLED").length,
    patients:           patients.length,
    today:              appointments.filter(a => a.appointmentDate === todayStr && a.status !== "CANCELLED").length,
  }), [appointments, patients, todayStr]);

  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  // Share of sessions that have cleared payment (confirmed or completed),
  // vs. still stuck awaiting/under-review.
  const clearedRate = stats.total > 0
    ? Math.round(((stats.confirmed + stats.completed) / stats.total) * 100)
    : 0;

  // A patient "returns" if they have more than one non-cancelled session —
  // the same definition Analytics uses, computed here for the progress tile.
  const retention = useMemo(() => {
    const byPatient = new Map<number, number>();
    appointments.forEach(a => {
      if (a.status !== "CANCELLED" && a.patientId != null) {
        byPatient.set(a.patientId, (byPatient.get(a.patientId) || 0) + 1);
      }
    });
    const withSessions = byPatient.size;
    const returning = Array.from(byPatient.values()).filter(n => n > 1).length;
    const rate = withSessions > 0 ? Math.round((returning / withSessions) * 100) : 0;
    return { withSessions, returning, rate };
  }, [appointments]);

  const daysLeftInMonth = useMemo(() => {
    if (!mounted) return 0;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  }, [mounted]);

  /* Continuous 14-day window ending today, zero-filled — a trend built only
     from days that happen to have bookings hides every quiet day. */
  const trend = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => {
      counts[a.appointmentDate] = (counts[a.appointmentDate] || 0) + 1;
    });
    const days: { key: string; name: string; bookings: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = fmtLocalDate(d);
      days.push({
        key,
        name: i === 0 ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        bookings: counts[key] || 0,
      });
    }
    return days;
  }, [appointments]);

  const weekTotals = useMemo(() => {
    const thisWeek = trend.slice(7).reduce((s, d) => s + d.bookings, 0);
    const prevWeek = trend.slice(0, 7).reduce((s, d) => s + d.bookings, 0);
    return { thisWeek, prevWeek };
  }, [trend]);

  const donutData = useMemo(() => (
    (Object.keys(STATUS_LABELS) as string[])
      .map(status => ({
        name: STATUS_LABELS[status],
        value: appointments.filter(a => a.status === status).length,
        color: c.status[status],
      }))
      .filter(d => d.value > 0)
  ), [appointments, c]);

  const upcoming = useMemo(() => (
    appointments
      .filter(a =>
        (a.status === "AWAITING_PAYMENT" || a.status === "PAYMENT_UNDER_REVIEW" || a.status === "CONFIRMED") &&
        a.appointmentDate >= todayStr
      )
      .sort((a, b) =>
        a.appointmentDate.localeCompare(b.appointmentDate) || a.startTime.localeCompare(b.startTime)
      )
      .slice(0, 5)
  ), [appointments, todayStr]);

  // Today's sessions, for the rail's roster panel.
  const todaysAppointments = useMemo(() => (
    appointments
      .filter(a => a.appointmentDate === todayStr && a.status !== "CANCELLED")
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  ), [appointments, todayStr]);

  const animatedPatients  = useCountUp(stats.patients, !loading);
  const animatedAwaiting  = useCountUp(stats.awaitingPayment, !loading);
  const animatedSessions  = useCountUp(stats.total, !loading);

  const dateline = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  if (loadError && !loading) {
    return (
      <div className="soft-card anim-scale-in" style={{
        padding: "56px 24px", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <div className="icon-badge icon-badge--accent" style={{ width: 58, height: 58, borderRadius: 18 }}>
          <CloudOff style={{ width: 26, height: 26 }} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Couldn&apos;t load the dashboard</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Check your connection and try again.</p>
        </div>
        <button className="btn-nm-accent" onClick={load} style={{ padding: "10px 22px", fontSize: 13 }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Dateline */}
      <div className="anim-fade-up" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "0 2px", minHeight: 20 }}>
        <p style={{ fontSize: 13, color: "var(--text-2)" }}>
          <span style={{ fontWeight: 700, color: "var(--text-1)" }}>{mounted ? dateline : " "}</span>
          {!loading && (
            <span style={{ color: "var(--text-3)" }}>
              {" · "}{stats.today} session{stats.today === 1 ? "" : "s"} today
              {stats.paymentUnderReview > 0 && ` · ${stats.paymentUnderReview} payment${stats.paymentUnderReview === 1 ? "" : "s"} to verify`}
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

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="ov-hero">
            <div className="soft-card skel" style={{ height: 280 }} />
            <div className="ov-stack">
              <div className="soft-card skel" style={{ flex: 1, minHeight: 128 }} />
              <div className="soft-card skel" style={{ flex: 1, minHeight: 128 }} />
            </div>
          </div>
          <div className="ov-progress-row">
            <div className="soft-card skel" style={{ height: 150 }} />
            <div className="soft-card skel" style={{ height: 150 }} />
            <div className="soft-card skel" style={{ height: 150 }} />
          </div>
          <div className="soft-card skel" style={{ height: 220 }} />
          <div className="soft-card skel" style={{ height: 240 }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div className="ov-hero">
              {/* Booking trend hero card */}
              <SpotlightDiv className="grad-card grad-card--1 card-hover anim-fade-up d1">
                <span className="grad-card-mesh" aria-hidden="true" />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.08em" }}>Overview</p>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>Booking Trend</h3>
                  </div>
                  <div className="stat-bubble">
                    <span className="stat-bubble-dot"><Activity /></span>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{stats.today}</p>
                      <p style={{ fontSize: 9, opacity: 0.85, marginTop: 1 }}>today</p>
                    </div>
                  </div>
                </div>
                <div style={{ height: 210, minWidth: 0, marginTop: 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 16, right: 4, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashTrendFillOnGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"  stopColor="#ffffff" stopOpacity={0.50} />
                          <stop offset="55%" stopColor="#ffffff" stopOpacity={0.16} />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "rgba(255,255,255,0.68)", fontSize: 10.5 }}
                        axisLine={false} tickLine={false}
                        interval="preserveStartEnd" minTickGap={28}
                      />
                      <YAxis hide domain={[0, (max: number) => Math.max(max * 1.25, 4)]} />
                      <Tooltip
                        content={<SeriesTooltip mode={mode} unit="booking" />}
                        cursor={{ stroke: "rgba(255,255,255,0.35)", strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone" dataKey="bookings"
                        stroke="#ffffff" strokeWidth={2.25}
                        fill="url(#dashTrendFillOnGrad)"
                        dot={false}
                        activeDot={{ r: 4.5, fill: "#ffffff", stroke: "var(--grad-1-to)", strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 11, opacity: 0.85 }}>Last 14 days</span>
                  <span className="stat-chip stat-chip--on-grad">{weekTotals.thisWeek} booked this week</span>
                </div>
              </SpotlightDiv>

              {/* Stacked accent tiles */}
              <div className="ov-stack">
                <SpotlightLink href="/dashboard/patients" className="grad-card grad-card--1 card-hover anim-fade-up d2">
                  <span className="grad-card-mesh" aria-hidden="true" />
                  <span className="grad-card-watermark" aria-hidden="true" style={{ width: 96, height: 96, right: -18, bottom: -20, transform: "rotate(-14deg)" }}>
                    <Users />
                  </span>
                  <div className="icon-badge icon-badge--on-grad"><Users /></div>
                  <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 14 }}>Total Patients</p>
                  <p style={{ fontSize: 28, fontWeight: 800, marginTop: 2, lineHeight: 1 }}>{animatedPatients}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 14 }}>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>Registered</span>
                    <span className="circle-icon-btn"><ArrowUpRight /></span>
                  </div>
                </SpotlightLink>

                <SpotlightLink href="/dashboard/appointments" className="grad-card grad-card--2 card-hover anim-fade-up d3">
                  <span className="grad-card-mesh" aria-hidden="true" />
                  <span className="grad-card-watermark" aria-hidden="true" style={{ width: 92, height: 92, right: -16, bottom: -18, transform: "rotate(10deg)" }}>
                    <Hourglass />
                  </span>
                  <div className="icon-badge icon-badge--on-grad"><Hourglass /></div>
                  <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 14 }}>Awaiting Payment</p>
                  <p style={{ fontSize: 28, fontWeight: 800, marginTop: 2, lineHeight: 1 }}>{animatedAwaiting}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 14 }}>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>
                      {stats.paymentUnderReview > 0 ? `${stats.paymentUnderReview} verifying` : "None pending"}
                    </span>
                    <span className="circle-icon-btn"><ArrowUpRight /></span>
                  </div>
                </SpotlightLink>
              </div>
            </div>

            {/* Progress row */}
            <div className="ov-progress-row">
              <SpotlightDiv className="soft-card card-hover anim-fade-up d3" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="icon-badge icon-badge--accent"><CheckCircle2 /></div>
                  <span className="stat-chip stat-chip--good">{daysLeftInMonth}d left</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Completion Rate</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, marginBottom: 14 }}>{stats.completed} of {stats.total} sessions</p>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: barsIn ? `${completionRate}%` : "0%", background: "var(--accent)" }} />
                </div>
                <p style={{ textAlign: "right", fontSize: 13, fontWeight: 800, marginTop: 6, color: "var(--text-1)" }}>{completionRate}%</p>
              </SpotlightDiv>

              <SpotlightDiv className="soft-card card-hover anim-fade-up d4" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="icon-badge icon-badge--success"><CreditCard /></div>
                  <span className="stat-chip stat-chip--good">{daysLeftInMonth}d left</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Payments Cleared</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, marginBottom: 14 }}>{stats.confirmed + stats.completed} of {stats.total} sessions</p>
                <div className="meter-track" style={{ background: "var(--success-bg)" }}>
                  <div className="meter-fill" style={{ width: barsIn ? `${clearedRate}%` : "0%", background: "var(--success)" }} />
                </div>
                <p style={{ textAlign: "right", fontSize: 13, fontWeight: 800, marginTop: 6, color: "var(--text-1)" }}>{clearedRate}%</p>
              </SpotlightDiv>

              <SpotlightDiv className="soft-card card-hover anim-fade-up d5" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="icon-badge icon-badge--pink"><Repeat /></div>
                  <span className="stat-chip stat-chip--good">{daysLeftInMonth}d left</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Patient Retention</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, marginBottom: 14 }}>{retention.returning} of {retention.withSessions} patients return</p>
                <div className="meter-track" style={{ background: "var(--pink-bg)" }}>
                  <div className="meter-fill" style={{ width: barsIn ? `${retention.rate}%` : "0%", background: "var(--pink)" }} />
                </div>
                <p style={{ textAlign: "right", fontSize: 13, fontWeight: 800, marginTop: 6, color: "var(--text-1)" }}>{retention.rate}%</p>
              </SpotlightDiv>
            </div>

            {/* Upcoming appointments */}
            <div className="soft-card anim-fade-up d5" style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--card-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="icon-badge icon-badge--accent" style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0 }}>
                    <CalendarIcon style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Upcoming appointments</h3>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Next confirmed &amp; pending sessions</p>
                  </div>
                </div>
                <Link href="/dashboard/appointments" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontWeight: 600, flexShrink: 0 }}>
                  View all <ChevronRight style={{ width: 13, height: 13 }} />
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <div style={{ padding: "42px 24px", textAlign: "center" }}>
                  <CalendarIcon style={{ width: 30, height: 30, color: "var(--text-3)", margin: "0 auto 10px" }} />
                  <p style={{ color: "var(--text-3)", fontSize: 13 }}>No upcoming appointments</p>
                </div>
              ) : (
                <div>
                  {upcoming.map(apt => {
                    const d = new Date(apt.appointmentDate + "T00:00:00");
                    const dateLabel = apt.appointmentDate === todayStr
                      ? "Today"
                      : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    return (
                      <Link
                        key={apt.id}
                        href="/dashboard/appointments"
                        className="list-row"
                        style={{
                          display: "flex", alignItems: "center", gap: 16,
                          padding: "13px 24px",
                          borderBottom: "1px solid var(--card-border)",
                        }}
                      >
                        <div className="team-avatar" style={{ borderRadius: "50%" }}>
                          {apt.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apt.patientName}</p>
                          <p style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {apt.sessionType?.replace(/_/g, " ") || "General"}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: apt.appointmentDate === todayStr ? 700 : 400, color: apt.appointmentDate === todayStr ? "var(--accent)" : "var(--text-2)" }}>{dateLabel}</p>
                          <p style={{ fontSize: 11, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{apt.startTime?.slice(0, 5)}</p>
                        </div>
                        <StatusChip status={apt.status} mode={mode} />
                        <ChevronRight className="row-chev" style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Team + Session status — full-width horizontal card */}
            <SpotlightDiv className="team-status-card anim-fade-up d6">
              <span className="team-status-topbar" aria-hidden="true" />
              <div className="team-status-body">
              <div className="team-status-section team-status-section--team">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="icon-badge icon-badge--accent" style={{ width: 32, height: 32, borderRadius: 10 }}>
                      <Users style={{ width: 15, height: 15 }} />
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>Today</h3>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{todaysAppointments.length} session{todaysAppointments.length === 1 ? "" : "s"}</span>
                </div>

                <div className="team-ring-strip">
                  {todaysAppointments.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-3)", padding: "8px 4px" }}>Nothing on the schedule today.</p>
                  ) : todaysAppointments.map(apt => (
                    <div key={apt.id} className="team-ring-item" title={apt.patientName}>
                      <div className="team-ring" style={{ background: "var(--card-2)" }}>
                        <div className="team-ring-avatar">{apt.patientName.charAt(0).toUpperCase()}</div>
                      </div>
                      <p className="team-ring-name">{apt.patientName.split(" ")[0]}</p>
                      <p className="team-ring-sub">{apt.startTime?.slice(0, 5)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="team-status-divider-v" aria-hidden="true" />

              <div className="team-status-section team-status-section--sessions">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                  <div className="icon-badge icon-badge--pink" style={{ width: 32, height: 32, borderRadius: 10 }}>
                    <Repeat style={{ width: 15, height: 15 }} />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>Session Status</h3>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, marginBottom: 6 }}>All appointments by state</p>
                {stats.total === 0 ? (
                  <div style={{ minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <CalendarIcon style={{ width: 26, height: 26, color: "var(--text-3)" }} />
                    <p style={{ color: "var(--text-3)", fontSize: 12 }}>Bookings will appear here</p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      height: 150, width: 150, position: "relative", margin: "6px auto 0",
                      background: "radial-gradient(circle, var(--accent-surface) 0%, transparent 68%)",
                      filter: "drop-shadow(0 8px 16px rgba(20,25,60,0.12))",
                    }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData} cx="50%" cy="50%"
                            innerRadius={42} outerRadius={66}
                            paddingAngle={4} cornerRadius={6} dataKey="value"
                            stroke="none"
                            isAnimationActive={false}
                            label={renderDonutSliceLabel}
                            labelLine={false}
                          >
                            {donutData.map(entry => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<SliceTooltip mode={mode} unit="session" />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        pointerEvents: "none",
                      }}>
                        <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>{animatedSessions}</p>
                        <p style={{ fontSize: 9, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>sessions</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 }}>
                      {donutData.map(d => (
                        <div key={d.name} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "5px 10px 5px 8px", borderRadius: 50,
                          background: "var(--card-2)", border: "1px solid var(--card-border)",
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>{d.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              </div>
            </SpotlightDiv>
          </div>
      )}
    </div>
  );
}
