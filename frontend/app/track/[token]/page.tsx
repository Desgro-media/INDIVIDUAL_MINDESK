"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "../../../components/ThemeToggle";
import {
  Clock, CheckCircle, XCircle, RefreshCw,
  Calendar, User, ArrowRight,
  Sparkles, AlertTriangle, Star, Copy, Check,
  Home, RotateCcw, Shield, CreditCard, Search, UploadCloud
} from "lucide-react";
import api from "../../../lib/api";
import { format, parseISO } from "date-fns";

const formatTime = (timeStr?: string) => {
  if (!timeStr) return "—";
  try {
    return format(parseISO(`2000-01-01T${timeStr}`), "h:mm a");
  } catch {
    return timeStr;
  }
};

// ── Skeleton loader ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="nm-raised-lg" style={{ borderRadius: 28, padding: 32, width: "100%", maxWidth: 500, margin: "0 auto", animation: "pulseOpacity 2s infinite" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div className="nm-inset" style={{ width: 56, height: 56, borderRadius: "50%" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="nm-inset" style={{ height: 16, width: "60%", borderRadius: 8 }} />
          <div className="nm-inset" style={{ height: 12, width: "80%", borderRadius: 6 }} />
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div className="nm-inset" style={{ width: 40, height: 40, borderRadius: "50%" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="nm-inset" style={{ height: 12, width: "30%", borderRadius: 6 }} />
            <div className="nm-inset" style={{ height: 14, width: "50%", borderRadius: 7 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PENDING state ──────────────────────────────────────────────────────────
function PendingView({ appointment, onRefresh }: { appointment: any; onRefresh: () => void }) {
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setLastRefreshed(new Date());
    setTimeout(() => setRefreshing(false), 800);
  };

  useEffect(() => {
    const id = setInterval(() => { handleRefresh(); }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="anim-fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
      <div className="nm-raised-lg" style={{ borderRadius: 28, padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)", textAlign: "center", marginBottom: 24 }}>
        
        {/* Animated rings */}
        <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 24px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(251, 191, 36, 0.3)", animation: "pulseRing 2s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: "2px solid rgba(251, 191, 36, 0.5)", animation: "pulseRing 2s ease-in-out 0.3s infinite" }} />
          <div className="nm-raised" style={{ position: "absolute", inset: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock style={{ width: 28, height: 28, color: "var(--warning)" }} />
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 50, background: "rgba(251, 191, 36, 0.1)", color: "#d97706", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Booking Received
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>
          We&apos;ve Got Your Request
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 32, lineHeight: 1.6 }}>
          Your booking is being processed. You&apos;ll receive an
          <strong style={{ color: "var(--text-1)" }}> SMS & email</strong> with payment instructions shortly.
        </p>

        {/* Appointment mini-summary */}
        <div className="nm-inset" style={{ borderRadius: 20, padding: 20, textAlign: "left", display: "flex", flexDirection: "column", gap: 16 }}>
          {appointment.appointmentDate && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="nm-raised-sm" style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar style={{ width: 18, height: 18, color: "var(--accent)" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Date</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{format(parseISO(appointment.appointmentDate), "EEEE, MMMM d, yyyy")}</p>
              </div>
            </div>
          )}
          {appointment.startTime && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="nm-raised-sm" style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock style={{ width: 18, height: 18, color: "var(--accent)" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Time</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{appointment.startTime}</p>
              </div>
            </div>
          )}
          {appointment.sessionType && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="nm-raised-sm" style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles style={{ width: 18, height: 18, color: "var(--accent)" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Session</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{appointment.sessionName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Telegram Connect Button */}
        {process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME && !appointment.telegramConnected && (
          <div style={{ marginTop: 24, padding: 16, background: "rgba(79, 110, 247, 0.05)", borderRadius: 20, border: "1px solid rgba(79, 110, 247, 0.1)" }}>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12, fontWeight: 500 }}>
              Want instant updates on your phone?
            </p>
            <a 
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${appointment.trackingToken || ""}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-nm-accent" 
              style={{ width: "100%", textDecoration: "none", background: "#0088cc", color: "#fff" }}
            >
              Get Updates on Telegram
            </a>
          </div>
        )}
      </div>

      <button onClick={handleRefresh} disabled={refreshing} className="btn-nm" style={{ width: "100%", marginBottom: 16 }}>
        <RefreshCw style={{ width: 16, height: 16, animation: refreshing ? "spinSlow 1s linear infinite" : "none" }} />
        {refreshing ? "Refreshing…" : "Refresh Status"}
      </button>
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-3)" }}>
        Last checked: {format(lastRefreshed, "h:mm:ss a")} · Auto-refreshes every 30s
      </p>
    </div>
  );
}

// ── AWAITING PAYMENT state ───────────────────────────────────────────────────
function AwaitingPaymentView({ appointment, clinicInfo, bankAccounts, token, onRefresh }: { appointment: any; clinicInfo: any; bankAccounts: BankAccount[]; token: string; onRefresh: () => void }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setScreenshotBase64(dataUrl);
        setError("");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePay = async () => {
    if (!screenshotBase64) {
      setError("Please upload your payment screenshot.");
      return;
    }
    setPaying(true);
    setError("");
    try {
      await api.post(`/track/${token}/report-payment`, { paymentScreenshotBase64: screenshotBase64 });
      onRefresh();
    } catch (err) {
      setError("Failed to report payment. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="anim-fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
      <div className="nm-raised-lg" style={{ borderRadius: 28, padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)", textAlign: "center", marginBottom: 24 }}>
        <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 24px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(234, 88, 12, 0.3)", animation: "pulseRing 2s ease-in-out infinite" }} />
          <div className="nm-raised" style={{ position: "absolute", inset: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CreditCard style={{ width: 28, height: 28, color: "#ea580c" }} />
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 50, background: "rgba(234, 88, 12, 0.1)", color: "#c2410c", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Payment Required
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>
          Complete Your Payment
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.6 }}>
          Please transfer the session fee to the account below, then upload a screenshot of your successful payment to confirm.
        </p>

        {/* Appointment mini-summary */}
        <div className="nm-inset" style={{ borderRadius: 20, padding: 20, textAlign: "left", display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {appointment.appointmentDate && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="nm-raised-sm" style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar style={{ width: 18, height: 18, color: "var(--accent)" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Date</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{format(parseISO(appointment.appointmentDate), "EEEE, MMMM d, yyyy")}</p>
              </div>
            </div>
          )}
          {appointment.startTime && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="nm-raised-sm" style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock style={{ width: 18, height: 18, color: "var(--accent)" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Time</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{formatTime(appointment.startTime)}</p>
              </div>
            </div>
          )}
          {appointment.sessionType && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="nm-raised-sm" style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles style={{ width: 18, height: 18, color: "var(--accent)" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Session</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{appointment.sessionName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Telegram Connect Button */}
        {process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME && !appointment.telegramConnected && (
          <div style={{ marginBottom: 24, padding: 16, background: "rgba(79, 110, 247, 0.05)", borderRadius: 20, border: "1px solid rgba(79, 110, 247, 0.1)" }}>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12, fontWeight: 500 }}>
              Want instant updates on your phone?
            </p>
            <a 
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${appointment.trackingToken || ""}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-nm-accent" 
              style={{ width: "100%", textDecoration: "none", background: "#0088cc", color: "#fff" }}
            >
              Get Updates on Telegram
            </a>
          </div>
        )}

        {/* Payment QR & Details Box */}
        {(() => {
          const primaryAccount = bankAccounts.find(b => b.isDefault) ?? bankAccounts[0] ?? null;
          const qrSrc = primaryAccount?.qrCodeBase64 || clinicInfo?.paymentQrCodeUrl || null;
          return (
            <div className="nm-inset" style={{ padding: "20px", borderRadius: 16, marginBottom: 24, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>Total Amount Due</p>
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent)", marginBottom: 20 }}>
                ₹{appointment?.fee?.toFixed(2) || "0.00"}
              </div>

              {primaryAccount && (
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>
                  {primaryAccount.accountName || primaryAccount.bankName}
                </p>
              )}

              {qrSrc ? (
                <div style={{ background: "#fff", padding: 12, borderRadius: 16, display: "inline-block", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", marginBottom: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrSrc} alt="Payment QR Code" style={{ width: 200, height: 200, objectFit: "contain", borderRadius: 8 }} />
                </div>
              ) : (
                <div style={{ width: 200, height: 200, margin: "0 auto 12px", background: "rgba(0,0,0,0.02)", border: "2px dashed var(--border)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 13 }}>
                  No QR Code configured
                </div>
              )}

              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
                Scan the QR code above to make your payment.
              </p>
            </div>
          );
        })()}

        <div style={{ textAlign: "left", marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 8 }}>
            Payment Screenshot
          </label>
          {screenshotBase64 ? (
            <div style={{ position: "relative", width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotBase64} alt="Payment Screenshot" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
              <button 
                onClick={() => setScreenshotBase64(null)}
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <XCircle style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ) : (
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "32px 16px", background: "rgba(0,0,0,0.02)", border: "2px dashed var(--border)", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}>
              <UploadCloud style={{ width: 32, height: 32, color: "var(--accent)", marginBottom: 12 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>Click to Upload Screenshot</span>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>JPG, PNG or GIF (Max 5MB)</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button 
          onClick={handlePay} 
          disabled={paying}
          style={{ width: "100%", padding: "16px 20px", borderRadius: 50, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}
        >
          {paying ? (
            <><RefreshCw style={{ width: 18, height: 18, animation: "spinSlow 1s linear infinite" }} /> Submitting...</>
          ) : (
            <><CheckCircle style={{ width: 18, height: 18 }} /> I Have Paid</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── PAYMENT UNDER REVIEW state ───────────────────────────────────────────────
function PaymentUnderReviewView({ onRefresh }: { onRefresh: () => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="anim-fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
      <div className="nm-raised-lg" style={{ borderRadius: 28, padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)", textAlign: "center", marginBottom: 24 }}>
        
        <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 24px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(139, 92, 246, 0.3)", animation: "pulseRing 2s ease-in-out infinite" }} />
          <div className="nm-raised" style={{ position: "absolute", inset: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Search style={{ width: 28, height: 28, color: "#8b5cf6" }} />
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 50, background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Verifying Payment
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>
          Payment Reported
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 32, lineHeight: 1.6 }}>
          Thank you! We are currently verifying your payment with our bank. Your appointment will be confirmed shortly.
        </p>

        <button onClick={handleRefresh} disabled={refreshing} className="btn-nm" style={{ width: "100%" }}>
          <RefreshCw style={{ width: 16, height: 16, animation: refreshing ? "spinSlow 1s linear infinite" : "none" }} />
          {refreshing ? "Checking..." : "Check Status"}
        </button>
      </div>
    </div>
  );
}

// ── CONFIRMED state ─────────────────────────────────────────────────────────
function ConfirmedView({ appointment }: { appointment: any }) {
  const [copied, setCopied] = useState(false);
  const trackingLink = typeof window !== "undefined" ? window.location.href : "";

  const copy = () => {
    navigator.clipboard.writeText(trackingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="anim-fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
      <div className="nm-raised-lg" style={{ borderRadius: 28, padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)", textAlign: "center" }}>
        
        <div style={{ margin: "0 auto 24px", width: 80, height: 80, borderRadius: "50%", background: "var(--bg)", boxShadow: "5px 5px 12px var(--sd), -5px -5px 12px var(--sl)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="nm-inset" style={{ width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle style={{ width: 32, height: 32, color: "var(--success)" }} />
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 50, background: "rgba(74, 222, 128, 0.1)", color: "var(--success)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Confirmed
        </div>
        
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>
          Appointment Confirmed!
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 32 }}>
          The doctor has approved your appointment. We&apos;ve sent the details to your phone and email.
        </p>

        {/* Full details */}
        <div className="nm-inset" style={{ borderRadius: 20, padding: 20, textAlign: "left", display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
          {[
            { icon: <User style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Patient", value: appointment.patientName },
            { icon: <Calendar style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Date", value: appointment.appointmentDate ? format(parseISO(appointment.appointmentDate), "EEEE, MMMM d, yyyy") : "—" },
            { icon: <Clock style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Time", value: formatTime(appointment.startTime) },
            { icon: <Sparkles style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Session", value: appointment.sessionName },
          ].filter(r => r.value).map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="nm-raised-sm" style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {row.icon}
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{row.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Share link */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div className="nm-input" style={{ flex: 1, padding: "12px 16px", fontSize: 12, color: "var(--accent)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {trackingLink}
          </div>
          <button onClick={copy} className="btn-nm" style={{ padding: 0, width: 44, height: 44, flexShrink: 0, color: copied ? "var(--success)" : "var(--text-2)" }}>
            {copied ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
          </button>
        </div>

        <Link href="/" className="btn-nm" style={{ width: "100%", textDecoration: "none" }}>
          <Home style={{ width: 16, height: 16 }} /> Back to Home
        </Link>
      </div>
    </div>
  );
}

// ── CANCELLED state ─────────────────────────────────────────────────────────
function CancelledView({ appointment, token }: { appointment: any; token: string }) {
  const router = useRouter();
  return (
    <div className="anim-fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
      <div className="nm-raised-lg" style={{ borderRadius: 28, padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)", textAlign: "center" }}>
        
        <div style={{ margin: "0 auto 24px", width: 80, height: 80, borderRadius: "50%", background: "var(--bg)", boxShadow: "5px 5px 12px var(--sd), -5px -5px 12px var(--sl)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="nm-inset" style={{ width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XCircle style={{ width: 32, height: 32, color: "var(--danger)" }} />
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 50, background: "rgba(248, 113, 113, 0.1)", color: "var(--danger)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Cancelled
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>Appointment Cancelled</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 32 }}>
          We&apos;re sorry this appointment was cancelled. You can easily rebook a new slot below.
        </p>

        {appointment.cancellationReason && (
          <div className="nm-inset" style={{ borderRadius: 16, padding: 16, display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24, textAlign: "left" }}>
            <AlertTriangle style={{ width: 18, height: 18, color: "var(--danger)", marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Reason for cancellation</p>
              <p style={{ fontSize: 13, color: "var(--text-1)" }}>{appointment.cancellationReason}</p>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button onClick={() => router.push(`/track/${token}/rebook`)} className="btn-nm-accent" style={{ width: "100%" }}>
            <RotateCcw style={{ width: 16, height: 16 }} /> Book a New Slot <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
          <Link href="/" className="btn-nm" style={{ width: "100%", textDecoration: "none", color: "var(--text-2)" }}>
            <Home style={{ width: 16, height: 16 }} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── COMPLETED state ─────────────────────────────────────────────────────────
function CompletedView({ appointment, token }: { appointment: any; token: string }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!appointment.rating);
  const [error, setError] = useState("");

  const displayRating = appointment.rating || rating;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/track/${token}/rating`, { rating, feedback });
      setSubmitted(true);
      setError("");
    } catch {
      setError("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="anim-fade-up" style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
      <div className="nm-raised-lg" style={{ borderRadius: 28, padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)", textAlign: "center" }}>
        
        <div style={{ margin: "0 auto 24px", width: 80, height: 80, borderRadius: "50%", background: "var(--bg)", boxShadow: "5px 5px 12px var(--sd), -5px -5px 12px var(--sl)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="nm-inset" style={{ width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles style={{ width: 32, height: 32, color: "var(--accent)" }} />
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>Session Completed</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 32, lineHeight: 1.6 }}>
          Thank you for your visit with {appointment.doctorName || "the doctor"}. We hope the session was helpful and you&apos;re feeling better.
        </p>

        {submitted ? (
          <div className="anim-scale-in" style={{ padding: "20px", borderRadius: 16, background: "rgba(91, 109, 232, 0.05)", border: "1px solid rgba(91, 109, 232, 0.2)", marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} style={{ width: 24, height: 24, color: "var(--warning)", fill: i <= displayRating ? "var(--warning)" : "transparent" }} />
              ))}
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>Thank you for your feedback!</p>
          </div>
        ) : (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star 
                  key={i} 
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(i)}
                  style={{ 
                    width: 32, height: 32, 
                    color: "var(--warning)", 
                    fill: i <= (hoverRating || rating) ? "var(--warning)" : "transparent", 
                    cursor: "pointer", transition: "all 0.2s" 
                  }} 
                />
              ))}
            </div>
            
            {rating > 0 && (
              <div className="anim-fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <textarea
                  className="nm-input"
                  placeholder="Optional: Anything else you'd like to share?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 12, minHeight: 80, fontSize: 13, resize: "vertical" }}
                />
                {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
                <button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="nm-inset"
                  style={{ padding: "12px", borderRadius: 12, background: "var(--accent)", color: "#fff", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, border: "none" }}
                >
                  {submitting ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            )}
            {rating === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>Tap a star to rate your experience</p>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Link href={appointment?.psychologistSlug ? `/book/${appointment.psychologistSlug}` : "/"} className="btn-nm-accent" style={{ width: "100%", textDecoration: "none" }}>
            <Calendar style={{ width: 16, height: 16 }} /> Book Another Session
          </Link>
          <Link href="/" className="btn-nm" style={{ width: "100%", textDecoration: "none", color: "var(--text-2)" }}>
            <Home style={{ width: 16, height: 16 }} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

type BankAccount = {
  id: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  qrCodeBase64: string | null;
  isDefault: boolean;
  active: boolean;
};

// ── Main Track Page ─────────────────────────────────────────────────────────
export default function TrackPage() {
  const params = useParams();
  const token = params.token as string;
  const [appointment, setAppointment] = useState<any>(null);
  const [clinicInfo, setClinicInfo] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const apptRes = await api.get(`/track/${token}`);
      const raw = apptRes.data;
      const slug = raw.psychologistSlug;

      const [clinicRes, svcRes, bankRes] = await Promise.all([
        api.get(`/public/${slug}/info`),
        api.get(`/public/${slug}/services/catalog`),
        api.get(`/public/${slug}/bank-accounts`),
      ]);
      const svcs = svcRes.data || [];
      const sessionName =
        svcs.find((s: any) => String(s.id) === raw.sessionType)?.name
        || (raw.sessionType ? raw.sessionType.replace(/_/g, " ") : "Session");
      setAppointment({ ...raw, sessionName });
      setClinicInfo(clinicRes.data);
      setServices(svcs);
      setBankAccounts(Array.isArray(bankRes.data) ? bankRes.data : []);
      setError("");
    } catch {
      setError("Appointment not found or this link is invalid.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 60 }}>
      
      {/* Nav */}
      <nav style={{ padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div className="btn-nm" style={{ width: 36, height: 36, borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Home style={{ width: 15, height: 15, color: "var(--text-2)" }} />
          </div>
          <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Home</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield style={{ width: 14, height: 14, color: "var(--accent)" }} />
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "monospace" }}>…{token?.slice(-8)}</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <div style={{ padding: "20px" }}>
        
        <div style={{ textAlign: "center", marginBottom: 40 }} className="anim-fade-up">
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Appointment Tracker</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-1)" }}>Your Booking Status</h1>
        </div>

        {loading && <SkeletonCard />}

        {!loading && error && (
          <div className="anim-scale-in" style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
            <div className="nm-raised-lg" style={{ borderRadius: 28, padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)", textAlign: "center" }}>
              <div style={{ margin: "0 auto 24px", width: 80, height: 80, borderRadius: "50%", background: "var(--bg)", boxShadow: "5px 5px 12px var(--sd), -5px -5px 12px var(--sl)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="nm-inset" style={{ width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle style={{ width: 32, height: 32, color: "var(--danger)" }} />
                </div>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>Invalid Tracking Link</h2>
              <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 32 }}>{error}</p>
              <Link href="/" className="btn-nm-accent" style={{ textDecoration: "none" }}>
                <Home style={{ width: 16, height: 16 }} /> Return Home
              </Link>
            </div>
          </div>
        )}

        {!loading && appointment && (
          <>
            {(appointment.status === "PENDING" || appointment.status === "AWAITING_PAYMENT") && <AwaitingPaymentView appointment={appointment} clinicInfo={clinicInfo} bankAccounts={bankAccounts} token={token} onRefresh={fetchData} />}
            {appointment.status === "PAYMENT_UNDER_REVIEW" && <PaymentUnderReviewView onRefresh={fetchData} />}
            {appointment.status === "CONFIRMED" && <ConfirmedView appointment={appointment} />}
            {appointment.status === "CANCELLED" && <CancelledView appointment={appointment} token={token} />}
            {appointment.status === "COMPLETED" && <CompletedView appointment={appointment} token={token} />}
          </>
        )}
      </div>
    </div>
  );
}
