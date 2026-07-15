"use client";

import React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

// Formats a "YYYY-MM" key as e.g. "Jul 2026"
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Extracts the "YYYY-MM" key from a date string ("YYYY-MM-DD" or ISO datetime)
export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

type Props = {
  /** Distinct "YYYY-MM" keys with data, sorted newest first */
  months: string[];
  /** Selected month key, or null for "all time" */
  value: string | null;
  onChange: (v: string | null) => void;
};

// Month selector used by Appointments, Billing and Analytics. The chevrons
// step through months that actually have data; the dropdown jumps directly.
export default function MonthFilter({ months, value, onChange }: Props) {
  const idx = value ? months.indexOf(value) : -1;
  // months is newest-first: "older" moves down the array, "newer" up.
  const olderKey = idx === -1 ? months[0] : months[idx + 1];
  const newerKey = idx > 0 ? months[idx - 1] : undefined;

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 10, border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: disabled ? "default" : "pointer",
    background: "transparent",
    color: disabled ? "var(--text-3)" : "var(--text-2)",
    opacity: disabled ? 0.4 : 1,
    flexShrink: 0,
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <CalendarDays style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
      <button
        type="button"
        onClick={() => onChange(null)}
        className={value === null ? "" : "nm-raised-sm"}
        style={{
          padding: "7px 12px", borderRadius: 10, border: "none", cursor: "pointer",
          fontWeight: 600, fontSize: 12, whiteSpace: "nowrap",
          background: value === null ? "var(--accent)" : "transparent",
          color: value === null ? "#fff" : "var(--text-2)",
          transition: "all 0.2s",
        }}
      >
        All time
      </button>
      <button
        type="button"
        onClick={() => olderKey && onChange(olderKey)}
        disabled={!olderKey}
        className={olderKey ? "nm-raised-sm" : ""}
        style={navBtn(!olderKey)}
        title="Older month"
      >
        <ChevronLeft style={{ width: 14, height: 14 }} />
      </button>
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value || null)}
        className="nm-input"
        style={{ width: "auto", minWidth: 118, padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
      >
        <option value="">All months</option>
        {months.map(m => (
          <option key={m} value={m}>{monthLabel(m)}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => newerKey && onChange(newerKey)}
        disabled={!newerKey}
        className={newerKey ? "nm-raised-sm" : ""}
        style={navBtn(!newerKey)}
        title="Newer month"
      >
        <ChevronRight style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
