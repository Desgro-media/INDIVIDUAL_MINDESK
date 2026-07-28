"use client";

import React, { useEffect, useState } from "react";
import { Loader2, MapPin, Video, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { getMyServices, saveMyServices, DoctorServicePrice } from "../lib/profileApi";

interface CatalogService {
  id: number;
  name: string;
  duration: string;
  active: boolean;
}

type RowState = {
  offlineOffered: boolean;
  offlinePrice: string;
  onlineOffered: boolean;
  onlinePrice: string;
};

const emptyRow = (): RowState => ({ offlineOffered: false, offlinePrice: "", onlineOffered: false, onlinePrice: "" });

// Lets a clinic owner set which of the clinic's catalog services a specific
// staff member offers, and at what price per mode — the same data a staff
// member would otherwise configure themselves on the Services page (see
// profileApi's getMyServices/saveMyServices, both staffId-aware). Adding new
// service TYPES is unaffected and still lives on the Services page — this
// editor only prices EXISTING catalog services for one staff member.
export default function StaffServicesEditor({ staffId }: { staffId: number }) {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get("/services"),
      getMyServices(staffId),
    ]).then(([svcRes, pricing]: [{ data: CatalogService[] }, DoctorServicePrice[]]) => {
      if (cancelled) return;
      const active = svcRes.data.filter(s => s.active);
      setServices(active);
      const byId: Record<number, RowState> = {};
      for (const svc of active) {
        const p = pricing.find(x => x.clinicServiceId === svc.id);
        byId[svc.id] = p ? {
          offlineOffered: p.offlineOffered,
          offlinePrice: p.offlinePrice != null ? String(p.offlinePrice) : "",
          onlineOffered: p.onlineOffered,
          onlinePrice: p.onlinePrice != null ? String(p.onlinePrice) : "",
        } : emptyRow();
      }
      setRows(byId);
    }).catch(() => toast.error("Failed to load services")).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [staffId]);

  const setRow = (serviceId: number, patch: Partial<RowState>) => {
    setRows(prev => ({ ...prev, [serviceId]: { ...(prev[serviceId] ?? emptyRow()), ...patch } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = services.map(svc => {
        const r = rows[svc.id] ?? emptyRow();
        return {
          clinicServiceId: svc.id,
          offlineOffered: r.offlineOffered,
          offlinePrice: Number(r.offlinePrice) || 0,
          onlineOffered: r.onlineOffered,
          onlinePrice: Number(r.onlinePrice) || 0,
        };
      });
      await saveMyServices(updates, staffId);
      toast.success("Services & pricing updated");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No active services in the catalog yet. Add some on the Services page first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Choose which services this practitioner offers, in which mode, and at what price.</p>

      <div className="space-y-3">
        {services.map(svc => {
          const r = rows[svc.id] ?? emptyRow();
          return (
            <div key={svc.id} className="soft-card-2" style={{ borderRadius: 16, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{svc.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{svc.duration}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* In-person */}
                <div className="soft-card" style={{ borderRadius: 14, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: r.offlineOffered ? 8 : 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>
                      <MapPin style={{ width: 13, height: 13, color: "var(--accent)" }} /> In-person
                    </span>
                    <button type="button" onClick={() => setRow(svc.id, { offlineOffered: !r.offlineOffered })}
                      style={{
                        position: "relative", width: 36, height: 20, borderRadius: 50, border: "none", cursor: "pointer",
                        background: r.offlineOffered ? "var(--accent)" : "var(--bg)",
                        boxShadow: r.offlineOffered ? "2px 2px 6px #4a5bcc" : "inset 2px 2px 4px var(--sd), inset -2px -2px 4px var(--sl)",
                      }}>
                      <span style={{ position: "absolute", top: 3, width: 14, height: 14, background: r.offlineOffered ? "#fff" : "var(--sd)", borderRadius: "50%", left: r.offlineOffered ? 19 : 3, transition: "left 0.2s ease" }} />
                    </button>
                  </div>
                  {r.offlineOffered && (
                    <input type="number" step="0.01" value={r.offlinePrice}
                      onChange={e => setRow(svc.id, { offlinePrice: e.target.value })}
                      placeholder="Price (₹)" className="nm-input no-icon" style={{ fontSize: 12, padding: "6px 10px" }} />
                  )}
                </div>
                {/* Online */}
                <div className="soft-card" style={{ borderRadius: 14, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: r.onlineOffered ? 8 : 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>
                      <Video style={{ width: 13, height: 13, color: "var(--accent)" }} /> Online
                    </span>
                    <button type="button" onClick={() => setRow(svc.id, { onlineOffered: !r.onlineOffered })}
                      style={{
                        position: "relative", width: 36, height: 20, borderRadius: 50, border: "none", cursor: "pointer",
                        background: r.onlineOffered ? "var(--accent)" : "var(--bg)",
                        boxShadow: r.onlineOffered ? "2px 2px 6px #4a5bcc" : "inset 2px 2px 4px var(--sd), inset -2px -2px 4px var(--sl)",
                      }}>
                      <span style={{ position: "absolute", top: 3, width: 14, height: 14, background: r.onlineOffered ? "#fff" : "var(--sd)", borderRadius: "50%", left: r.onlineOffered ? 19 : 3, transition: "left 0.2s ease" }} />
                    </button>
                  </div>
                  {r.onlineOffered && (
                    <input type="number" step="0.01" value={r.onlinePrice}
                      onChange={e => setRow(svc.id, { onlinePrice: e.target.value })}
                      placeholder="Price (₹)" className="nm-input no-icon" style={{ fontSize: 12, padding: "6px 10px" }} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-nm-accent" style={{ padding: "10px 20px", fontSize: 13 }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </div>
  );
}
