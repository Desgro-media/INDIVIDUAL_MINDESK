"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart as BarChartIcon, Users, Calendar,
  Clock, AlertCircle, PieChart as PieChartIcon, Repeat,
  ArrowRight, Download, Star, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import api from "../../../lib/api";
import Link from "next/link";
import MonthFilter, { monthKey, monthLabel } from "../../../components/MonthFilter";
import { CHART, useThemeMode, SeriesTooltip, SliceTooltip } from "../../../lib/chartTheme";
import { SpotlightDiv } from "../../../components/Spotlight";

type Appointment = {
  id: number;
  patientId?: number | null;
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  sessionType?: string;
  cancellationReason?: string;
  rating?: number | null;
};

type Patient = {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

export default function AnalyticsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const mode = useThemeMode();
  const c = CHART[mode];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get("/appointments"),
      api.get("/patients"),
    ])
      .then(([aRes, pRes]) => {
        setAppointments(aRes.data);
        setPatients(pRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Appointments visible under the current month filter — the basis for all
  // session-level metrics and charts. null filter = all time.
  const visibleAppointments = useMemo(
    () => monthFilter
      ? appointments.filter(a => a.appointmentDate && monthKey(a.appointmentDate) === monthFilter)
      : appointments,
    [appointments, monthFilter]
  );

  const availableMonths = useMemo(
    () => Array.from(new Set(
      appointments.filter(a => a.appointmentDate).map(a => monthKey(a.appointmentDate))
    )).sort().reverse(),
    [appointments]
  );

  const metrics = useMemo(() => {
    if (!appointments || !patients) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day for accurate comparisons

    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Session-level metrics come from the (possibly month-filtered) set
    const source = visibleAppointments;

    // Filter status
    const completed = source.filter(a => a.status === "COMPLETED");
    const cancelled = source.filter(a => a.status === "CANCELLED");

    // No-shows: cancelled appointments where reason mentions no-show
    const noShows = cancelled.filter(a => a.cancellationReason?.toLowerCase().includes("no-show"));
    const totalNoShows = noShows.length;

    const upcoming = source.filter(a =>
      new Date(a.appointmentDate + "T00:00:00") >= today &&
      (a.status === "AWAITING_PAYMENT" || a.status === "PAYMENT_UNDER_REVIEW" || a.status === "CONFIRMED")
    );

    // Grouping by patient id (email is nullable — using id avoids null collisions)
    const patientAppointments: Record<string, Appointment[]> = {};
    appointments.forEach(a => {
      const key = String(a.patientId ?? a.patientEmail);
      if (!patientAppointments[key]) patientAppointments[key] = [];
      patientAppointments[key].push(a);
    });

    // Follow-up / inactivity alerts are operational and always all-time —
    // filtering them by a past month would hide clients who need attention.
    let allTimeActive = 0;
    let allTimeReturning = 0;

    const overdueFollowUps: any[] = [];
    const inactiveClients: any[] = [];

    patients.forEach(p => {
      const pAppts = patientAppointments[String(p.id)] || [];
      const validPAppts = pAppts.filter(a => a.status !== "CANCELLED");

      // Returning clients
      if (validPAppts.length > 1) {
        allTimeReturning++;
      }

      // Latest session
      pAppts.sort((a, b) => new Date(b.appointmentDate + "T00:00:00").getTime() - new Date(a.appointmentDate + "T00:00:00").getTime());

      const latestAppt = pAppts[0];
      const hasUpcoming = pAppts.some(a => new Date(a.appointmentDate + "T00:00:00") >= today && a.status !== "CANCELLED");

      if (latestAppt) {
        const latestDate = new Date(latestAppt.appointmentDate + "T00:00:00");
        if (latestDate >= thirtyDaysAgo || hasUpcoming) {
          allTimeActive++;
        }

        // Overdue follow up: no upcoming, last session > 14 days ago
        const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        if (!hasUpcoming && latestDate < fourteenDaysAgo && latestDate >= sixtyDaysAgo) {
          overdueFollowUps.push({ patient: p, lastSession: latestAppt });
        }

        // Inactive: no upcoming, last session > 60 days ago
        if (!hasUpcoming && latestDate < sixtyDaysAgo) {
          inactiveClients.push({ patient: p, lastSession: latestAppt });
        }
      }
    });

    // Client-health numbers: month-scoped when a month is selected,
    // otherwise the classic all-time definitions.
    let activeClientsCount: number;
    let newClientsCount: number;
    let returningClientsCount: number;
    let retentionRate: number;

    const keyOf = (a: Appointment) => String(a.patientId ?? a.patientEmail);

    if (monthFilter) {
      const monthStart = monthFilter + "-01";
      const nonCancelledAll = appointments.filter(a => a.status !== "CANCELLED" && a.appointmentDate);
      const inMonth = nonCancelledAll.filter(a => monthKey(a.appointmentDate) === monthFilter);

      const patientsInMonth = new Set(inMonth.map(keyOf));
      activeClientsCount = patientsInMonth.size;

      // New = patients whose record was created in the selected month
      newClientsCount = patients.filter(p => p.createdAt && monthKey(p.createdAt) === monthFilter).length;

      // Returning = had a session this month AND it wasn't their first ever
      // (a session before the month, or more than one within it)
      const inMonthCounts: Record<string, number> = {};
      inMonth.forEach(a => { inMonthCounts[keyOf(a)] = (inMonthCounts[keyOf(a)] || 0) + 1; });
      const hasPrior = new Set(nonCancelledAll.filter(a => a.appointmentDate < monthStart).map(keyOf));
      returningClientsCount = 0;
      patientsInMonth.forEach(k => {
        if (hasPrior.has(k) || inMonthCounts[k] > 1) returningClientsCount++;
      });

      retentionRate = activeClientsCount > 0 ? Math.round((returningClientsCount / activeClientsCount) * 100) : 0;
    } else {
      activeClientsCount = allTimeActive;
      returningClientsCount = allTimeReturning;
      newClientsCount = patients.filter(p => new Date(p.createdAt) >= thirtyDaysAgo).length;
      retentionRate = patients.length > 0 ? Math.round((allTimeReturning / patients.length) * 100) : 0;
    }

    // Productivity insights — from the visible (month-filtered) set
    const daysMap: Record<string, number> = {
      "Sunday": 0, "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0
    };
    const hoursMap: Record<string, number> = {};
    const datesSet = new Set<string>();

    const activeAppointments = source.filter(a => a.status !== "CANCELLED");

    activeAppointments.forEach(a => {
      const date = new Date(a.appointmentDate + "T00:00:00");
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      daysMap[dayName] = (daysMap[dayName] || 0) + 1;

      const hour = a.startTime.split(':')[0];
      hoursMap[hour] = (hoursMap[hour] || 0) + 1;

      datesSet.add(a.appointmentDate);
    });

    const busiestDay = Object.keys(daysMap).reduce((a, b) => daysMap[a] > daysMap[b] ? a : b, "N/A");
    const peakHourStr = Object.keys(hoursMap).reduce((a, b) => hoursMap[a] > hoursMap[b] ? a : b, "N/A");
    const peakHour = peakHourStr !== "N/A" ? `${peakHourStr}:00` : "N/A";

    const uniqueDaysWorked = datesSet.size;
    const avgSessionsPerDay = uniqueDaysWorked > 0 ? (activeAppointments.length / uniqueDaysWorked).toFixed(1) : "0";

    let totalRating = 0;
    let ratedCount = 0;
    completed.forEach((a: any) => {
      if (a.rating) {
        totalRating += a.rating;
        ratedCount++;
      }
    });
    const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : "0.0";

    return {
      totalAppointments: source.length,
      completedAppointments: completed.length,
      cancelledAppointments: cancelled.length,
      noShows: totalNoShows,
      upcomingAppointments: upcoming.length,
      activeClients: activeClientsCount,
      newClients: newClientsCount,
      returningClients: returningClientsCount,
      retentionRate,
      avgRating,
      ratedCount,
      busiestDay: (busiestDay !== "N/A" && daysMap[busiestDay] > 0) ? busiestDay : "N/A",
      peakHour,
      avgSessionsPerDay,
      overdueFollowUps: overdueFollowUps.sort((a, b) => new Date(a.lastSession.appointmentDate).getTime() - new Date(b.lastSession.appointmentDate).getTime()),
      inactiveClients: inactiveClients.sort((a, b) => new Date(b.lastSession.appointmentDate).getTime() - new Date(a.lastSession.appointmentDate).getTime())
    };

  }, [appointments, patients, visibleAppointments, monthFilter]);

  const chartData = useMemo(() => {
    if (appointments.length === 0) return { trend: [], status: [], growth: [], retention: [] };

    const source = visibleAppointments;

    // Trend — every day of the selected month, or the last 14 days overall
    const dateCounts: Record<string, number> = {};
    source.filter(a => a.status !== "CANCELLED").forEach(a => {
      dateCounts[a.appointmentDate] = (dateCounts[a.appointmentDate] || 0) + 1;
    });
    const sortedTrendEntries = Object.entries(dateCounts).sort(([a], [b]) => a.localeCompare(b));
    const trend = (monthFilter ? sortedTrendEntries : sortedTrendEntries.slice(-14))
      .map(([date, count]) => ({
        name: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        bookings: count,
      }));

    // Status — colors from the shared validated palette, per theme
    const status = [
      { name: "Awaiting Payment", value: source.filter(a => a.status === "AWAITING_PAYMENT").length, color: c.status.AWAITING_PAYMENT },
      { name: "Verifying Payment", value: source.filter(a => a.status === "PAYMENT_UNDER_REVIEW").length, color: c.status.PAYMENT_UNDER_REVIEW },
      { name: "Confirmed", value: source.filter(a => a.status === "CONFIRMED").length, color: c.status.CONFIRMED },
      { name: "Completed", value: source.filter(a => a.status === "COMPLETED").length, color: c.status.COMPLETED },
      { name: "Cancelled", value: source.filter(a => a.status === "CANCELLED").length, color: c.status.CANCELLED },
    ].filter(d => d.value > 0);

    // Growth
    const growthCounts: Record<string, number> = {};

    // Add current month minus 1 as a baseline if we only have 1 month of data
    if (patients.length > 0) {
      const firstPatientDate = new Date(Math.min(...patients.map(p => new Date(p.createdAt).getTime())));
      const prevMonthDate = new Date(firstPatientDate.getFullYear(), firstPatientDate.getMonth() - 1, 1);
      const prevMonth = prevMonthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      growthCounts[prevMonth] = 0;
    }

    patients.forEach(p => {
      const month = new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      growthCounts[month] = (growthCounts[month] || 0) + 1;
    });

    let cumulative = 0;
    const growth = Object.entries(growthCounts)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, count]) => {
        cumulative += count;
        return { name: month, clients: cumulative };
      });

    // Retention — month-aware definition matches metrics.returningClients:
    // a client "returns" if a month session wasn't their first ever.
    let oneTime = 0;
    let returning = 0;
    const keyOf = (a: Appointment) => String(a.patientId ?? a.patientEmail);

    if (monthFilter) {
      const monthStart = monthFilter + "-01";
      const nonCancelledAll = appointments.filter(a => a.status !== "CANCELLED" && a.appointmentDate);
      const inMonth = nonCancelledAll.filter(a => monthKey(a.appointmentDate) === monthFilter);
      const inMonthCounts: Record<string, number> = {};
      inMonth.forEach(a => { inMonthCounts[keyOf(a)] = (inMonthCounts[keyOf(a)] || 0) + 1; });
      const hasPrior = new Set(nonCancelledAll.filter(a => a.appointmentDate < monthStart).map(keyOf));
      Object.entries(inMonthCounts).forEach(([k, count]) => {
        if (hasPrior.has(k) || count > 1) returning++;
        else oneTime++;
      });
    } else {
      const patientAppointments: Record<string, number> = {};
      appointments.filter(a => a.status !== "CANCELLED").forEach(a => {
        patientAppointments[keyOf(a)] = (patientAppointments[keyOf(a)] || 0) + 1;
      });
      Object.values(patientAppointments).forEach(count => {
        if (count > 1) returning++;
        else oneTime++;
      });
    }

    const retention = [
      { name: "One-time", value: oneTime, fill: c.dim },
      { name: "Returning", value: returning, fill: c.accent }
    ].filter(d => d.value > 0);

    return { trend, status, growth, retention };
  }, [appointments, patients, visibleAppointments, monthFilter, c]);

  // Small header callouts for the trend chart — total/peak/average booking
  // counts across whatever window chartData.trend currently covers.
  const trendStats = useMemo(() => {
    const values = chartData.trend.map(d => d.bookings);
    if (values.length === 0) return { total: 0, peak: 0, avg: 0 };
    const total = values.reduce((s, v) => s + v, 0);
    const peak = Math.max(...values);
    const avg = Math.round((total / values.length) * 10) / 10;
    return { total, peak, avg };
  }, [chartData.trend]);

  if (loading || !metrics) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="soft-card" style={{ padding: 26 }}>
              <div className="skel" style={{ width: 130, height: 13, marginBottom: 18 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div className="skel" style={{ height: 62, borderRadius: 14 }} />
                <div className="skel" style={{ height: 62, borderRadius: 14 }} />
                <div className="skel" style={{ height: 62, borderRadius: 14 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          {[0, 1].map(i => (
            <div key={i} className="soft-card" style={{ padding: 24 }}>
              <div className="skel" style={{ width: 160, height: 14, marginBottom: 18 }} />
              <div className="skel" style={{ width: "100%", height: 220, borderRadius: 16 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleExport = () => {
    if (!metrics) return;
    const rows: string[][] = [];

    // ── Summary Section ──────────────────────────────────────────
    rows.push(["PRACTICE ANALYTICS REPORT"]);
    rows.push(["Generated", new Date().toLocaleString()]);
    rows.push(["Period", monthFilter ? monthLabel(monthFilter) : "All time"]);
    rows.push([]);
    rows.push(["SUMMARY METRICS"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Sessions", String(metrics.totalAppointments)]);
    rows.push(["Completed", String(metrics.completedAppointments)]);
    rows.push(["Cancelled", String(metrics.cancelledAppointments)]);
    rows.push(["No-shows", String(metrics.noShows)]);
    rows.push(["Active Clients", String(metrics.activeClients)]);
    rows.push(["New Clients (30d)", String(metrics.newClients)]);
    rows.push(["Returning Clients", String(metrics.returningClients)]);
    rows.push(["Retention Rate", `${metrics.retentionRate}%`]);
    rows.push(["Avg Rating", `${metrics.avgRating} (${metrics.ratedCount} ratings)`]);
    rows.push(["Busiest Day", metrics.busiestDay]);
    rows.push(["Peak Hour", metrics.peakHour]);
    rows.push(["Avg Sessions/Day", metrics.avgSessionsPerDay]);

    rows.push([]);

    // ── Appointments Section (respects the selected month) ───────
    rows.push([monthFilter ? `APPOINTMENTS — ${monthLabel(monthFilter).toUpperCase()}` : "ALL APPOINTMENTS"]);
    rows.push(["ID", "Patient", "Email", "Date", "Start Time", "End Time", "Status", "Session Type", "Cancellation Reason"]);
    visibleAppointments.forEach(a => {
      rows.push([
        String(a.id),
        a.patientName,
        a.patientEmail,
        a.appointmentDate,
        a.startTime,
        a.endTime,
        a.status,
        a.sessionType || "",
        a.cancellationReason || "",
      ]);
    });
    rows.push([]);

    // ── Follow-ups Due Section ───────────────────────────────────
    rows.push(["FOLLOW-UPS DUE"]);
    rows.push(["Patient", "Email", "Last Session Date"]);
    if (metrics.overdueFollowUps.length === 0) {
      rows.push(["No overdue follow-ups", "", ""]);
    } else {
      metrics.overdueFollowUps.forEach((f: any) => {
        rows.push([f.patient.name, f.patient.email, f.lastSession.appointmentDate]);
      });
    }
    rows.push([]);

    // ── Inactive Clients Section ─────────────────────────────────
    rows.push(["INACTIVE CLIENTS (>60 days)"]);
    rows.push(["Patient", "Email", "Last Session Date"]);
    if (metrics.inactiveClients.length === 0) {
      rows.push(["No inactive clients", "", ""]);
    } else {
      metrics.inactiveClients.forEach((f: any) => {
        rows.push([f.patient.name, f.patient.email, f.lastSession.appointmentDate]);
      });
    }

    // ── Build CSV & Download ─────────────────────────────────────
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `practice-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="anim-fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 28 }}>
      <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em" }}>Practice Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            {monthFilter
              ? <>Showing data for <strong style={{ color: "var(--accent)" }}>{monthLabel(monthFilter)}</strong>. Follow-up alerts remain all-time.</>
              : "Comprehensive insights and reporting for your clinic."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <MonthFilter months={availableMonths} value={monthFilter} onChange={setMonthFilter} />
          <button onClick={handleExport} className="btn-nm" style={{ padding: "10px 18px" }}>
            <Download style={{ width: 14, height: 14, color: "var(--accent)" }} /> Export Report
          </button>
        </div>
      </div>

      {/* ── Hero KPI Row ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: isMobile ? 14 : 20 }}>

        {/* Sessions Overview hero card */}
        <SpotlightDiv className="soft-card card-hover anim-fade-up d1" style={{ padding: isMobile ? "20px 16px" : "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div className="icon-badge icon-badge--accent"><Calendar /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Session Overview</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Total", value: metrics.totalAppointments, color: "var(--text-1)" },
              { label: "Completed", value: metrics.completedAppointments, color: "var(--success)" },
              { label: "Cancelled", value: metrics.cancelledAppointments, color: "var(--danger)" },
            ].map(s => (
              <div key={s.label} className="soft-card-2" style={{ padding: "14px 10px", textAlign: "center" }}>
                <p style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 6 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </SpotlightDiv>

        {/* Client Health hero card */}
        <SpotlightDiv className="soft-card card-hover anim-fade-up d2" style={{ padding: isMobile ? "20px 16px" : "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div className="icon-badge icon-badge--success"><Users /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Client Health</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: monthFilter ? "Active (month)" : "Active", value: metrics.activeClients, color: "var(--success)" },
              { label: monthFilter ? "New (month)" : "New (30d)", value: metrics.newClients, color: "var(--accent)" },
              { label: "Returning", value: metrics.returningClients, color: "var(--pink)" },
            ].map(s => (
              <div key={s.label} className="soft-card-2" style={{ padding: "14px 10px", textAlign: "center" }}>
                <p style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 6 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </SpotlightDiv>

        {/* Rating & Alerts hero card */}
        <SpotlightDiv className="soft-card card-hover anim-fade-up d3" style={{ padding: isMobile ? "20px 16px" : "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div className="icon-badge icon-badge--warning"><Star /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Performance</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Avg Rating", value: metrics.avgRating, color: "var(--warning)" },
              { label: "No-shows", value: metrics.noShows, color: "var(--danger)" },
              { label: "Follow-ups Due", value: metrics.overdueFollowUps.length, color: "var(--pink)" },
            ].map(s => (
              <div key={s.label} className="soft-card-2" style={{ padding: "14px 10px", textAlign: "center" }}>
                <p style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 6 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </SpotlightDiv>

      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(400px, 1fr))", gap: isMobile ? 14 : 24 }}>

        {/* Trend Area Chart */}
        <SpotlightDiv className="soft-card anim-fade-up d2" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="icon-badge icon-badge--accent" style={{ width: 32, height: 32, borderRadius: 10 }}>
                <Calendar style={{ width: 15, height: 15 }} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Appointment Trends</h3>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                  {monthFilter ? monthLabel(monthFilter) : "Last 14 days"}
                </p>
              </div>
            </div>
            {chartData.trend.length > 0 && (
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>{trendStats.total}</p>
                  <p style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: c.accent, lineHeight: 1 }}>{trendStats.peak}</p>
                  <p style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Peak day</p>
                </div>
              </div>
            )}
          </div>
          {chartData.trend.length === 0 ? (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>No trend data available.</p>
            </div>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBkg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.accent} stopOpacity={0.32} />
                      <stop offset="55%" stopColor={c.accent} stopOpacity={0.10} />
                      <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: c.axisText, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis tick={{ fill: c.axisText, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<SeriesTooltip mode={mode} unit="booking" />} cursor={{ stroke: c.cursor, strokeWidth: 1 }} />
                  {trendStats.avg > 0 && (
                    <ReferenceLine y={trendStats.avg} stroke={c.dim} strokeDasharray="4 4" strokeWidth={1}
                      label={{ value: `Avg ${trendStats.avg}`, position: "insideTopRight", fill: c.dim, fontSize: 10 }} />
                  )}
                  <Area type="monotone" dataKey="bookings" stroke={c.accent} strokeWidth={2.5} fill="url(#colorBkg)" dot={{ r: 3, fill: c.accent, stroke: c.surface, strokeWidth: 1.5 }} activeDot={{ r: 5, fill: c.accent, stroke: c.surface, strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SpotlightDiv>

        {/* Client Growth Chart */}
        <SpotlightDiv className="soft-card anim-fade-up d3" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="icon-badge icon-badge--success" style={{ width: 32, height: 32, borderRadius: 10 }}>
                <TrendingUp style={{ width: 15, height: 15 }} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Cumulative Client Growth</h3>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>All time</p>
              </div>
            </div>
            {chartData.growth.length > 0 && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: c.success, lineHeight: 1 }}>{chartData.growth[chartData.growth.length - 1].clients}</p>
                <p style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total clients</p>
              </div>
            )}
          </div>
          {chartData.growth.length === 0 ? (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>No growth data available.</p>
            </div>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.success} stopOpacity={0.32} />
                      <stop offset="55%" stopColor={c.success} stopOpacity={0.10} />
                      <stop offset="100%" stopColor={c.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: c.axisText, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis tick={{ fill: c.axisText, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<SeriesTooltip mode={mode} unit="client" />} cursor={{ stroke: c.cursor, strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="clients" stroke={c.success} strokeWidth={2.5} fill="url(#colorGrowth)" dot={{ r: 3, fill: c.success, stroke: c.surface, strokeWidth: 1.5 }} activeDot={{ r: 5, fill: c.success, stroke: c.surface, strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SpotlightDiv>

        {/* Status Breakdown */}
        <SpotlightDiv className="soft-card anim-fade-up d4" style={{ padding: isMobile ? 16 : 24, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="icon-badge icon-badge--accent" style={{ width: 32, height: 32, borderRadius: 10 }}>
              <PieChartIcon style={{ width: 15, height: 15 }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Status Distribution</h3>
          </div>
          {chartData.status.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>No status data available.</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row" }}>
              <div style={{
                width: isMobile ? "100%" : "50%", height: 200, position: "relative",
                background:
                  "repeating-radial-gradient(circle, transparent 0, transparent 27px, var(--card-border) 28px, transparent 29px)," +
                  "radial-gradient(circle, var(--accent-surface) 0%, transparent 68%)",
                filter: "drop-shadow(0 8px 16px rgba(20,25,60,0.12))",
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.status} cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={4} cornerRadius={6} dataKey="value" stroke="none" isAnimationActive={false}>
                      {chartData.status.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                  <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>
                    {chartData.status.reduce((s, d) => s + d.value, 0)}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>sessions</p>
                </div>
              </div>
              <div style={{ width: isMobile ? "100%" : "50%", display: "flex", flexDirection: "column", gap: 12, paddingLeft: isMobile ? 0 : 20, paddingTop: isMobile ? 12 : 0 }}>
                {(() => {
                  const statusTotal = chartData.status.reduce((s, d) => s + d.value, 0);
                  return chartData.status.map(s => (
                    <div key={s.name}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
                          <span style={{ fontSize: 13, color: "var(--text-2)" }}>{s.name}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                          {s.value} <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>({Math.round((s.value / statusTotal) * 100)}%)</span>
                        </span>
                      </div>
                      <div className="meter-track" style={{ height: 4 }}>
                        <div className="meter-fill" style={{ width: `${Math.round((s.value / statusTotal) * 100)}%`, background: s.color }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </SpotlightDiv>

        {/* Client Retention */}
        <SpotlightDiv className="soft-card anim-fade-up d5" style={{ padding: isMobile ? 16 : 24, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="icon-badge icon-badge--pink" style={{ width: 32, height: 32, borderRadius: 10 }}>
              <Repeat style={{ width: 15, height: 15 }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Client Retention</h3>
          </div>
          {chartData.retention.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>No retention data available.</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row" }}>
              <div style={{
                width: isMobile ? "100%" : "50%", height: 200, position: "relative",
                background:
                  "repeating-radial-gradient(circle, transparent 0, transparent 27px, var(--card-border) 28px, transparent 29px)," +
                  "radial-gradient(circle, rgba(226,63,142,0.10) 0%, transparent 68%)",
                filter: "drop-shadow(0 8px 16px rgba(20,25,60,0.12))",
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.retention} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={4} cornerRadius={6} dataKey="value" stroke="none" isAnimationActive={false}>
                      {chartData.retention.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<SliceTooltip mode={mode} unit="client" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>
                    {chartData.retention.reduce((s, d) => s + d.value, 0)}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>clients</p>
                </div>
              </div>
              <div style={{ width: isMobile ? "100%" : "50%", display: "flex", flexDirection: "column", gap: 10, paddingLeft: isMobile ? 0 : 20, paddingTop: isMobile ? 12 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text-2)" }}>Retention Rate</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{metrics.retentionRate}%</span>
                </div>
                <div className="meter-track" style={{ height: 4, marginBottom: 4 }}>
                  <div className="meter-fill" style={{ width: `${metrics.retentionRate}%`, background: "var(--accent)" }} />
                </div>
                <div style={{ height: 1, background: "var(--card-border)", margin: "2px 0 6px" }} />
                {(() => {
                  const retentionTotal = chartData.retention.reduce((s, d) => s + d.value, 0);
                  return chartData.retention.map(r => (
                    <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: r.fill }} />
                        <span style={{ fontSize: 13, color: "var(--text-2)" }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                        {r.value} <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>({Math.round((r.value / retentionTotal) * 100)}%)</span>
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </SpotlightDiv>

      </div>

      {/* Productivity & Alerts Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: isMobile ? 14 : 24 }}>

        {/* Productivity Insights */}
        <SpotlightDiv className="soft-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <BarChartIcon style={{ width: 20, height: 20, color: "var(--accent)" }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>Productivity Insights</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Busiest Day", value: metrics.busiestDay },
              { label: "Peak Working Hour", value: metrics.peakHour },
              { label: "Avg. Sessions / Day", value: metrics.avgSessionsPerDay },
            ].map(p => (
              <div key={p.label} className="soft-card-2" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{p.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)" }}>{p.value}</span>
              </div>
            ))}
          </div>
        </SpotlightDiv>

        {/* Smart Alerts */}
        <SpotlightDiv className="soft-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <AlertCircle style={{ width: 20, height: 20, color: "var(--warning)" }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>Smart Alerts</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {/* Overdue Follow-ups */}
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Follow-ups Due</h4>
              {metrics.overdueFollowUps.length === 0 ? (
                <div style={{ padding: 16, borderRadius: 16, background: "var(--success-bg)", border: "1px solid var(--success-brd)" }}>
                  <p style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>All clients are up to date!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {metrics.overdueFollowUps.slice(0, 4).map((alert, i) => (
                    <div key={i} className="soft-card-2" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{alert.patient.name}</p>
                        <p style={{ fontSize: 11, color: "var(--warning)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock style={{ width: 10, height: 10 }} /> Last: {alert.lastSession.appointmentDate}
                        </p>
                      </div>
                      <Link href={`/dashboard/appointments?patient=${alert.patient.id}`} style={{ padding: "6px", background: "var(--warning-bg)", borderRadius: 8, color: "var(--warning)" }}>
                        <Calendar style={{ width: 14, height: 14 }} />
                      </Link>
                    </div>
                  ))}
                  {metrics.overdueFollowUps.length > 4 && (
                    <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", marginTop: 4, fontWeight: 600 }}>+ {metrics.overdueFollowUps.length - 4} more</p>
                  )}
                </div>
              )}
            </div>

            {/* Inactive Clients */}
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Inactive Clients (&gt;60d)</h4>
              {metrics.inactiveClients.length === 0 ? (
                <div style={{ padding: 16, borderRadius: 16, background: "var(--success-bg)", border: "1px solid var(--success-brd)" }}>
                  <p style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>No inactive clients found.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {metrics.inactiveClients.slice(0, 4).map((alert, i) => (
                    <div key={i} className="soft-card-2" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{alert.patient.name}</p>
                        <p style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock style={{ width: 10, height: 10 }} /> Last: {alert.lastSession.appointmentDate}
                        </p>
                      </div>
                      <Link href={`/dashboard/patients/${alert.patient.id}`} style={{ padding: "6px", background: "rgba(180, 185, 210, 0.1)", borderRadius: 8, color: "var(--text-2)" }}>
                        <ArrowRight style={{ width: 14, height: 14 }} />
                      </Link>
                    </div>
                  ))}
                  {metrics.inactiveClients.length > 4 && (
                    <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", marginTop: 4, fontWeight: 600 }}>+ {metrics.inactiveClients.length - 4} more</p>
                  )}
                </div>
              )}
            </div>

          </div>
        </SpotlightDiv>

      </div>
    </div>
  );
}
