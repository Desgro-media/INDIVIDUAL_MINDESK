"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "../../../components/ThemeToggle";
import {
  User, Mail, Phone, ChevronRight, ChevronLeft,
  Calendar, Clock, CheckCircle2, Sparkles, Heart, Brain,
  Users, RefreshCw, HelpCircle, Loader2, ArrowLeft, Check,
  ClipboardList, Home, Baby, AlertCircle, Briefcase,
} from "lucide-react";
import publicApi from "../../../lib/publicApi";
import {
  format, isBefore, isToday, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay
} from "date-fns";

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
  clinicServiceId: number;
  serviceName: string;
  serviceDescription: string;
  serviceDuration: string;
  serviceIcon: string;
  price: number;
  offered: boolean;
}

interface PractitionerInfo {
  slug: string;
  name: string;
  jobTitle: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  bookable: boolean;
  clinicName: string | null;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

function MiniCalendar({ selected, onSelect, holidays = [] }: { selected: Date | null; onSelect: (d: Date) => void; holidays?: string[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const startPad = getDay(startOfMonth(viewDate));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="btn-nm w-8 h-8 rounded-full !p-0">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{format(viewDate, "MMMM yyyy")}</span>
        <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="btn-nm w-8 h-8 rounded-full !p-0">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider py-1" style={{ color: "var(--text-3)" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array(startPad).fill(null).map((_, i) => <div key={`p${i}`} />)}
        {days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isHoliday = holidays.includes(dateStr);
          const past   = isBefore(day, today) && !isToday(day);
          const disabled = past || isHoliday;
          const sel    = selected ? isSameDay(day, selected) : false;
          const todayD = isToday(day);
          return (
            <div key={day.toISOString()} className="flex justify-center">
              <button
                disabled={disabled}
                onClick={() => onSelect(day)}
                className={`cal-day-nm ${disabled ? "cal-disabled" : ""} ${sel ? "cal-selected" : ""} ${todayD && !sel ? "cal-today" : ""}`}
                title={isHoliday ? "Not available" : undefined}
              >
                {format(day, "d")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  const labels = ["Details", "Session", "Schedule", "Confirm"];
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const s = i + 1;
        const done   = s < current;
        const active = s === current;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="transition-all duration-300 flex items-center justify-center"
                style={{
                  width: active ? 32 : 20, height: 20, borderRadius: 50,
                  background: active ? "var(--accent)" : "var(--bg)",
                  boxShadow: active
                    ? "3px 3px 8px #4a5bcc, -1px -1px 5px #8b9cf4"
                    : done
                    ? "inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)"
                    : "2px 2px 5px var(--sd), -2px -2px 5px var(--sl)",
                }}
              >
                {done
                  ? <Check style={{ width: 10, height: 10, color: "var(--accent)" }} />
                  : <span style={{ fontSize: 9, fontWeight: 700, color: active ? "#fff" : "var(--text-3)" }}>{s}</span>
                }
              </div>
              <span style={{ fontSize: 9, fontWeight: 500, color: active ? "var(--accent)" : "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div style={{ flex: 1, height: 1, marginBottom: 14, background: done ? "var(--accent)" : "var(--sd)", opacity: 0.4 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LabeledInput({ label, icon, error, children }: any) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }}>{icon}</div>
        )}
        {children}
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 11, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [practitioner, setPractitioner] = useState<PractitionerInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [sessionTypes, setSessionTypes] = useState<ApiService[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [holidays, setHolidays] = useState<string[]>([]);

  const [form, setForm] = useState({ patientName: "", patientEmail: "", patientPhone: "", notes: "" });
  const [formErr, setFormErr] = useState<Record<string, string>>({});

  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedSessionName, setSelectedSessionName] = useState<string>("");
  const [selectedSessionDuration, setSelectedSessionDuration] = useState<string>("");
  const [selectedSessionFee, setSelectedSessionFee] = useState<number>(0);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");

  const [returningPatient, setReturningPatient] = useState<boolean>(false);
  const [emailChecking, setEmailChecking] = useState(false);

  useEffect(() => {
    publicApi.get(`/public/${slug}/info`)
      .then(r => setPractitioner(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setInfoLoading(false));
    publicApi.get(`/public/${slug}/holidays`).then(r => setHolidays(r.data.map((h: any) => h.holidayDate))).catch(() => {});
    publicApi.get(`/public/${slug}/services`)
      .then(r => setSessionTypes(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [slug]);

  const fetchSlots = useCallback(async (date: Date) => {
    setSlotsLoading(true);
    setSelectedTime("");
    try {
      const r = await publicApi.get(`/public/${slug}/slots?date=${format(date, "yyyy-MM-dd")}`);
      setSlots(Array.isArray(r.data) ? r.data : []);
    } catch {
      setSlots([]);
    } finally { setSlotsLoading(false); }
  }, [slug]);

  useEffect(() => { if (selectedDate) fetchSlots(selectedDate); }, [selectedDate, fetchSlots]);

  const checkReturningPatient = async (phone: string) => {
    if (!phone || phone.trim().length < 7) return;
    setEmailChecking(true);
    setReturningPatient(false);
    try {
      const res = await publicApi.get(`/public/${slug}/patients/check?phone=${encodeURIComponent(phone.trim())}`);
      if (res.data.exists) setReturningPatient(true);
    } catch { /* best-effort */ }
    finally { setEmailChecking(false); }
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.patientName.trim()) e.patientName = "Required";
    if (form.patientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.patientEmail))
      e.patientEmail = "Invalid email — will not be saved";
    if (!form.patientPhone.trim()) e.patientPhone = "Required";
    setFormErr(e);
    return !e.patientName && !e.patientPhone;
  };

  const next = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      if (form.patientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.patientEmail)) {
        setForm(f => ({ ...f, patientEmail: "" }));
      }
      setError("");
      setStep(2);
      return;
    }
    if (step === 2 && !selectedSession) { setError("Please select a session type."); return; }
    if (step === 3 && (!selectedDate || !selectedTime)) { setError("Please pick a date and time."); return; }
    setError(""); setStep(s => s + 1);
  };
  const back = () => { setError(""); setStep(s => s - 1); };

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = await publicApi.post("/appointments", {
        ...form,
        patientEmail: form.patientEmail.trim() || null,
        sessionType: selectedSession,
        appointmentDate: format(selectedDate!, "yyyy-MM-dd"),
        startTime: selectedTime,
        slug,
      });
      router.push(`/track/${res.data.trackingToken}`);
    } catch (e: any) {
      setError(e.response?.data?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const fmtTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const selSessionObj = sessionTypes.find(s => String(s.clinicServiceId) === selectedSession);

  if (infoLoading) {
    return <div style={{ minHeight: "100vh" }} />;
  }

  if (notFound || (practitioner && !practitioner.bookable)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 20, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>This booking link isn&apos;t available</h1>
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>The link may be incorrect, or the practitioner isn&apos;t accepting bookings right now.</p>
        <Link href="/" style={{ fontSize: 13, color: "var(--accent)" }}>Back to home</Link>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <nav style={{ padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div className="btn-nm" style={{ width: 36, height: 36, borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft style={{ width: 15, height: 15, color: "var(--text-2)" }} />
          </div>
          <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Back</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", opacity: 0.7 }} />
            <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>{practitioner?.clinicName || practitioner?.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }} className="anim-fade-up">
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Book Appointment</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.3 }}>
            {practitioner?.name}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>
            {practitioner?.jobTitle || "Psychologist"}
          </p>
        </div>

        <div style={{ marginBottom: 32 }} className="anim-fade-up d1">
          <StepDots current={step} total={4} />
        </div>

        <div className="nm-raised-lg anim-scale-in d2" style={{ borderRadius: 28, padding: "32px 28px" }}>
          {error && (
            <div className="anim-fade-in nm-inset-sm" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 24, color: "var(--danger)", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* ── STEP 1: Details ─────────────────────────────────── */}
          {step === 1 && (
            <div className="anim-slide-r">
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}>Your Details</h2>
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 28 }}>No account needed — just the basics.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <LabeledInput label="Full Name" icon={<User style={{ width: 14, height: 14 }} />} error={formErr.patientName}>
                  <input className="nm-input" placeholder="e.g. Rahul Menon"
                    value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} />
                </LabeledInput>
                <LabeledInput label="Email Address (optional)" icon={<Mail style={{ width: 14, height: 14 }} />} error={formErr.patientEmail}>
                  <input type="email" className="nm-input" placeholder="you@example.com"
                    value={form.patientEmail} onChange={e => setForm(f => ({ ...f, patientEmail: e.target.value }))} />
                </LabeledInput>
                <LabeledInput label="Phone Number" icon={<Phone style={{ width: 14, height: 14 }} />} error={formErr.patientPhone}>
                  <input className="nm-input" placeholder="+91 98765 43210"
                    value={form.patientPhone}
                    onChange={e => { setForm(f => ({ ...f, patientPhone: e.target.value })); setReturningPatient(false); }}
                    onBlur={e => checkReturningPatient(e.target.value)} />
                </LabeledInput>
                {emailChecking && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-3)" }}>
                    <Loader2 style={{ width: 12, height: 12, animation: "spinSlow 1s linear infinite" }} /> Checking...
                  </div>
                )}
                {returningPatient && (
                  <div className="nm-inset-sm anim-fade-in" style={{ borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <RefreshCw style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>Welcome back! 👋</p>
                      <p style={{ fontSize: 12, color: "var(--text-2)" }}>We found your profile in our system.</p>
                    </div>
                  </div>
                )}
                <LabeledInput label="Anything to share? (optional)" icon={undefined}>
                  <textarea className="nm-textarea" rows={3}
                    placeholder="What brings you here, any concerns, preferred language..."
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </LabeledInput>
                <button className="btn-nm-accent w-full mt-2" onClick={next} style={{ width: "100%", marginTop: 8 }}>
                  Continue <ChevronRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Session Type ─────────────────────────────── */}
          {step === 2 && (
            <div className="anim-slide-r">
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}>Session Type</h2>
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 28 }}>Choose what fits your needs.</p>

              {sessionsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                  <Loader2 style={{ width: 24, height: 24, color: "var(--accent)", animation: "spinSlow 1s linear infinite" }} />
                </div>
              ) : sessionTypes.length === 0 ? (
                <div className="nm-inset-sm" style={{ borderRadius: 16, padding: 24, textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>No services configured yet.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
                  {sessionTypes.map(s => {
                    const sid = String(s.clinicServiceId);
                    return (
                      <button
                        key={s.clinicServiceId}
                        onClick={() => {
                          setSelectedSession(sid);
                          setSelectedSessionName(s.serviceName);
                          setSelectedSessionDuration(s.serviceDuration);
                          setSelectedSessionFee(s.price);
                          setError("");
                        }}
                        className={`session-card-nm ${selectedSession === sid ? "selected" : ""}`}
                        style={{ textAlign: "left", background: "var(--bg)", position: "relative" }}
                      >
                        {s.serviceDescription && (
                          <span onClick={e => e.stopPropagation()} title={s.serviceDescription} style={{
                            position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%",
                            background: "var(--bg)", boxShadow: "2px 2px 5px var(--sd), -2px -2px 5px var(--sl)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, color: "var(--accent)", cursor: "default",
                          }}>!
                          </span>
                        )}
                        <div style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: selectedSession === sid ? "var(--accent)" : "var(--bg)",
                          boxShadow: selectedSession === sid
                            ? "2px 2px 8px #4a5bcc, -1px -1px 4px #8b9cf4"
                            : "3px 3px 7px var(--sd), -3px -3px 7px var(--sl)",
                          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                          color: selectedSession === sid ? "#fff" : "var(--accent)",
                        }}>
                          <ServiceIcon name={s.serviceIcon} />
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", lineHeight: 1.3, marginBottom: 6 }}>{s.serviceName}</p>
                        <p style={{ fontSize: 10, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock style={{ width: 10, height: 10 }}/> {s.serviceDuration}
                          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                            • {Number(s.price) > 0 ? `₹${Number(s.price).toFixed(2)}` : "Free"}
                          </span>
                        </p>
                        {selectedSession === sid && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                            <CheckCircle2 style={{ width: 11, height: 11, color: "var(--accent)" }} />
                            <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>Selected</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-nm" onClick={back} style={{ flex: "none", padding: "12px 20px" }}>
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Back
                </button>
                <button className="btn-nm-accent" onClick={next} disabled={!selectedSession} style={{ flex: 1 }}>
                  Continue <ChevronRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Date & Time ───────────────────────────────── */}
          {step === 3 && (
            <div className="anim-slide-r">
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}>Schedule</h2>
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>Pick a date, then choose a time slot.</p>

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar style={{ width: 11, height: 11 }} /> Date
                </p>
                <div className="cal-container">
                  <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} holidays={holidays} />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock style={{ width: 11, height: 11 }} />
                  {selectedDate ? `Available · ${format(selectedDate, "EEE, MMM d")}` : "Select a date first"}
                </p>

                {!selectedDate && (
                  <div className="nm-inset-sm" style={{ borderRadius: 16, padding: 32, textAlign: "center" }}>
                    <Calendar style={{ width: 28, height: 28, color: "var(--text-3)", margin: "0 auto 8px" }} />
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>Choose a date above</p>
                  </div>
                )}
                {selectedDate && slotsLoading && (
                  <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                    <Loader2 style={{ width: 22, height: 22, color: "var(--accent)", animation: "spinSlow 1s linear infinite" }} />
                  </div>
                )}
                {selectedDate && !slotsLoading && slots.length === 0 && (
                  <div className="nm-inset-sm" style={{ borderRadius: 16, padding: 24, textAlign: "center" }}>
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>No slots available — try another date.</p>
                  </div>
                )}
                {selectedDate && !slotsLoading && slots.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: 200, overflowY: "auto", paddingRight: 4 }}>
                    {slots.map(slot => (
                      <button key={slot} onClick={() => setSelectedTime(slot)}
                        className={`time-nm ${selectedTime === slot ? "time-selected" : ""}`}>
                        {fmtTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
                {selectedDate && selectedTime && (
                  <div className="nm-inset-sm anim-fade-in" style={{ borderRadius: 12, padding: "10px 14px", marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 style={{ width: 13, height: 13, color: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                      <b style={{ color: "var(--text-1)" }}>{format(selectedDate, "EEE, MMM d")}</b> at <b style={{ color: "var(--text-1)" }}>{fmtTime(selectedTime)}</b>
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-nm" onClick={back} style={{ flex: "none", padding: "12px 20px" }}>
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Back
                </button>
                <button className="btn-nm-accent" onClick={next} disabled={!selectedDate || !selectedTime} style={{ flex: 1 }}>
                  Review <ChevronRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Confirm ──────────────────────────────────── */}
          {step === 4 && (
            <div className="anim-slide-r">
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}>Review & Confirm</h2>
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>Everything look right?</p>

              <div className="nm-inset-sm" style={{ borderRadius: 18, padding: "20px", marginBottom: 24 }}>
                {[
                  { label: "Patient",       value: form.patientName },
                  ...(form.patientEmail ? [{ label: "Email",    value: form.patientEmail }] : []),
                  { label: "Phone",         value: form.patientPhone },
                  { label: "Session",       value: selSessionObj?.serviceName || selectedSessionName || selectedSession },
                  { label: "Duration",      value: selSessionObj?.serviceDuration || selectedSessionDuration || "—" },
                  { label: "Fee",           value: (selSessionObj?.price || selectedSessionFee) > 0 ? `₹${Number(selSessionObj?.price || selectedSessionFee).toFixed(2)}` : "Free" },
                  { label: "Date",          value: selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "—" },
                  { label: "Time",          value: selectedTime ? fmtTime(selectedTime) : "—" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(180,185,210,0.25)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{row.value}</span>
                  </div>
                ))}
                {form.notes && (
                  <div style={{ paddingTop: 12 }}>
                    <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Note</p>
                    <p style={{ fontSize: 12, color: "var(--text-2)", fontStyle: "italic" }}>&quot;{form.notes}&quot;</p>
                  </div>
                )}
              </div>

              <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 20, textAlign: "center", lineHeight: 1.6 }}>
                You&apos;ll receive an <b style={{ color: "var(--text-2)" }}>SMS & email</b> with payment instructions to confirm your booking.
              </p>

              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-nm" onClick={back} disabled={loading} style={{ flex: "none", padding: "12px 20px" }}>
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Edit
                </button>
                <button className="btn-nm-accent" onClick={submit} disabled={loading} style={{ flex: 1 }}>
                  {loading
                    ? <><Loader2 style={{ width: 14, height: 14, animation: "spinSlow 1s linear infinite" }} /> Booking…</>
                    : <><CheckCircle2 style={{ width: 14, height: 14 }} /> Confirm Booking</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
