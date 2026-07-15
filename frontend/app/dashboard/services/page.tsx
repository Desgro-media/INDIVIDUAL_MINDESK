"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Sparkles, Brain, Heart, Users, RefreshCw, HelpCircle,
  ClipboardList, Home, Baby, AlertCircle, Briefcase, X,
  Save, Loader2, CheckCircle2, Clock
} from "lucide-react";
import api from "../../../lib/api";
import { SpotlightDiv } from "../../../components/Spotlight";

const ICON_OPTIONS = [
  { value: "Sparkles",     label: "Sparkles",   icon: Sparkles },
  { value: "Brain",        label: "Brain",       icon: Brain },
  { value: "Heart",        label: "Heart",       icon: Heart },
  { value: "Users",        label: "Users",       icon: Users },
  { value: "RefreshCw",    label: "Refresh",     icon: RefreshCw },
  { value: "HelpCircle",   label: "Help",        icon: HelpCircle },
  { value: "ClipboardList",label: "Clipboard",   icon: ClipboardList },
  { value: "Home",         label: "Home",        icon: Home },
  { value: "Baby",         label: "Baby",        icon: Baby },
  { value: "AlertCircle",  label: "Alert",       icon: AlertCircle },
  { value: "Briefcase",    label: "Briefcase",   icon: Briefcase },
  { value: "Repeat",       label: "Repeat",      icon: RefreshCw },
];

function getIcon(name: string, size = 16) {
  const found = ICON_OPTIONS.find(i => i.value === name);
  const Ic = found ? found.icon : Sparkles;
  return <Ic style={{ width: size, height: size }} />;
}

interface Service {
  id: number;
  name: string;
  description: string;
  duration: string;
  icon: string;
  fee: number | string;
  active: boolean;
  displayOrder: number;
  createdAt?: string;
}

const emptyForm = (): Omit<Service, "id" | "createdAt"> => ({
  name: "",
  description: "",
  duration: "50 min",
  fee: 0,
  icon: "Sparkles",
  active: true,
  displayOrder: 0,
});

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);

  const flash = (text: string, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/services");
      setServices(res.data);
    } catch {
      flash("Failed to load services.", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (svc: Service) => {
    setEditingId(svc.id);
    setForm({
      name: svc.name,
      description: svc.description || "",
      duration: svc.duration,
      fee: svc.fee || 0,
      icon: svc.icon,
      active: svc.active,
      displayOrder: svc.displayOrder,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Service name is required."); return; }
    if (!form.duration.trim()) { setFormError("Duration is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const payload = { ...form, fee: Number(form.fee) || 0 };
      if (editingId) {
        await api.put(`/services/${editingId}`, payload);
        flash("Service updated successfully!");
      } else {
        await api.post("/services", payload);
        flash("Service created successfully!");
      }
      setShowModal(false);
      fetchServices();
    } catch {
      setFormError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/services/${id}`);
      flash("Service deleted.");
      fetchServices();
    } catch {
      flash("Failed to delete service.", true);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.patch(`/services/${id}/toggle`);
      fetchServices();
    } catch {
      flash("Failed to toggle service.", true);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="anim-fade-up">

      {/* Toast */}
      {toast && (
        <div className="soft-card anim-fade-in" style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 20px", borderRadius: 16, fontSize: 13, fontWeight: 600,
          color: toast.isError ? "#b91c1c" : "#15803d", minWidth: 240
        }}>
          {toast.isError
            ? <AlertCircle style={{ width: 16, height: 16 }} />
            : <CheckCircle2 style={{ width: 16, height: 16 }} />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>Services</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Manage session types shown on the booking page</p>
        </div>
        <button onClick={openCreate} className="btn-nm-accent" style={{ padding: "12px 20px" }}>
          <Plus style={{ width: 16, height: 16 }} /> Add Service
        </button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="soft-card" style={{ padding: 22 }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                <div className="skel" style={{ width: 44, height: 44, borderRadius: 14 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skel" style={{ height: 13, width: "75%" }} />
                  <div className="skel" style={{ height: 10, width: "45%" }} />
                </div>
              </div>
              <div className="skel" style={{ height: 10, width: "100%", marginBottom: 6 }} />
              <div className="skel" style={{ height: 10, width: "80%" }} />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="soft-card" style={{ padding: "80px 40px", textAlign: "center" }}>
          <div className="icon-badge icon-badge--accent" style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px" }}>
            <Sparkles style={{ width: 32, height: 32 }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>No services yet</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}>Create your first session type to get started</p>
          <button onClick={openCreate} className="btn-nm-accent" style={{ padding: "12px 24px" }}>
            <Plus style={{ width: 16, height: 16 }} /> Create First Service
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {services.map((svc, i) => (
            <SpotlightDiv
              key={svc.id}
              className={`soft-card card-hover anim-fade-up d${Math.min(i + 1, 6)}`}
              style={{
                padding: 22, position: "relative",
                opacity: svc.active ? 1 : 0.55,
              }}
            >
              {/* Order badge */}
              <span style={{
                position: "absolute", top: 16, right: 16,
                fontSize: 10, fontFamily: "monospace", color: "var(--text-3)"
              }}>#{svc.displayOrder || "—"}</span>

              {/* Icon + Name */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                <div
                  className={svc.active ? "icon-badge" : "icon-badge soft-card-2"}
                  style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: svc.active ? "var(--accent)" : undefined,
                    color: svc.active ? "#fff" : "var(--text-3)"
                  }}
                >
                  {getIcon(svc.icon, 18)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 14, color: "var(--text-1)", lineHeight: 1.3 }}>{svc.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock style={{ width: 11, height: 11, color: "var(--text-3)" }} />
                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>{svc.duration}</span>
                    </div>
                    {Number(svc.fee) > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                          ₹{Number(svc.fee).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {svc.description && (
                <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {svc.description}
                </p>
              )}

              {/* Status + Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--card-border)" }}>
                <button
                  onClick={() => handleToggle(svc.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: svc.active ? "var(--success)" : "var(--text-3)" }}
                >
                  {svc.active
                    ? <><ToggleRight style={{ width: 18, height: 18 }} /> Active</>
                    : <><ToggleLeft style={{ width: 18, height: 18 }} /> Inactive</>}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={() => openEdit(svc)}
                    className="btn-nm"
                    style={{ width: 32, height: 32, borderRadius: "50%", padding: 0, color: "var(--accent)" }}
                    title="Edit"
                  >
                    <Pencil style={{ width: 13, height: 13 }} />
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id, svc.name)}
                    className="btn-nm"
                    style={{ width: 32, height: 32, borderRadius: "50%", padding: 0, color: "var(--danger)" }}
                    title="Delete"
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>
            </SpotlightDiv>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="overlay-enter" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} onClick={() => setShowModal(false)} />
          <div className="soft-card anim-scale-in" style={{ position: "relative", width: "100%", maxWidth: 520, overflow: "hidden" }}>
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>
                {editingId ? "Edit Service" : "New Service"}
              </h2>
              <button onClick={() => setShowModal(false)} className="icon-btn" style={{ width: 34, height: 34, borderRadius: "50%" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "65vh", overflowY: "auto" }}>

              {formError && (
                <div className="soft-card-2" style={{ borderRadius: 12, padding: "10px 14px", color: "var(--danger)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} /> {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                  Service Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Individual Therapy"
                  className="nm-input no-icon"
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description shown to patients during booking..."
                  rows={3}
                  className="nm-textarea"
                />
              </div>

              {/* Duration + Order */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="50 min"
                    className="nm-input no-icon"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                    Fee (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.fee === 0 ? "" : form.fee}
                    onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
                    placeholder="e.g. 100.00"
                    className="nm-input no-icon"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                    min={0}
                    className="nm-input no-icon"
                  />
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>
                  Icon
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                  {ICON_OPTIONS.map(opt => {
                    const Ic = opt.icon;
                    const isSelected = form.icon === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, icon: opt.value }))}
                        title={opt.label}
                        className={isSelected ? "" : "soft-card-2 card-hover"}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 10, borderRadius: 12, border: "none", cursor: "pointer",
                          background: isSelected ? "var(--accent)" : undefined,
                          color: isSelected ? "#fff" : "var(--text-2)",
                          boxShadow: isSelected ? "0 4px 14px var(--grad-1-glow)" : undefined,
                        }}
                      >
                        <Ic style={{ width: 16, height: 16 }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>Active</p>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>Visible on the booking page</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  style={{
                    position: "relative", width: 48, height: 26, borderRadius: 50,
                    border: "none", cursor: "pointer",
                    background: form.active ? "var(--accent)" : "var(--bg)",
                    boxShadow: form.active ? "2px 2px 8px #4a5bcc" : "inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)",
                    transition: "all 0.25s ease"
                  }}
                >
                  <span style={{
                    position: "absolute", top: 4, width: 18, height: 18,
                    background: form.active ? "#fff" : "var(--sd)", borderRadius: "50%",
                    transition: "left 0.25s ease",
                    left: form.active ? 26 : 4,
                    boxShadow: "1px 1px 3px rgba(0,0,0,0.2)"
                  }} />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid var(--card-border)" }}>
              <button onClick={() => setShowModal(false)} className="btn-nm" style={{ padding: "10px 20px" }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-nm-accent"
                style={{ padding: "10px 24px" }}
              >
                {saving
                  ? <><Loader2 style={{ width: 14, height: 14, animation: "spinSlow 1s linear infinite" }} /> Saving…</>
                  : <><Save style={{ width: 14, height: 14 }} /> Save Service</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
