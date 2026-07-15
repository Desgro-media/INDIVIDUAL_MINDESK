"use client";

/* Shared chart theming for all dashboard pages.
   Chart colors are resolved in JS per theme — CSS variables don't resolve
   inside SVG presentation attributes, which is what Recharts renders.
   Status palettes validated with the dataviz six-checks script (CVD-safe,
   in-band lightness, ≥3:1 contrast on each mode's chart surface). */

import React, { useEffect, useRef, useState } from "react";

export type ThemeMode = "light" | "dark";

export const CHART = {
  light: {
    accent: "#4f6ef7",
    success: "#0f9d63",
    grid: "rgba(27,32,72,0.07)",
    axisText: "#8a90bc",
    cursor: "rgba(79,110,247,0.30)",
    surface: "#ffffff",
    dim: "#94a3b8",
    tooltipBg: "rgba(255,255,255,0.95)",
    tooltipBorder: "rgba(180,196,255,0.55)",
    tooltipShadow: "0 12px 32px rgba(30,40,90,0.16)",
    sparkDim: "rgba(27,32,72,0.22)",
    status: {
      AWAITING_PAYMENT:     "#b45309",
      PAYMENT_UNDER_REVIEW: "#7c3aed",
      CONFIRMED:            "#16a34a",
      COMPLETED:            "#4f6ef7",
      CANCELLED:            "#e11d48",
    } as Record<string, string>,
  },
  dark: {
    accent: "#6b85fa",
    success: "#059669",
    grid: "rgba(230,234,255,0.07)",
    axisText: "#52598a",
    cursor: "rgba(107,133,250,0.38)",
    surface: "#1a1f3a",
    dim: "#5a6285",
    tooltipBg: "rgba(19,23,45,0.96)",
    tooltipBorder: "rgba(107,133,250,0.35)",
    tooltipShadow: "0 12px 32px rgba(0,0,0,0.45)",
    sparkDim: "rgba(230,234,255,0.24)",
    status: {
      AWAITING_PAYMENT:     "#d97706",
      PAYMENT_UNDER_REVIEW: "#8b5cf6",
      CONFIRMED:            "#059669",
      COMPLETED:            "#6b85fa",
      CANCELLED:            "#f43f5e",
    } as Record<string, string>,
  },
};

export const STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT:     "Awaiting payment",
  PAYMENT_UNDER_REVIEW: "Verifying payment",
  CONFIRMED:            "Confirmed",
  COMPLETED:            "Completed",
  CANCELLED:            "Cancelled",
};

export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>("light");
  useEffect(() => {
    const read = () =>
      setMode(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return mode;
}

export function useCountUp(target: number, active: boolean, duration = 850): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (!active) return;
    const from = fromRef.current;
    if (from === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return active ? value : 0;
}

export function Sparkline({ points, dim, accent }: { points: number[]; dim: string; accent: string }) {
  if (points.length < 2) return null;
  const w = 76, h = 26, pad = 3;
  const max = Math.max(...points, 1);
  const step = (w - pad * 2) / (points.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const coords = points.map((v, i) => [pad + i * step, y(v)] as const);
  const path = coords.map(([cx, cy], i) => `${i === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`).join(" ");
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path d={path} fill="none" stroke={dim} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3} fill={accent} />
    </svg>
  );
}

/* Recharts tooltip for single-series time charts. Value leads, label follows.
   `unit` is the noun for the value, e.g. "booking" / "client" / "session". */
export function SeriesTooltip({ active, payload, label, mode, unit }: any) {
  const c = CHART[(mode as ThemeMode) ?? "light"];
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  return (
    <div style={{
      background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`,
      borderRadius: 12, padding: "9px 13px", boxShadow: c.tooltipShadow,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", lineHeight: 1.2 }}>
        {v} <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>{unit}{v === 1 ? "" : "s"}</span>
      </p>
      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{label}</p>
    </div>
  );
}

/* Recharts tooltip for pie/donut slices — keys the row with a short line of
   the slice color (identity from the mark, text in text tokens). */
export function SliceTooltip({ active, payload, mode, unit }: any) {
  const c = CHART[(mode as ThemeMode) ?? "light"];
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const color = row.payload?.color ?? row.payload?.fill;
  return (
    <div style={{
      background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`,
      borderRadius: 12, padding: "9px 13px", boxShadow: c.tooltipShadow,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", lineHeight: 1.2 }}>
        {row.value} <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>{unit}{row.value === 1 ? "" : "s"}</span>
      </p>
      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
        {color && <span style={{ width: 10, height: 2.5, borderRadius: 2, background: color, display: "inline-block" }} />}
        {row.name}
      </p>
    </div>
  );
}
