"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Phone } from "lucide-react";
import api from "../lib/api";

// Shown once per login (see dashboard/layout.tsx) to a tenant root whose
// account predates phone becoming a required signup field. Not dismissible
// without submitting — closing it would just mean asking again on every
// page load until the field is actually filled in, so there's no skip path.
export default function PhonePromptModal({ onSaved }: { onSaved: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch("/auth/phone", { phone });
      onSaved(phone.trim());
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not save your phone number. Please try again.");
      setSaving(false);
    }
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(10,14,40,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      padding: 16,
    }}>
      <div style={{
        width: "100%", maxWidth: 380, borderRadius: 24,
        background: "var(--surface, #fff)", padding: "32px 28px",
        boxShadow: "0 24px 64px rgba(20,20,50,0.25)",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg, #7A6CE6 0%, #4B3EC2 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18,
        }}>
          <Phone style={{ width: 22, height: 22, color: "#fff" }} />
        </div>

        <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--text-1)", marginBottom: 6 }}>
          Add your phone number
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 20 }}>
          We now ask every account for a contact number. Please add yours to keep using your dashboard.
        </p>

        {error && (
          <div style={{
            borderRadius: 12, border: "1px solid #FCA5A5", background: "#FEE2E2",
            color: "#B91C1C", fontSize: 12.5, padding: "10px 14px", marginBottom: 16, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="tel"
            autoFocus
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={saving}
            required
            style={{
              width: "100%", borderRadius: 12, border: "1px solid var(--border, #E4E8FF)",
              background: "var(--surface-2, #F8F9FF)", padding: "13px 16px", fontSize: 14,
              color: "var(--text-1)", outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={saving || !phone.trim()}
            style={{
              width: "100%", borderRadius: 999, background: "#4f6ef7", color: "#fff",
              fontWeight: 600, fontSize: 14, padding: "13px 0", border: "none",
              cursor: saving || !phone.trim() ? "not-allowed" : "pointer",
              opacity: saving || !phone.trim() ? 0.5 : 1,
            }}
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
