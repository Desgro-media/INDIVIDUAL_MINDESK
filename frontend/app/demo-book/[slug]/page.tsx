"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  User, Mail, Phone, PhoneCall, CheckCircle2,
  ChevronRight, Loader2, ArrowLeft, Sparkles, Brain,
  Heart, Users, RefreshCw, HelpCircle, ClipboardList,
  Home, Baby, AlertCircle, Briefcase,
} from "lucide-react";
import publicApi from "../../../lib/publicApi";

function ServiceIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    Sparkles:      <Sparkles className={className} />,
    Brain:         <Brain className={className} />,
    Heart:         <Heart className={className} />,
    Users:         <Users className={className} />,
    RefreshCw:     <RefreshCw className={className} />,
    Repeat:        <RefreshCw className={className} />,
    HelpCircle:    <HelpCircle className={className} />,
    ClipboardList: <ClipboardList className={className} />,
    Home:          <Home className={className} />,
    Baby:          <Baby className={className} />,
    AlertCircle:   <AlertCircle className={className} />,
    Briefcase:     <Briefcase className={className} />,
  };
  return <>{icons[name] ?? <Sparkles className={className} />}</>;
}

interface ApiService {
  id: number;
  name: string;
  description?: string;
  duration: string;
  icon: string;
  fee: number;
  active: boolean;
}

export default function DemoBookingPage() {
  const params = useParams();
  const slug = String(params.slug);

  const [form, setForm] = useState({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    serviceInterest: "",
    preferredTime: "",
    notes: "",
  });
  const [practitionerName, setPractitionerName] = useState("");
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    publicApi.get(`/public/${slug}/info`).then(res => setPractitionerName(res.data.name)).catch(() => {});
    publicApi.get(`/public/${slug}/services/catalog`).then(res => setServices(res.data.filter((s: ApiService) => s.active))).catch(() => {});
  }, [slug]);

  const set = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setError("");
  };

  const validate = () => {
    if (!form.patientName.trim()) return "Please enter your full name.";
    if (!form.patientEmail.trim() || !/\S+@\S+\.\S+/.test(form.patientEmail)) return "Please enter a valid email address.";
    if (!form.patientPhone.trim()) return "Please enter your phone number.";
    return "";
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await publicApi.post("/demo-booking", {
        patientName:     form.patientName.trim(),
        patientEmail:    form.patientEmail.trim(),
        patientPhone:    form.patientPhone.trim(),
        serviceInterest: form.serviceInterest || null,
        preferredTime:   form.preferredTime.trim() || null,
        notes:           form.notes.trim() || null,
        slug,
      });
      setSubmitted(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.response?.data || err?.message || "";
      setError(`Error ${status ?? "network"}: ${typeof msg === "string" && msg ? msg : "Something went wrong."}`);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
        <div className="nm-raised-lg anim-scale-in" style={{ width: "100%", maxWidth: 460, borderRadius: 32, padding: "40px 32px", textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px",
            background: "var(--bg)",
            boxShadow: "4px 4px 14px var(--sd), -4px -4px 14px var(--sl)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircle2 style={{ width: 36, height: 36, color: "var(--accent)" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", marginBottom: 10 }}>Request Received!</h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 32 }}>
            Thank you, <strong>{form.patientName}</strong>. We&apos;ll reach out to{" "}
            <strong>{form.patientPhone}</strong> shortly to schedule your demo call.
          </p>
          <Link href="/" className="btn-nm-accent" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 50, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>

      {/* Back link */}
      <div style={{ width: "100%", maxWidth: 500, marginBottom: 16 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)", textDecoration: "none", fontWeight: 600 }}>
          <ArrowLeft style={{ width: 13, height: 13 }} /> Back to Home
        </Link>
      </div>

      <div className="nm-raised-lg" style={{ width: "100%", maxWidth: 500, borderRadius: 32, padding: "36px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, flexShrink: 0,
            background: "var(--bg)",
            boxShadow: "3px 3px 10px var(--sd), -3px -3px 10px var(--sl)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent)",
          }}>
            <PhoneCall style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>Request a Demo Call</h1>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
              {practitionerName ? `${practitionerName} will call you back to answer your questions.` : "We'll call you back to answer your questions."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
              Full Name *
            </label>
            <div style={{ position: "relative" }}>
              <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)" }} />
              <input
                className="nm-input"
                style={{ paddingLeft: 42 }}
                placeholder="Your full name"
                value={form.patientName}
                onChange={e => set("patientName", e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
              Email *
            </label>
            <div style={{ position: "relative" }}>
              <Mail style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)" }} />
              <input
                className="nm-input"
                style={{ paddingLeft: 42 }}
                type="email"
                placeholder="you@example.com"
                value={form.patientEmail}
                onChange={e => set("patientEmail", e.target.value)}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
              Phone Number *
            </label>
            <div style={{ position: "relative" }}>
              <Phone style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)" }} />
              <input
                className="nm-input"
                style={{ paddingLeft: 42 }}
                type="tel"
                placeholder="+91 98765 43210"
                value={form.patientPhone}
                onChange={e => set("patientPhone", e.target.value)}
              />
            </div>
          </div>

          {/* Service Interest */}
          {services.length > 0 && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Interested In <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {services.map(s => {
                  const selected = form.serviceInterest === String(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => set("serviceInterest", selected ? "" : String(s.id))}
                      style={{
                        textAlign: "left", padding: "10px 12px", borderRadius: 14,
                        border: "none", cursor: "pointer",
                        background: selected ? "rgba(91,109,232,0.08)" : "var(--bg)",
                        boxShadow: selected
                          ? "inset 2px 2px 6px rgba(91,109,232,0.15), inset -1px -1px 4px rgba(255,255,255,0.6)"
                          : "3px 3px 7px var(--sd), -3px -3px 7px var(--sl)",
                        display: "flex", alignItems: "center", gap: 8,
                        transition: "all 0.2s",
                      }}
                    >
                      <span style={{ color: selected ? "var(--accent)" : "var(--text-3)", flexShrink: 0 }}>
                        <ServiceIcon name={s.icon} className="w-3.5 h-3.5" />
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: selected ? "var(--accent)" : "var(--text-1)", lineHeight: 1.3 }}>
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preferred Time */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
              Preferred Time <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
            </label>
            <input
              className="nm-input"
              placeholder="e.g. Weekday mornings, after 6 PM…"
              value={form.preferredTime}
              onChange={e => set("preferredTime", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
              Anything else? <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
            </label>
            <textarea
              className="nm-textarea"
              rows={3}
              placeholder="Share what's on your mind…"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "rgba(239,68,68,0.08)", color: "#b91c1c", fontSize: 13, fontWeight: 500 }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} /> {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="btn-nm-accent"
            style={{ marginTop: 4, padding: "14px", borderRadius: 50, fontSize: 15, fontWeight: 700 }}
            onClick={submit}
            disabled={loading}
          >
            {loading
              ? <><Loader2 style={{ width: 15, height: 15, animation: "spinSlow 1s linear infinite" }} /> Sending…</>
              : <><PhoneCall style={{ width: 15, height: 15 }} /> Request Demo Call <ChevronRight style={{ width: 15, height: 15 }} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
