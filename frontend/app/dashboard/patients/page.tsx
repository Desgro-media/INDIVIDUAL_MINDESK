"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Search, Phone, Mail, X, UserCircle2, UserPlus } from "lucide-react";
import api from "../../../lib/api";
import { SpotlightLink } from "../../../components/Spotlight";

type Patient = { id: number; name: string; email: string; phone: string; riskFlag?: boolean; riskReason?: string; riskFlaggedAt?: string; };
type Appointment = {
  id: number; patientId?: number | null; patientName: string; patientEmail: string;
  appointmentDate: string; startTime: string; endTime: string;
  status: string; sessionType?: string; notes?: string; cancellationReason?: string;
};

const EMPTY_FORM = { name: "", email: "", phone: "" };

function PatientsView() {
  const searchParams = useSearchParams();
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  // Seeded once from the header's global quick-search (?q=), then a normal
  // local filter — the URL param is only ever read on first mount.
  const [search, setSearch]             = useState(() => searchParams.get("q") ?? "");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/patients"),
      api.get("/appointments"),
    ]).then(([pRes, aRes]) => {
      setPatients(pRes.data);
      setAppointments(aRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const result = patients.filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search)
    );
    return result.sort((a, b) => (b.riskFlag ? 1 : 0) - (a.riskFlag ? 1 : 0));
  }, [patients, search]);

  const getPatientStats = (patientId: number) => {
    const apts = appointments.filter(a => a.patientId === patientId);
    return {
      total:     apts.length,
      completed: apts.filter(a => a.status === "COMPLETED").length,
      pending:   apts.filter(a => a.status === "AWAITING_PAYMENT" || a.status === "PAYMENT_UNDER_REVIEW").length,
    };
  };

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormError(""); };

  const handleSubmit = async () => {
    setFormError("");
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("Name and phone number are required."); return;
    }
    setSaving(true);
    try {
      await api.post("/patients", { name: form.name, email: form.email, phone: form.phone });
      const pRes = await api.get("/patients");
      setPatients(pRes.data);
      closeModal();
    } catch {
      setFormError("Failed to add patient. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="anim-fade-up">

      {/* ── Add Patient Modal ─────────────────────────────────────────────── */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div className="overlay-enter" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}
          onClick={closeModal}>
          <div className="soft-card anim-scale-in"
            style={{ width: "100%", maxWidth: 440, position: "relative" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: "24px 28px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>Add New Patient</h2>
                <button type="button" onClick={closeModal} className="icon-btn" style={{ padding: 4 }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>Enter the basic details to create a patient record.</p>
            </div>

            {/* Fields */}
            <div style={{ padding: "0 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              {(["name", "email", "phone"] as const).map(field => (
                <div key={field} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {field === "name" ? "Full Name" : field === "email" ? "Email Address (optional)" : "Phone Number"}
                  </label>
                  <input
                    className="nm-input"
                    type={field === "email" ? "email" : "text"}
                    placeholder={field === "name" ? "e.g. Jasna Ahmed" : field === "email" ? "patient@email.com" : "+91 98765 43210"}
                    value={form[field]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    style={{ borderRadius: 12 }}
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: "20px 28px 24px" }}>
              {formError && (
                <p style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600, marginBottom: 12 }}>{formError}</p>
              )}
              <button type="button" onClick={handleSubmit} disabled={saving} className="btn-nm-accent"
                style={{ width: "100%", padding: "12px 0" }}>
                {saving ? "Adding..." : "Add Patient"}
              </button>
            </div>

          </div>
        </div>
      , document.body)}

      {/* ── Search + Stats ─────────────────────────────────────────────────── */}
      <div className="soft-card anim-fade-up d1" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="text"
            placeholder="Search patients..."
            className="nm-input"
            style={{ paddingLeft: 40 }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div className="soft-card-2" style={{ borderRadius: 50, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <Users style={{ width: 14, height: 14, color: "var(--accent)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{filtered.length}</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>patients</span>
          </div>
          <button onClick={openModal} className="btn-nm-accent"
            style={{ padding: "9px 18px", fontSize: 13 }}>
            <UserPlus style={{ width: 14, height: 14 }} />
            Add Patient
          </button>
        </div>
      </div>

      {/* ── Patient Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="soft-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div className="skel" style={{ width: 52, height: 52, borderRadius: "50%" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skel" style={{ height: 14, width: "70%" }} />
                  <div className="skel" style={{ height: 10, width: "50%" }} />
                </div>
              </div>
              <div className="skel" style={{ height: 34, width: "100%", marginBottom: 8, borderRadius: 10 }} />
              <div className="skel" style={{ height: 34, width: "100%", borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0" }}>
              <UserCircle2 style={{ width: 48, height: 48, color: "var(--text-3)", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-2)", fontWeight: 600 }}>No patients found</p>
              <p style={{ color: "var(--text-3)", fontSize: 13 }}>Try a different search</p>
            </div>
          )}
          {filtered.map((patient, i) => {
            const stats = getPatientStats(patient.id);
            return (
              <SpotlightLink
                href={`/dashboard/patients/${patient.id}`}
                key={patient.id}
                className={`soft-card card-hover anim-fade-up d${Math.min(i + 1, 6)}`}
                style={{ padding: 24, textDecoration: "none", color: "inherit" }}
              >
                {patient.riskFlag && (
                  <div className="stat-chip" style={{ display: "flex", gap: 8, padding: "7px 12px", background: "var(--danger-bg)", border: "1px solid var(--danger-brd)", marginBottom: 14 }}>
                    <span style={{ fontSize: 14 }}>🚨</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>High Risk Patient</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                  <div className="team-avatar" style={{
                    width: 52, height: 52, borderRadius: "50%", fontSize: 20,
                    background: patient.riskFlag ? "var(--danger-bg)" : "var(--accent-surface)",
                    color: patient.riskFlag ? "var(--danger)" : "var(--accent)",
                    boxShadow: patient.riskFlag ? "0 0 0 2px var(--danger-brd)" : undefined
                  }}>
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{patient.name}</h3>
                    <p style={{ fontSize: 11, color: "var(--text-3)" }}>ID #{patient.id.toString().padStart(4, "0")}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <div className="soft-card-2" style={{ borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-2)" }}>
                    <Mail style={{ width: 12, height: 12, color: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{patient.email}</span>
                  </div>
                  <div className="soft-card-2" style={{ borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-2)" }}>
                    <Phone style={{ width: 12, height: 12, color: "var(--accent)", flexShrink: 0 }} />
                    <span>{patient.phone || "—"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, paddingTop: 14, borderTop: "1px solid var(--card-border)" }}>
                  {[
                    { label: "Total",   value: stats.total,     color: "var(--text-1)" },
                    { label: "Done",    value: stats.completed, color: "var(--accent)" },
                    { label: "Pending", value: stats.pending,   color: "var(--warning)" },
                  ].map(s => (
                    <div key={s.label} className="soft-card-2" style={{ borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</p>
                      <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </SpotlightLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
      <PatientsView />
    </Suspense>
  );
}