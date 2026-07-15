"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Read the theme that was applied by the inline script in layout.tsx
  useEffect(() => {
    const saved = localStorage.getItem("pb-theme") as "light" | "dark" | null;
    const current = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || saved || "light";
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pb-theme", next);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div style={{ width: 68, height: 34, borderRadius: 50, opacity: 0 }} />
    );
  }

  return (
    <button
      onClick={toggle}
      id="theme-toggle-btn"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className="nm-raised-sm"
      style={{
        width: 68, height: 34, borderRadius: 50,
        border: "none", cursor: "pointer",
        background: "var(--bg)",
        display: "flex", alignItems: "center",
        padding: "0 5px",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Sun icon */}
      <Sun style={{
        width: 13, height: 13,
        color: theme === "light" ? "var(--accent)" : "var(--text-3)",
        marginLeft: 2, flexShrink: 0,
        transition: "color 0.2s",
      }} />

      {/* Sliding knob */}
      <span style={{
        position: "absolute",
        top: 4,
        left: theme === "dark" ? "calc(100% - 30px)" : 4,
        width: 26, height: 26,
        borderRadius: "50%",
        background: "var(--accent)",
        boxShadow: theme === "dark"
          ? "2px 2px 6px #0e1020, -1px -1px 4px #3a3f5c"
          : "2px 2px 6px #4a5bcc, -1px -1px 4px #8b9cf4",
        transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: "none",
      }} />

      {/* Moon icon */}
      <Moon style={{
        width: 13, height: 13,
        color: theme === "dark" ? "var(--accent)" : "var(--text-3)",
        marginLeft: "auto", marginRight: 2, flexShrink: 0,
        transition: "color 0.2s",
      }} />
    </button>
  );
}
