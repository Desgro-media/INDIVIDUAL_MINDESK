"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isBefore, isToday, parseISO
} from "date-fns";
import {
  Save, Building2, Phone, Mail,
  CheckCircle2, AlertCircle, Loader2, Calendar, ChevronLeft, ChevronRight,
  Landmark, Plus, Trash2, Star, Pencil, QrCode,
  Brain, Upload, ToggleLeft, ToggleRight, Check, Settings, X,
} from "lucide-react";
import api from "../../../lib/api";
import {
  getBankAccounts, createBankAccount, updateBankAccount,
  setDefaultBankAccount, deleteBankAccount, BankAccount,
  getMyProfile, updateMyProfile, MyProfile,
  getMyServices, saveMyServices, DoctorServicePrice,
  getAvailabilityBlocks, addAvailabilityBlocks, removeAvailabilityBlock, clearDayBlocks,
  getDateOverrides, addDateOverride, removeDateOverride, DateOverride, AvailabilityBlock,
} from "../../../lib/profileApi";
import { toast } from "sonner";
import { SpotlightDiv } from "../../../components/Spotlight";

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function compressImageToBase64(file: File, maxW = 400, maxH = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
      {profile && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your booking link</label>
          <code className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 inline-block text-gray-600">
            {typeof window !== 'undefined' ? window.location.origin : ''}/book/{profile.slug}
          </code>
        </div>
      )}
      <button onClick={handleSave} disabled={saving} className="btn-nm-accent" style={{ padding: '10px 20px', fontSize: 13 }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
      </button>
    </div>
  );
}

// ── Tab: Services & Pricing ──────────────────────────────────────────────────
function ServicesPricingTab() {
  const [services, setServices] = useState<DoctorServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<number, { price: string; offered: boolean }>>({});

  useEffect(() => {
    getMyServices()
      .then(data => {
        setServices(data);
        const init: Record<number, { price: string; offered: boolean }> = {};
        data.forEach(s => { init[s.clinicServiceId] = { price: String(s.price), offered: s.offered }; });
        setEdited(init);
      })
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = services.map(s => ({
        clinicServiceId: s.clinicServiceId,
        price: parseFloat(edited[s.clinicServiceId]?.price || '0') || 0,
        offered: edited[s.clinicServiceId]?.offered ?? s.offered,
      }));
      await saveMyServices(payload);
      toast.success('Pricing saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4">Choose which services you offer and set your price for each. Leave price as 0 to use the catalog default.</p>
      {services.length === 0 && (
        <p className="text-sm text-gray-400 py-8 text-center">No services configured yet. Add services on the Services page first.</p>
      )}
      <div className="space-y-3">
        {services.map(s => {
          const e = edited[s.clinicServiceId] ?? { price: String(s.price), offered: s.offered };
          return (
            <div key={s.clinicServiceId} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${e.offered ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 bg-gray-50'}`}>
              <button
                onClick={() => setEdited(prev => ({ ...prev, [s.clinicServiceId]: { ...e, offered: !e.offered } }))}
                className="flex-shrink-0"
              >
                {e.offered
                  ? <ToggleRight className="w-6 h-6 text-indigo-600" />
                  : <ToggleLeft className="w-6 h-6 text-gray-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{s.serviceName}</p>
                <p className="text-xs text-gray-400">{s.serviceDuration}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">₹</span>
                <input
                  type="number" min="0" step="0.01"
                  className="w-24 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  value={e.price}
                  onChange={ev => setEdited(prev => ({ ...prev, [s.clinicServiceId]: { ...e, price: ev.target.value } }))}
                />
              </div>
            </div>
          );
        })}
      </div>
      {services.length > 0 && (
        <button onClick={handleSave} disabled={saving} className="btn-nm-accent" style={{ marginTop: 20, padding: '10px 20px', fontSize: 13 }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Pricing
        </button>
      )}
    </div>
  );
}

// ── Tab: Availability ────────────────────────────────────────────────────────
function AvailabilityTab() {
  const [blocks, setBlocks] = useState<Record<string, AvailabilityBlock[]>>({});
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingOverride, setAddingOverride] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ date: '', time: '', available: true });

  const [blockForm, setBlockForm] = useState({
    startTime: '09:00',
    endTime: '11:00',
    intervalMinutes: 60,
    selectedDays: [] as string[],
  });

  const reload = useCallback(async () => {
    try {
      const [blk, ov] = await Promise.all([getAvailabilityBlocks(), getDateOverrides()]);
      setBlocks(blk);
      setOverrides(ov);
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const toggleDay = (day: string) => {
    setBlockForm(f => ({
      ...f,
      selectedDays: f.selectedDays.includes(day)
        ? f.selectedDays.filter(d => d !== day)
        : [...f.selectedDays, day],
    }));
  };

  const setPreset = (preset: 'all' | 'weekdays' | 'weekends') => {
    const presets = {
      all:      DAYS_OF_WEEK,
      weekdays: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'],
      weekends: ['SATURDAY','SUNDAY'],
    };
    setBlockForm(f => ({ ...f, selectedDays: presets[preset] }));
  };

  const handleApplyBlock = async () => {
    if (blockForm.selectedDays.length === 0) { toast.error('Select at least one day'); return; }
    if (!blockForm.startTime || !blockForm.endTime) { toast.error('Set start and end time'); return; }
    if (blockForm.startTime >= blockForm.endTime) { toast.error('Start time must be before end time'); return; }
    setSaving(true);
    try {
      await addAvailabilityBlocks(blockForm.selectedDays, blockForm.startTime, blockForm.endTime, blockForm.intervalMinutes);
      toast.success(`Block applied to ${blockForm.selectedDays.length} day${blockForm.selectedDays.length > 1 ? 's' : ''}`);
      setBlockForm(f => ({ ...f, selectedDays: [] }));
      await reload();
    } catch {
      toast.error('Failed to apply block');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBlock = async (blockId: number) => {
    try {
      await removeAvailabilityBlock(blockId);
      setBlocks(prev => {
        const next = { ...prev };
        for (const day of Object.keys(next)) {
          next[day] = next[day].filter(b => b.id !== blockId);
        }
        return next;
      });
    } catch {
      toast.error('Failed to remove block');
    }
  };

  const handleClearDay = async (day: string) => {
    if (!confirm(`Clear all availability blocks for ${day.charAt(0) + day.slice(1).toLowerCase()}?`)) return;
    try {
      await clearDayBlocks(day);
      setBlocks(prev => ({ ...prev, [day]: [] }));
    } catch {
      toast.error('Failed to clear day');
    }
  };

  const handleAddOverride = async () => {
    if (!overrideForm.date) { toast.error('Date is required'); return; }
    try {
      await addDateOverride({
        specificDate: overrideForm.date,
        slotTime: overrideForm.available && overrideForm.time ? overrideForm.time : undefined,
        available: overrideForm.available,
      });
      await reload();
      setAddingOverride(false);
      setOverrideForm({ date: '', time: '', available: true });
      toast.success('Override added');
    } catch {
      toast.error('Failed to add override');
    }
  };

  const handleRemoveOverride = async (id: number) => {
    try {
      await removeDateOverride(id);
      setOverrides(prev => prev.filter(o => o.id !== id));
    } catch {
      toast.error('Failed to remove override');
    }
  };

  const fmtTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const INTERVALS = [
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '60 min' },
    { value: 90, label: '90 min' },
    { value: 120, label: '2 hrs' },
  ];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">

      {/* ── Add Block Form ── */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-indigo-700 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Add Availability Block
        </h3>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold tracking-wider">From</label>
            <input type="time" value={blockForm.startTime}
              onChange={e => setBlockForm(f => ({ ...f, startTime: e.target.value }))}
              className="text-sm border border-indigo-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-medium" />
          </div>
          <span className="text-gray-400 text-sm pb-2">→</span>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold tracking-wider">To</label>
            <input type="time" value={blockForm.endTime}
              onChange={e => setBlockForm(f => ({ ...f, endTime: e.target.value }))}
              className="text-sm border border-indigo-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-medium" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold tracking-wider">Session length</label>
            <select value={blockForm.intervalMinutes}
              onChange={e => setBlockForm(f => ({ ...f, intervalMinutes: Number(e.target.value) }))}
              className="text-sm border border-indigo-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-medium">
              {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-gray-500 font-semibold">Quick:</span>
          {(['all','weekdays','weekends'] as const).map(p => (
            <button key={p} type="button" onClick={() => setPreset(p)}
              className="text-xs px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition font-medium capitalize">
              {p === 'all' ? 'All Days' : p === 'weekdays' ? 'Mon – Fri' : 'Sat & Sun'}
            </button>
          ))}
          {blockForm.selectedDays.length > 0 && (
            <button type="button" onClick={() => setBlockForm(f => ({ ...f, selectedDays: [] }))}
              className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition">
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {DAYS_OF_WEEK.map(day => {
            const active = blockForm.selectedDays.includes(day);
            return (
              <button key={day} type="button" onClick={() => toggleDay(day)}
                className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>

        <button onClick={handleApplyBlock} disabled={saving || blockForm.selectedDays.length === 0}
          className="btn-nm-accent" style={{ padding: '10px 20px', fontSize: 13 }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Apply to {blockForm.selectedDays.length > 0 ? `${blockForm.selectedDays.length} day${blockForm.selectedDays.length > 1 ? 's' : ''}` : 'selected days'}
        </button>
      </div>

      {/* ── Weekly View ── */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Current Weekly Schedule
        </h3>
        <div className="space-y-2">
          {DAYS_OF_WEEK.map(day => {
            const dayBlocks = blocks[day] || [];
            return (
              <div key={day} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                <div className="w-24 flex-shrink-0">
                  <span className={`text-xs font-bold uppercase tracking-wider ${dayBlocks.length > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                    {day.slice(0, 3)}
                  </span>
                </div>
                <div className="flex-1 flex flex-wrap gap-2 min-h-[28px] items-center">
                  {dayBlocks.length === 0 && (
                    <span className="text-xs text-gray-300 italic">Off — no slots</span>
                  )}
                  {dayBlocks.map(b => (
                    <span key={b.id}
                      className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2.5 py-1.5 rounded-xl font-medium">
                      {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                      <span className="text-indigo-400 text-[10px]">/{b.intervalMinutes}m</span>
                      <button onClick={() => handleRemoveBlock(b.id)} className="ml-0.5 hover:text-red-500 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {dayBlocks.length > 0 && (
                  <button onClick={() => handleClearDay(day)}
                    className="text-[10px] text-gray-300 hover:text-red-400 transition flex-shrink-0 pt-1">
                    Clear all
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Date Overrides ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" /> Date Exceptions
          </h3>
          <button onClick={() => setAddingOverride(v => !v)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add exception
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">Block a specific date (leave, holiday) or add a one-off extra slot.</p>

        {addingOverride && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold">Date</label>
                <input type="date" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  value={overrideForm.date} onChange={e => setOverrideForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold">Type</label>
                <div className="flex gap-2 mt-1">
                  {[true, false].map(v => (
                    <button key={String(v)} type="button" onClick={() => setOverrideForm(f => ({ ...f, available: v }))}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${overrideForm.available === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {v ? 'Extra slot' : 'Block day'}
                    </button>
                  ))}
                </div>
              </div>
              {overrideForm.available && (
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold">Slot Time</label>
                  <input type="time" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    value={overrideForm.time} onChange={e => setOverrideForm(f => ({ ...f, time: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddOverride} className="btn-nm-accent" style={{ padding: '7px 16px', fontSize: 11 }}>Save</button>
              <button onClick={() => setAddingOverride(false)} className="btn-nm" style={{ padding: '7px 14px', fontSize: 11 }}>Cancel</button>
            </div>
          </div>
        )}

        {overrides.length === 0 ? (
          <p className="text-xs text-gray-300 py-4 text-center">No date exceptions set</p>
        ) : (
          <div className="space-y-2">
            {overrides.map(o => (
              <div key={o.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${o.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div>
                  <span className={`font-semibold ${o.available ? 'text-green-700' : 'text-red-600'}`}>
                    {format(parseISO(o.specificDate + 'T00:00:00'), 'EEEE, MMM d, yyyy')}
                  </span>
                  {o.available && o.slotTime && (
                    <span className="ml-2 text-xs text-gray-500">Extra slot at {fmtTime(o.slotTime.substring(0, 5))}</span>
                  )}
                  {!o.available && <span className="ml-2 text-xs text-red-400">Day blocked</span>}
                </div>
                <button onClick={() => handleRemoveOverride(o.id)} className="icon-btn">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
const TABS = [
  { key: 'profile',      label: 'Profile' },
  { key: 'services',     label: 'Services & Pricing' },
  { key: 'availability', label: 'Availability' },
  { key: 'practice',     label: 'Practice Info' },
  { key: 'payment',      label: 'Payment & Banking' },
  { key: 'holidays',     label: 'Leave Days' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('profile');

  return (
    <div style={{ maxWidth: 820 }} className="anim-fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em", marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 14, color: "var(--text-3)" }}>Your profile, services, availability, and practice details.</p>
      </div>

      <div className="soft-card-2" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, marginBottom: 24, flexWrap: 'wrap', width: 'fit-content' }}>
        {TABS.map(t => (
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
        {tab === 'profile'      && <ProfileTab />}
        {tab === 'services'     && <ServicesPricingTab />}
        {tab === 'availability' && <AvailabilityTab />}
        {tab === 'practice'     && <PracticeInfoTab />}
        {tab === 'payment'      && <BankAccountsSection />}
        {tab === 'holidays'     && <LeaveDaysTab />}
      </div>
    </div>
  );
}
