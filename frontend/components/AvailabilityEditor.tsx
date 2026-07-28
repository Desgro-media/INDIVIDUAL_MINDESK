"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Loader2, Calendar, Plus, Trash2, Check, Settings, X, Video, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAvailabilityBlocks, addAvailabilityBlocks, removeAvailabilityBlock, clearDayBlocks,
  getDateOverrides, addDateOverride, removeDateOverride, DateOverride, AvailabilityBlock,
} from "../lib/profileApi";

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_OPTIONS = [0, 15, 30, 45];

function to12h(value24: string) {
  const [hStr, mStr] = (value24 || '00:00').split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const meridiem: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { h12, m, meridiem };
}

function from24h(h12: number, m: number, meridiem: 'AM' | 'PM') {
  const h = meridiem === 'PM' ? (h12 % 12) + 12 : h12 % 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function TimeInput12h({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  const { h12, m, meridiem } = to12h(value);
  // Preserve any odd saved minute (e.g. legacy ":05") instead of silently rounding it away.
  const minuteOptions = MINUTE_OPTIONS.includes(m) ? MINUTE_OPTIONS : [...MINUTE_OPTIONS, m].sort((a, b) => a - b);

  return (
    <div className={`flex items-center gap-1 border border-indigo-200 rounded-xl px-2 bg-white ${className}`}>
      <select aria-label="Hour" value={h12} onChange={e => onChange(from24h(Number(e.target.value), m, meridiem))}
        className="text-sm font-medium bg-transparent outline-none cursor-pointer py-2">
        {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-gray-400">:</span>
      <select aria-label="Minute" value={m} onChange={e => onChange(from24h(h12, Number(e.target.value), meridiem))}
        className="text-sm font-medium bg-transparent outline-none cursor-pointer py-2">
        {minuteOptions.map(mm => <option key={mm} value={mm}>{String(mm).padStart(2, '0')}</option>)}
      </select>
      <select aria-label="AM or PM" value={meridiem} onChange={e => onChange(from24h(h12, m, e.target.value as 'AM' | 'PM'))}
        className="text-sm font-semibold bg-transparent outline-none cursor-pointer text-indigo-600 py-2">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

// ── Availability editor ──────────────────────────────────────────────────────
// Online and in-person are genuinely separate calendars (separate blocks,
// separate date overrides) — this component fetches both in one call each
// (every block/override tagged with its own `mode`) and filters client-side
// by whichever mode tab is active, so switching tabs never refetches.
//
// staffId is optional: omit it to manage the logged-in practitioner's own
// calendar (/me/**); pass a staff member's id to let a clinic owner manage
// that staff member's calendar instead (/staff/{staffId}/**, ownership-
// checked server-side — see StaffAvailabilityController). The UI is
// identical either way.
export default function AvailabilityEditor({ staffId }: { staffId?: number } = {}) {
  const [activeMode, setActiveMode] = useState<'OFFLINE' | 'ONLINE'>('OFFLINE');
  const [blocks, setBlocks] = useState<Record<string, AvailabilityBlock[]>>({});
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingOverride, setAddingOverride] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ date: '', time: '09:00', available: true, bothModes: true });

  const [blockForm, setBlockForm] = useState({
    startTime: '09:00',
    endTime: '11:00',
    intervalMinutes: 60,
    selectedDays: [] as string[],
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [blk, ov] = await Promise.all([getAvailabilityBlocks(staffId), getDateOverrides(staffId)]);
      setBlocks(blk);
      setOverrides(ov);
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => { reload(); }, [reload]);

  // Only this tab's calendar — a block/override belonging to the other
  // mode's calendar must never appear here, and vice versa.
  const blocksForActiveMode = useMemo(() => {
    const filtered: Record<string, AvailabilityBlock[]> = {};
    for (const day of DAYS_OF_WEEK) {
      filtered[day] = (blocks[day] || []).filter(b => b.mode === activeMode);
    }
    return filtered;
  }, [blocks, activeMode]);

  // Whole-day (mode === null) overrides affect every calendar, so they
  // stay visible on both tabs; mode-specific overrides only show on their
  // own tab.
  const overridesForActiveMode = useMemo(
    () => overrides.filter(o => o.mode === null || o.mode === activeMode),
    [overrides, activeMode]
  );

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
      await addAvailabilityBlocks(blockForm.selectedDays, blockForm.startTime, blockForm.endTime, blockForm.intervalMinutes, activeMode, staffId);
      toast.success(`${activeMode === 'ONLINE' ? 'Online' : 'In-person'} block applied to ${blockForm.selectedDays.length} day${blockForm.selectedDays.length > 1 ? 's' : ''}`);
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
      await removeAvailabilityBlock(blockId, staffId);
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
    if (!confirm(`Clear all ${activeMode === 'ONLINE' ? 'online' : 'in-person'} availability blocks for ${day.charAt(0) + day.slice(1).toLowerCase()}?`)) return;
    try {
      await clearDayBlocks(day, activeMode, staffId);
      setBlocks(prev => ({ ...prev, [day]: (prev[day] || []).filter(b => b.mode !== activeMode) }));
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
        // A whole-day block can apply to both calendars (mode omitted) or
        // just the tab you're currently on; an extra slot always names a
        // mode explicitly — the backend rejects a slot-specific override
        // with no mode.
        mode: overrideForm.available
          ? activeMode
          : (overrideForm.bothModes ? undefined : activeMode),
      }, staffId);
      await reload();
      setAddingOverride(false);
      setOverrideForm({ date: '', time: '09:00', available: true, bothModes: true });
      toast.success('Override added');
    } catch {
      toast.error('Failed to add override');
    }
  };

  const handleRemoveOverride = async (id: number) => {
    try {
      await removeDateOverride(id, staffId);
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

      {/* ── Mode switcher — online and in-person are separate calendars ── */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        {(['OFFLINE', 'ONLINE'] as const).map(m => (
          <button key={m} type="button" onClick={() => setActiveMode(m)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeMode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {m === 'ONLINE' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            {m === 'ONLINE' ? 'Online' : 'In-person'}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 -mt-4">
        {activeMode === 'ONLINE'
          ? 'Video-call hours — can be completely different from the in-person schedule.'
          : 'In-person / in-clinic hours — can be completely different from the online schedule.'}
      </p>

      {/* ── Add Block Form ── */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-indigo-700 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Add {activeMode === 'ONLINE' ? 'Online' : 'In-person'} Availability Block
        </h3>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold tracking-wider">From</label>
            <TimeInput12h value={blockForm.startTime} onChange={v => setBlockForm(f => ({ ...f, startTime: v }))} />
          </div>
          <span className="text-gray-400 text-sm pb-2">→</span>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold tracking-wider">To</label>
            <TimeInput12h value={blockForm.endTime} onChange={v => setBlockForm(f => ({ ...f, endTime: v }))} />
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
          <Calendar className="w-3.5 h-3.5" /> Current {activeMode === 'ONLINE' ? 'Online' : 'In-person'} Weekly Schedule
        </h3>
        <div className="space-y-2">
          {DAYS_OF_WEEK.map(day => {
            const dayBlocks = blocksForActiveMode[day] || [];
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
                  <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold">
                    Slot Time ({activeMode === 'ONLINE' ? 'Online' : 'In-person'})
                  </label>
                  <TimeInput12h className="border-gray-200" value={overrideForm.time} onChange={v => setOverrideForm(f => ({ ...f, time: v }))} />
                </div>
              )}
              {!overrideForm.available && (
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 uppercase font-semibold">Applies to</label>
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={() => setOverrideForm(f => ({ ...f, bothModes: true }))}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${overrideForm.bothModes ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      Both modes
                    </button>
                    <button type="button" onClick={() => setOverrideForm(f => ({ ...f, bothModes: false }))}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${!overrideForm.bothModes ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {activeMode === 'ONLINE' ? 'Online only' : 'In-person only'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddOverride} className="btn-nm-accent" style={{ padding: '7px 16px', fontSize: 11 }}>Save</button>
              <button onClick={() => setAddingOverride(false)} className="btn-nm" style={{ padding: '7px 14px', fontSize: 11 }}>Cancel</button>
            </div>
          </div>
        )}

        {overridesForActiveMode.length === 0 ? (
          <p className="text-xs text-gray-300 py-4 text-center">No date exceptions set</p>
        ) : (
          <div className="space-y-2">
            {overridesForActiveMode.map(o => (
              <div key={o.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${o.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div>
                  <span className={`font-semibold ${o.available ? 'text-green-700' : 'text-red-600'}`}>
                    {format(parseISO(o.specificDate + 'T00:00:00'), 'EEEE, MMM d, yyyy')}
                  </span>
                  {o.available && o.slotTime && (
                    <span className="ml-2 text-xs text-gray-500">Extra {o.mode === 'ONLINE' ? 'online' : 'in-person'} slot at {fmtTime(o.slotTime.substring(0, 5))}</span>
                  )}
                  {!o.available && (
                    <span className="ml-2 text-xs text-red-400">
                      {o.mode === null ? 'Day blocked (both modes)' : `${o.mode === 'ONLINE' ? 'Online' : 'In-person'} blocked this day`}
                    </span>
                  )}
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
