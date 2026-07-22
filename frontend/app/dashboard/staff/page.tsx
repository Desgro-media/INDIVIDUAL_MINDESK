"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, X, Loader2, Check, Clock, UserCog,
  ShieldCheck, ShieldOff, RefreshCw, Brain, UserCheck,
  User, Lock, Mail, AlertCircle, CheckCircle2, LogIn, LogOut,
} from "lucide-react";
import { SpotlightDiv } from "../../../components/Spotlight";
import {
  getAllStaff, createStaff, updateStaff, updatePermissions, updateStaffDetails,
  deactivateStaff, reactivateStaff, getAllAttendance, getActiveStaff,
  StaffMember, AttendanceRecord, CreateStaffPayload,
} from "../../../lib/staffApi";

const ALL_PERMISSIONS = [
  { key: "APPOINTMENTS", label: "Appointments" },
  { key: "PATIENTS",     label: "Patients" },
  { key: "BILLING",      label: "Billing" },
  { key: "ANALYTICS",    label: "Analytics" },
  { key: "SETTINGS",     label: "Settings & Services" },
];

const ROLES = [
  { value: "ROLE_STAFF",        label: "Staff" },
  { value: "ROLE_RECEPTIONIST", label: "Receptionist" },
  { value: "ROLE_PSYCHOLOGIST", label: "Psychologist" },
];

function roleBadge(role: string) {
  const map: Record<string, { label: string; cls: string }> = {
    ROLE_PSYCHOLOGIST: { label: "Psychologist", cls: "bg-purple-50 text-purple-700 border-purple-200" },
    ROLE_RECEPTIONIST: { label: "Receptionist", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    ROLE_STAFF:         { label: "Staff",        cls: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const { label, cls } = map[role] ?? { label: role, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes === 0) return "< 1m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

const emptyForm = (): CreateStaffPayload => ({
  name: "", username: "", password: "", jobTitle: "",
  role: "ROLE_STAFF", permissions: [], bio: "", bookable: false,
});

export default function StaffPage() {
  const [tab, setTab] = useState<"members" | "attendance">("members");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingPermsFor, setSavingPermsFor] = useState<number | null>(null);

  const flash = (text: string, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      setStaff(await getAllStaff());
    } catch {
      flash("Failed to load staff.", true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setFormError("Name, email, and password are required.");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await createStaff(form);
      flash(`"${form.name}" added to your team.`);
      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to create account.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (member: StaffMember) => {
    if (!window.confirm(`Deactivate ${member.name}? They won't be able to log in or take new bookings, but their history is kept.`)) return;
    try {
      await deactivateStaff(member.id);
      flash(`${member.name} deactivated.`);
      fetchStaff();
    } catch (err: any) {
      flash(err?.response?.data?.message || "Failed to deactivate.", true);
    }
  };

  const handleReactivate = async (member: StaffMember) => {
    try {
      await reactivateStaff(member.id);
      flash(`${member.name} reactivated.`);
      fetchStaff();
    } catch (err: any) {
      flash(err?.response?.data?.message || "Failed to reactivate.", true);
    }
  };

  const handleTogglePermission = async (member: StaffMember, key: string) => {
    const updated = member.permissions.includes(key)
      ? member.permissions.filter(p => p !== key)
      : [...member.permissions, key];
    setSavingPermsFor(member.id);
    try {
      await updatePermissions(member.id, updated);
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, permissions: updated } : s));
    } catch {
      flash("Failed to update permissions.", true);
    } finally {
      setSavingPermsFor(null);
    }
  };

  const toggleFormPermission = (key: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key],
    }));
  };

  const psychologists = staff.filter(s => s.role === "ROLE_PSYCHOLOGIST");
  const others = staff.filter(s => s.role !== "ROLE_PSYCHOLOGIST");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="anim-fade-up">

      {toast && (
        <div className="soft-card anim-fade-in" style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 20px", borderRadius: 16, fontSize: 13, fontWeight: 600,
          color: toast.isError ? "#b91c1c" : "#15803d", minWidth: 240,
        }}>
          {toast.isError ? <AlertCircle style={{ width: 16, height: 16 }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
          {toast.text}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Staff Management</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Add practitioners and support staff, control what they can see, and track logins.
          </p>
        </div>
        {tab === "members" && (
          <button onClick={openCreate} className="btn-nm-accent" style={{ padding: "12px 20px" }}>
            <Plus style={{ width: 16, height: 16 }} /> Add Staff
          </button>
        )}
      </div>

      <div className="soft-card-2" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, width: "fit-content" }}>
        <button onClick={() => setTab("members")}
          className={`tab-pill${tab === "members" ? " active" : ""}`}
          style={{
            padding: "9px 20px", borderRadius: 11, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13,
            background: tab === "members" ? "var(--card)" : "transparent",
            color: tab === "members" ? "var(--text-1)" : "var(--text-3)",
            boxShadow: tab === "members" ? "0 2px 8px var(--card-shadow-1)" : undefined,
          }}>
          Staff Members
        </button>
        <button onClick={() => setTab("attendance")}
          className={`tab-pill${tab === "attendance" ? " active" : ""}`}
          style={{
            padding: "9px 20px", borderRadius: 11, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
            background: tab === "attendance" ? "var(--card)" : "transparent",
            color: tab === "attendance" ? "var(--text-1)" : "var(--text-3)",
            boxShadow: tab === "attendance" ? "0 2px 8px var(--card-shadow-1)" : undefined,
          }}>
          <Clock style={{ width: 14, height: 14 }} /> Attendance
        </button>
      </div>

      {tab === "members" && (
        loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 style={{ width: 24, height: 24, color: "var(--accent)", animation: "spinSlow 1s linear infinite" }} />
          </div>
        ) : staff.length === 0 ? (
          <div className="soft-card" style={{ padding: "80px 40px", textAlign: "center" }}>
            <div className="icon-badge icon-badge--accent" style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px" }}>
              <UserCog style={{ width: 32, height: 32 }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>No staff yet</p>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}>Add your first team member to get started</p>
            <button onClick={openCreate} className="btn-nm-accent" style={{ padding: "12px 24px" }}>
              <Plus style={{ width: 16, height: 16 }} /> Add Staff
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {psychologists.length > 0 && (
              <div>
                <h2 style={{ fontSize: 12, fontWeight: 800, color: "#8075C4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <Brain style={{ width: 14, height: 14 }} /> Psychologists
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {psychologists.map(m => (
                    <StaffCard key={m.id} member={m} savingPerms={savingPermsFor === m.id}
                      onTogglePermission={key => handleTogglePermission(m, key)}
                      onDeactivate={() => handleDeactivate(m)} onReactivate={() => handleReactivate(m)}
                      onRefresh={fetchStaff} flash={flash} />
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                <h2 style={{ fontSize: 12, fontWeight: 800, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <UserCheck style={{ width: 14, height: 14 }} /> Support Staff
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {others.map(m => (
                    <StaffCard key={m.id} member={m} savingPerms={savingPermsFor === m.id}
                      onTogglePermission={key => handleTogglePermission(m, key)}
                      onDeactivate={() => handleDeactivate(m)} onReactivate={() => handleReactivate(m)}
                      onRefresh={fetchStaff} flash={flash} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {tab === "attendance" && <AttendanceTab />}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="overlay-enter" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} onClick={() => setShowModal(false)} />
          <div className="soft-card anim-scale-in" style={{ position: "relative", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>New Staff Account</h2>
              <button onClick={() => setShowModal(false)} className="icon-btn" style={{ width: 34, height: 34, borderRadius: "50%" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              {formError && (
                <div className="soft-card-2" style={{ borderRadius: 12, padding: "10px 14px", color: "var(--danger)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} /> {formError}
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Role</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))}
                      className="btn-nm" style={{
                        padding: "10px 8px", fontSize: 12, fontWeight: 600,
                        background: form.role === r.value ? "var(--accent)" : undefined,
                        color: form.role === r.value ? "#fff" : "var(--text-2)",
                      }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                  <input className="nm-input" style={{ paddingLeft: 38 }} placeholder="Full name"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Job Title</label>
                <input className="nm-input" placeholder="e.g. Clinical Psychologist, Front Desk"
                  value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Login Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                  <input type="email" className="nm-input" style={{ paddingLeft: 38 }} placeholder="staff@example.com"
                    value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                  <input type="password" className="nm-input" style={{ paddingLeft: 38 }} placeholder="At least 8 characters"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
              </div>

              {form.role === "ROLE_PSYCHOLOGIST" && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                    Bookable (appears on your public booking page)
                  </label>
                  <button type="button" onClick={() => setForm(f => ({ ...f, bookable: !f.bookable }))}
                    className="btn-nm" style={{ padding: "8px 16px", fontSize: 12 }}>
                    {form.bookable ? <ShieldCheck style={{ width: 14, height: 14 }} /> : <ShieldOff style={{ width: 14, height: 14 }} />}
                    {form.bookable ? "Yes — clients can book them" : "No — hidden from booking page"}
                  </button>
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>
                    Once created, this practitioner logs in themselves to set their own bio, services, and availability.
                  </p>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                  Dashboard Access
                  {form.role === "ROLE_PSYCHOLOGIST" && <span style={{ textTransform: "none", fontWeight: 400 }}> — Appointments &amp; Patients always included</span>}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {ALL_PERMISSIONS.filter(p => !(form.role === "ROLE_PSYCHOLOGIST" && (p.key === "APPOINTMENTS" || p.key === "PATIENTS"))).map(perm => {
                    const active = form.permissions.includes(perm.key);
                    return (
                      <button key={perm.key} type="button" onClick={() => toggleFormPermission(perm.key)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12,
                          border: `1px solid ${active ? "var(--accent)" : "var(--card-border)"}`,
                          background: active ? "rgba(79,110,247,0.08)" : "transparent",
                          color: active ? "var(--accent)" : "var(--text-3)", cursor: "pointer",
                        }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: active ? "var(--accent)" : "var(--card-border)" }}>
                          {active && <Check style={{ width: 9, height: 9, color: "#fff" }} strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{perm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-nm-accent" style={{ width: "100%", padding: "12px 0", marginTop: 4 }}>
                {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spinSlow 1s linear infinite" }} /> : <Plus style={{ width: 14, height: 14 }} />}
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Staff card ────────────────────────────────────────────────────────────
function StaffCard({ member, savingPerms, onTogglePermission, onDeactivate, onReactivate, onRefresh, flash }: {
  member: StaffMember;
  savingPerms: boolean;
  onTogglePermission: (key: string) => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onRefresh: () => void;
  flash: (text: string, isError?: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const isDoctor = member.role === "ROLE_PSYCHOLOGIST";

  const handleSave = async () => {
    if (!name.trim()) { flash("Name cannot be empty.", true); return; }
    setSaving(true);
    try {
      await updateStaffDetails(member.id, { name: name.trim(), role });
      flash("Staff details updated.");
      setEditing(false);
      onRefresh();
    } catch (err: any) {
      flash(err?.response?.data?.message || "Failed to update.", true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SpotlightDiv className="soft-card p-5" style={{ opacity: member.enabled ? 1 : 0.6 }}>
      <div className="flex justify-between items-start" style={{ marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div className="flex items-center gap-3">
          <div className="team-avatar" style={{ width: 42, height: 42, borderRadius: "50%", fontSize: 16 }}>
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            {editing ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="nm-input" style={{ fontSize: 12, padding: "6px 10px", width: 160 }} />
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="nm-input" style={{ fontSize: 12, padding: "6px 10px" }}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button onClick={handleSave} disabled={saving} className="btn-nm-accent" style={{ padding: "6px 14px", fontSize: 11 }}>
                  {saving ? "…" : "Save"}
                </button>
                <button onClick={() => setEditing(false)} disabled={saving} className="btn-nm" style={{ padding: "6px 12px", fontSize: 11 }}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-1)" }}>{member.name}</p>
                  {roleBadge(member.role)}
                  {isDoctor && member.bookable && (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">Bookable</span>
                  )}
                  {!member.enabled && (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">Deactivated</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                  {member.username}{member.jobTitle ? ` · ${member.jobTitle}` : ""}
                </p>
              </>
            )}
          </div>
        </div>
        {!editing && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setEditing(true)} className="icon-btn" title="Edit name & role">
              <Pencil style={{ width: 14, height: 14 }} />
            </button>
            {member.enabled ? (
              <button onClick={onDeactivate} className="icon-btn" title="Deactivate" style={{ color: "var(--danger)" }}>
                <ShieldOff style={{ width: 14, height: 14 }} />
              </button>
            ) : (
              <button onClick={onReactivate} className="icon-btn" title="Reactivate" style={{ color: "var(--success)" }}>
                <ShieldCheck style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Dashboard Access {isDoctor && <span style={{ fontWeight: 400, textTransform: "none" }}>(Appointments &amp; Patients always included)</span>}
          {savingPerms && <span style={{ color: "var(--accent)", fontWeight: 400, textTransform: "none", marginLeft: 6 }}>saving…</span>}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ALL_PERMISSIONS.filter(p => !(isDoctor && (p.key === "APPOINTMENTS" || p.key === "PATIENTS"))).map(perm => {
            const active = member.permissions.includes(perm.key);
            return (
              <button key={perm.key} onClick={() => onTogglePermission(perm.key)} disabled={savingPerms || !member.enabled}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10,
                  border: `1px solid ${active ? "var(--accent)" : "var(--card-border)"}`,
                  background: active ? "rgba(79,110,247,0.08)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-3)", cursor: member.enabled ? "pointer" : "not-allowed",
                  fontSize: 11, fontWeight: 500,
                }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: active ? "var(--accent)" : "var(--card-border)" }}>
                  {active && <Check style={{ width: 8, height: 8, color: "#fff" }} strokeWidth={3} />}
                </div>
                {perm.label}
              </button>
            );
          })}
        </div>
      </div>
    </SpotlightDiv>
  );
}

// ── Attendance tab ───────────────────────────────────────────────────────
function AttendanceTab() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [active, setActive] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [all, activeNow] = await Promise.all([getAllAttendance(), getActiveStaff()]);
      setRecords(all);
      setActive(activeNow);
    } catch {
      // best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--accent)", animation: "spinSlow 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
          <h2 style={{ fontSize: 12, fontWeight: 800, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Currently Active</h2>
          <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.12)", color: "var(--success)", padding: "1px 8px", borderRadius: 20 }}>{active.length}</span>
          <button onClick={fetchData} className="icon-btn" style={{ marginLeft: "auto" }} title="Refresh">
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>
        {active.length === 0 ? (
          <div className="soft-card-2" style={{ padding: 32, textAlign: "center", borderRadius: 16 }}>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>No staff currently logged in</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {active.map(rec => (
              <div key={rec.id} className="soft-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <div className="team-avatar" style={{ width: 36, height: 36, borderRadius: "50%", fontSize: 14 }}>
                  {rec.staffName.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{rec.staffName}</p>
                  <p style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
                    <LogIn style={{ width: 10, height: 10 }} /> {new Date(rec.loginTime + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: 12, fontWeight: 800, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Login History</h2>
        {records.length === 0 ? (
          <div className="soft-card-2" style={{ padding: 32, textAlign: "center", borderRadius: 16 }}>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>No records yet</p>
          </div>
        ) : (
          <div className="soft-card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--soft-2, rgba(0,0,0,0.02))", borderBottom: "1px solid var(--card-border)" }}>
                  {["Staff", "Date", "Login", "Logout", "Worked", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td style={{ padding: "10px 16px" }}>
                      <p style={{ fontWeight: 600, color: "var(--text-1)" }}>{rec.staffName}</p>
                      <p style={{ fontSize: 11, color: "var(--text-3)" }}>{rec.staffJobTitle || "Staff"}</p>
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--text-2)" }}>{rec.date}</td>
                    <td style={{ padding: "10px 16px", color: "var(--success)" }}>
                      {new Date(rec.loginTime + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "10px 16px", color: rec.logoutTime ? "var(--danger)" : "var(--text-3)" }}>
                      {rec.logoutTime ? new Date(rec.logoutTime + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--text-1)", fontWeight: 600 }}>{formatDuration(rec.workMinutes)}</td>
                    <td style={{ padding: "10px 16px" }}>
                      {rec.logoutTime ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: "var(--card-border)", color: "var(--text-3)", padding: "2px 10px", borderRadius: 20 }}>
                          <LogOut style={{ width: 10, height: 10 }} /> Logged out
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: "rgba(34,197,94,0.12)", color: "var(--success)", padding: "2px 10px", borderRadius: 20 }}>
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
