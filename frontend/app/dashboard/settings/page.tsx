"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isBefore, isToday
} from "date-fns";
import {
  Save, Building2, Phone, Mail,
  CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Landmark, Plus, Trash2, Star, Pencil, QrCode,
  Brain, Upload, ToggleLeft, ToggleRight, Check,
  Copy, MessageCircle, Send,
} from "lucide-react";
import api from "../../../lib/api";
import {
  getBankAccounts, createBankAccount, updateBankAccount,
  setDefaultBankAccount, deleteBankAccount, BankAccount,
  getMyProfile, updateMyProfile, MyProfile,
} from "../../../lib/profileApi";
import { toast } from "sonner";
import { SpotlightDiv } from "../../../components/Spotlight";
import AvailabilityEditor from "../../../components/AvailabilityEditor";
import { compressImageToBase64 } from "../../../lib/imageUtils";

// ── Booking Link Share ───────────────────────────────────────────────────────
function BookingLinkShare({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const bookingUrl = (typeof window !== 'undefined' ? window.location.origin : '') + `/book/${slug}`;
  const shareText = `Book a session with ${name}: ${bookingUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please copy manually');
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your booking link</label>
      <p className="text-xs text-gray-400 mb-3">Share this with clients so they can book directly — no account needed on their end.</p>
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 inline-block text-gray-600 break-all">
          {bookingUrl}
        </code>
        <button type="button" onClick={handleCopy}
          className="btn-nm" style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          {copied ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
          className="btn-nm" style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
        <a href={`mailto:?subject=${encodeURIComponent('Book an appointment')}&body=${encodeURIComponent(shareText)}`}
          className="btn-nm" style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <Send className="w-3.5 h-3.5" /> Email
        </a>
      </div>
    </div>
  );
}

// ── Tab: Profile ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [bio, setBio] = useState('');
  const [bookable, setBookable] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    getMyProfile()
      .then(p => {
        setProfile(p);
        setBio(p.bio || '');
        setBookable(p.bookable ?? true);
        setProfileImageUrl(p.profileImageUrl || '');
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('File must be under 10MB.'); return; }
    try {
      const base64 = await compressImageToBase64(file);
      setProfileImageUrl(base64);
    } catch {
      setUploadError('Failed to process image. Please try again.');
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMyProfile({ bio, bookable, profileImageUrl });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-500 mb-4">This is what patients see on your public booking page.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Accepting new bookings</label>
        <button onClick={() => setBookable(b => !b)} className="flex items-center gap-3">
          {bookable ? <ToggleRight className="w-8 h-8 text-indigo-600" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
          <span className={`text-sm font-medium ${bookable ? 'text-indigo-700' : 'text-gray-400'}`}>
            {bookable ? 'Your booking link is open' : 'Your booking link is paused'}
          </span>
        </button>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Profile Photo</label>
        <div className="flex items-center gap-4">
          <div className="team-avatar" style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(128,117,196,0.10)', border: '1px solid rgba(139,92,246,0.20)', overflow: 'hidden' }}>
            {profileImageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
              : <Brain className="w-8 h-8 text-purple-300" />}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="photo-upload" className="cursor-pointer flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition">
              <Upload className="w-4 h-4" />
              {profileImageUrl ? 'Change Photo' : 'Upload Photo'}
            </label>
            <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            {profileImageUrl && (
              <button type="button" onClick={() => { setProfileImageUrl(''); setUploadError(''); }}
                className="text-xs text-red-400 hover:text-red-600 transition text-left">
                Remove photo
              </button>
            )}
            <p className="text-xs text-gray-400">JPG, PNG, WebP · Compressed automatically</p>
          </div>
        </div>
        {uploadError && <p className="text-xs text-red-500 mt-2">{uploadError}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bio (shown to patients)</label>
        <textarea rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-none"
          placeholder="Brief professional background…" value={bio} onChange={e => setBio(e.target.value)} />
      </div>
      {profile && <BookingLinkShare slug={profile.slug} name={profile.name} />}
      <button onClick={handleSave} disabled={saving} className="btn-nm-accent" style={{ padding: '10px 20px', fontSize: 13 }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
      </button>
    </div>
  );
}

// The 12-hour time picker and the Availability tab itself now live in the
// shared components/AvailabilityEditor.tsx (also used by Staff Management
// for a clinic owner managing a staff member's schedule directly).

// ── Bank Account Section ────────────────────────────────────────────────────

function BankAccountForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<BankAccount>;
  onSave: (data: Partial<BankAccount>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<BankAccount>>({
    accountName: initial?.accountName ?? "",
    bankName: initial?.bankName ?? "",
    accountNumber: initial?.accountNumber ?? "",
    ifscCode: initial?.ifscCode ?? "",
    upiId: initial?.upiId ?? "",
    qrCodeBase64: initial?.qrCodeBase64 ?? "",
    isDefault: initial?.isDefault ?? false,
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, qrCodeBase64: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.accountName?.trim()) { toast.error("Account name is required"); return; }
    setSaving(true);
    try { await onSave(form); } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  return (
    <div className="soft-card-2" style={{ borderRadius: 18, padding: 24, marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
            Account Label <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input className="nm-input no-icon" placeholder='e.g. "My HDFC A/c"'
            value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Bank Name</label>
          <input className="nm-input no-icon" placeholder="e.g. HDFC Bank"
            value={form.bankName ?? ""} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Account Number</label>
          <input className="nm-input no-icon" placeholder="1234567890"
            value={form.accountNumber ?? ""} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>IFSC Code</label>
          <input className="nm-input no-icon" placeholder="HDFC0001234"
            value={form.ifscCode ?? ""} onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>UPI ID</label>
          <input className="nm-input no-icon" placeholder="you@upi"
            value={form.upiId ?? ""} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>QR Code Image</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {form.qrCodeBase64 ? (
              <div style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: "#fff", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.qrCodeBase64} alt="QR" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                <button type="button" onClick={() => setForm(f => ({ ...f, qrCodeBase64: "" }))}
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, background: "var(--danger)", color: "#fff", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11 }}>×</button>
              </div>
            ) : (
              <label style={{ width: 64, height: 64, borderRadius: 10, border: "2px dashed var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-3)", gap: 4 }}>
                <QrCode style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 9 }}>Upload</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleQrUpload} />
              </label>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="btn-nm-accent" style={{ padding: "10px 24px", fontSize: 13 }}>
          {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spinSlow 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
          Save Account
        </button>
        <button type="button" onClick={onCancel} className="btn-nm" style={{ padding: "10px 20px", fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function BankAccountsSection() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getBankAccounts()
      .then(data => setAccounts(data))
      .catch(() => toast.error("Failed to load bank accounts"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async (data: Partial<BankAccount>) => {
    await createBankAccount(data);
    toast.success("Bank account added");
    setAdding(false);
    reload();
  };

  const handleUpdate = async (id: number, data: Partial<BankAccount>) => {
    await updateBankAccount(id, data);
    toast.success("Bank account updated");
    setEditingId(null);
    reload();
  };

  const handleSetDefault = async (id: number) => {
    await setDefaultBankAccount(id);
    toast.success("Default updated");
    reload();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    await deleteBankAccount(id);
    toast.success("Removed");
    reload();
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
      <Loader2 style={{ width: 20, height: 20, color: "var(--accent)", animation: "spinSlow 1s linear infinite" }} />
    </div>
  );

  return (
    <div>
      {accounts.length === 0 && !adding && (
        <div className="soft-card-2" style={{ borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 16 }}>
          <Landmark style={{ width: 28, height: 28, color: "var(--text-3)", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>No bank accounts configured yet.</p>
        </div>
      )}

      {[...accounts].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)).map(acc => (
        <div key={acc.id}>
          {editingId === acc.id ? (
            <BankAccountForm initial={acc} onSave={data => handleUpdate(acc.id, data)} onCancel={() => setEditingId(null)} />
          ) : (
            <SpotlightDiv className="soft-card card-hover" style={{
              borderRadius: 18, padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16,
              border: acc.isDefault ? "2px solid var(--accent)" : "2px solid transparent",
              background: acc.isDefault ? "rgba(90,105,220,0.04)" : undefined,
            }}>
              {acc.qrCodeBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={acc.qrCodeBase64} alt="QR" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "contain", background: "#fff", border: "1px solid var(--border)", padding: 2, flexShrink: 0 }} />
              ) : (
                <div className="icon-badge icon-badge--accent">
                  <Landmark />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{acc.accountName}</p>
                  {acc.isDefault && (
                    <span className="stat-chip" style={{ background: "var(--accent-surface)", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Star style={{ width: 10, height: 10, fill: "var(--accent)" }} /> Default
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                  {[acc.bankName, acc.accountNumber, acc.ifscCode, acc.upiId].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {!acc.isDefault && (
                  <button type="button" onClick={() => handleSetDefault(acc.id)} className="btn-nm" style={{ padding: "7px 14px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }} title="Set as default">
                    <Star style={{ width: 12, height: 12 }} />
                    <span style={{ fontSize: 11 }}>Set default</span>
                  </button>
                )}
                <button type="button" onClick={() => setEditingId(acc.id)} className="btn-nm" style={{ padding: "7px 14px", fontSize: 11 }}>
                  <Pencil style={{ width: 12, height: 12 }} />
                </button>
                <button type="button" onClick={() => handleDelete(acc.id, acc.accountName)} className="btn-nm" style={{ padding: "7px 14px", fontSize: 11, color: "var(--danger)" }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </SpotlightDiv>
          )}
        </div>
      ))}

      {adding ? (
        <BankAccountForm onSave={handleCreate} onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-nm" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 13 }}>
          <Plus style={{ width: 14, height: 14 }} /> Add Bank Account
        </button>
      )}
    </div>
  );
}

// ── Tab: Practice Info ───────────────────────────────────────────────────────
function PracticeInfoTab() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    api.get("/settings").then(res => reset(res.data)).catch(console.error);
  }, [reset]);

  const LabelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "var(--text-3)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    display: "block", marginBottom: 8,
  };

  const FieldWrap = ({ children, colSpan }: { children: React.ReactNode; colSpan?: string }) => (
    <div style={{ gridColumn: colSpan }}>{children}</div>
  );

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.put("/settings", data);
      toast.success("Practice info saved");
    } catch {
      toast.error("Failed to save");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <FieldWrap>
          <label style={LabelStyle}>Practice / Clinic Name</label>
          <input {...register("clinicName")} placeholder="Your practice name" className="nm-input no-icon" />
        </FieldWrap>
        <FieldWrap>
          <label style={LabelStyle}>Your Name</label>
          <input {...register("doctorName")} placeholder="Dr. John Doe" className="nm-input no-icon" />
        </FieldWrap>
        <FieldWrap colSpan="1 / -1">
          <label style={LabelStyle}>Address</label>
          <input {...register("address")} placeholder="123 Health St, Medical City" className="nm-input no-icon" />
        </FieldWrap>
        <FieldWrap>
          <label style={LabelStyle}>Contact Email</label>
          <div style={{ position: "relative" }}>
            <Mail style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)", pointerEvents: "none" }} />
            <input {...register("contactEmail")} type="email" placeholder="you@example.com" className="nm-input" />
          </div>
        </FieldWrap>
        <FieldWrap>
          <label style={LabelStyle}>Contact Phone</label>
          <div style={{ position: "relative" }}>
            <Phone style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)", pointerEvents: "none" }} />
            <input {...register("contactPhone")} placeholder="+1 (555) 000-0000" className="nm-input" />
          </div>
        </FieldWrap>
        <FieldWrap>
          <label style={LabelStyle}>Demo Call Number</label>
          <div style={{ position: "relative" }}>
            <Phone style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)", pointerEvents: "none" }} />
            <input {...register("demoCallNumber")} placeholder="+919074805755" className="nm-input" />
          </div>
        </FieldWrap>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button type="submit" disabled={loading} className="btn-nm-accent" style={{ padding: "12px 30px", fontSize: 13 }}>
          {loading
            ? <><Loader2 style={{ width: 14, height: 14, animation: "spinSlow 1s linear infinite" }} /> Saving…</>
            : <><Save style={{ width: 14, height: 14 }} /> Save</>}
        </button>
      </div>
    </form>
  );
}

// ── Tab: Manage Leave Days ───────────────────────────────────────────────────
function LeaveDaysTab() {
  const [holidays, setHolidays] = useState<{ id: number; holidayDate: string }[]>([]);

  useEffect(() => { fetchHolidays(); }, []);

  const fetchHolidays = () => {
    api.get("/holidays").then(res => setHolidays(res.data)).catch(console.error);
  };

  const toggleHoliday = async (dateStr: string) => {
    try {
      const existing = holidays.find(h => h.holidayDate === dateStr);
      if (existing) {
        await api.delete(`/holidays/${existing.id}`);
        setHolidays(prev => prev.filter(h => h.id !== existing.id));
      } else {
        const res = await api.post("/holidays", { holidayDate: dateStr });
        setHolidays(prev => [...prev, res.data]);
      }
    } catch (e) {
      console.error("Failed to toggle holiday", e);
    }
  };

  return (
    <div style={{ maxWidth: 300, margin: "0 auto" }}>
      <HolidaysCalendar holidays={holidays.map(h => h.holidayDate)} onToggle={toggleHoliday} />
    </div>
  );
}

function HolidaysCalendar({ holidays, onToggle }: { holidays: string[]; onToggle: (d: string) => void }) {
  const [viewDate, setViewDate] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const startPad = getDay(startOfMonth(viewDate));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="btn-nm w-8 h-8 rounded-full !p-0">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{format(viewDate, "MMMM yyyy")}</span>
        <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="btn-nm w-8 h-8 rounded-full !p-0">
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
          const past = isBefore(day, new Date()) && !isToday(day);
          return (
            <div key={dateStr} className="flex justify-center">
              <button type="button" onClick={() => onToggle(dateStr)} disabled={past}
                className={`cal-day-nm ${past ? "cal-disabled" : ""} ${isHoliday ? "cal-selected" : ""}`}
                style={isHoliday ? { background: "var(--danger, #f43f5e)", color: "#fff", boxShadow: "none" } : undefined}>
                {format(day, "d")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
// selfScoped tabs read/write the CALLER'S OWN /me/** rows (profile, service
// pricing, calendar) — meaningful for a tenant root (individual or clinic
// owner) or a staff-doctor. The rest are clinic-wide (ClinicSettings, bank
// accounts, holidays) and require the SETTINGS permission for clinic staff.
//
// Availability is selfScoped but ALSO hidden for clinic STAFF specifically —
// a clinic owner manages each staff member's calendar directly from Staff
// Management instead (see StaffAvailabilityController / components/
// AvailabilityEditor), so a staff row has no self-service calendar tab here.
// The clinic OWNER (tenant root) still gets it, though: they're a bookable
// practitioner in their own right (shows up on the public booking roster
// same as any staff-doctor), and there is no "someone else's card" on Staff
// Management for anyone to manage the owner's own calendar on their behalf —
// hiding it here would leave them with literally no way to set it.
// Individuals are unaffected either way — they have no "staff" to manage it
// under, so they keep self-serving it here as before.
const TABS = [
  { key: 'profile',      label: 'Profile',              selfScoped: true, hideForStaff: false },
  { key: 'availability', label: 'Availability',         selfScoped: true, hideForStaff: true  },
  { key: 'practice',     label: 'Practice Info',        selfScoped: false, hideForStaff: false },
  { key: 'payment',      label: 'Payment & Banking',    selfScoped: false, hideForStaff: false },
  { key: 'holidays',     label: 'Leave Days',           selfScoped: false, hideForStaff: false },
] as const;
type TabKey = typeof TABS[number]['key'];

// Mirrors dashboard/layout.tsx's own access computation — kept local (no
// shared context in this app) rather than introduced as a new dependency.
function useSettingsAccess() {
  const [access, setAccess] = useState({ showSelfScoped: true, showClinicWide: true, isStaff: false });
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (!user) return;
      const isStaff = !!user.tenantId;
      const isStaffDoctor = isStaff && user.role === 'ROLE_PSYCHOLOGIST';
      const permissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
      setAccess({
        showSelfScoped: !isStaff || isStaffDoctor,
        showClinicWide: !isStaff || permissions.includes('SETTINGS'),
        isStaff,
      });
    } catch { /* default to showing everything if we can't tell */ }
  }, []);
  return access;
}

export default function SettingsPage() {
  const { showSelfScoped, showClinicWide, isStaff } = useSettingsAccess();
  const visibleTabs = TABS.filter(t => {
    if (t.hideForStaff && isStaff) return false;
    return t.selfScoped ? showSelfScoped : showClinicWide;
  });
  const [tab, setTab] = useState<TabKey>('profile');

  // If the user's default tab isn't actually visible to them (e.g. a
  // receptionist with SETTINGS but no calendar of their own landing on
  // "profile"), fall back to the first tab they can actually see.
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.key === tab)) {
      setTab(visibleTabs[0].key);
    }
  }, [visibleTabs, tab]);

  return (
    <div style={{ maxWidth: 820 }} className="anim-fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em", marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 14, color: "var(--text-3)" }}>
          {isStaff ? "Your profile and practice details." : "Your profile, availability, and practice details."}
        </p>
      </div>

      <div className="soft-card-2" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, marginBottom: 24, flexWrap: 'wrap', width: 'fit-content' }}>
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`tab-pill${tab === t.key ? ' active' : ''}`}
            style={{
              padding: '9px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: tab === t.key ? 'var(--card)' : 'transparent',
              color: tab === t.key ? 'var(--text-1)' : 'var(--text-3)',
              boxShadow: tab === t.key ? '0 2px 8px var(--card-shadow-1)' : undefined,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="soft-card" style={{ borderRadius: 26, padding: 32 }}>
        {visibleTabs.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "20px 0" }}>
            You don&apos;t have access to any settings here.
          </p>
        )}
        {tab === 'profile'      && <ProfileTab />}
        {tab === 'availability' && <AvailabilityEditor />}
        {tab === 'practice'     && <PracticeInfoTab />}
        {tab === 'payment'      && <BankAccountsSection />}
        {tab === 'holidays'     && <LeaveDaysTab />}
      </div>
    </div>
  );
}
