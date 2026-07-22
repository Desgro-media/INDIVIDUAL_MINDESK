"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, Settings, Sparkles,
  LogOut, Activity, Menu, X, Bell, BarChart, Receipt, Search, ShieldCheck,
  UserCog,
} from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import api from "../../lib/api";
import { clearSession } from "../../lib/authSession";
import { getSubscriptionStatus } from "../../lib/subscriptionApi";

type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  group: string;
};

function Sidebar({
  user,
  navItems,
  pathname,
  onNavClick,
  onLogout,
}: {
  user: any;
  navItems: NavItem[];
  pathname: string;
  onNavClick?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div style={{
        height: 72,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        borderBottom: "1px solid var(--sidebar-border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="brand-mark">
            <Activity style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <span className="brand-word">Mindesk</span>
        </div>
      </div>

      {/* Nav — grouped into labeled sections, TailAdmin-style */}
      <div style={{ flex: 1, padding: "8px 10px 16px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
        {navItems.map((item, i) => {
          const isActive = item.path === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.path);
          const showGroupLabel = item.group !== navItems[i - 1]?.group;
          return (
            <React.Fragment key={item.path}>
              {showGroupLabel && (
                <div className="nav-section-label">{item.group}</div>
              )}
              <Link
                href={item.path}
                onClick={onNavClick}
                className={`nav-link${isActive ? " active" : ""}`}
              >
                <item.icon className="nav-ic" />
                <span className="nav-lb">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span style={{
                    marginLeft: "auto",
                    minWidth: 20, height: 20,
                    borderRadius: 50,
                    background: isActive ? "rgba(255,255,255,0.25)" : "var(--warning)",
                    color: isActive ? "#fff" : "#1a1a1a",
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 5px",
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </React.Fragment>
          );
        })}
      </div>

      {/* User card */}
      <div style={{
        padding: "12px",
        borderTop: "1px solid var(--sidebar-border)",
        flexShrink: 0,
      }}>
        <div style={{
          borderRadius: 16,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--sidebar-card-bg)",
          border: "1px solid var(--sidebar-border)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14, color: "#fff",
            background: "linear-gradient(135deg, var(--grad-1-from), var(--grad-1-to))",
            boxShadow: "0 3px 10px var(--grad-1-glow)",
            flexShrink: 0,
          }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--sidebar-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || user.username}</p>
            <p style={{ fontSize: 11, color: "var(--sidebar-text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</p>
          </div>
          <button onClick={onLogout} className="icon-btn icon-btn--on-dark" title="Logout">
            <LogOut style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser]             = useState<any>(null);
  const [pendingCount, setPending]  = useState(0);
  const [sidebarOpen, setSidebar]   = useState(false);
  const [isMobile, setMobile]       = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locked, setLocked]         = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const token    = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.replace("/login");
      return;
    }

    // Presence of a token/user record in localStorage doesn't mean the
    // session is still valid (it may be expired, revoked, or copied from
    // another browser) — confirm with the server before rendering any
    // dashboard content or trusting the cached role/permissions.
    api.get("/auth/me")
      .then((res) => {
        setUser({ ...JSON.parse(userData), ...res.data });
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchPending = () => {
      api.get("/appointments")
        .then(res => {
          const count = res.data.filter((a: any) =>
            a.status === "AWAITING_PAYMENT" || a.status === "PAYMENT_UNDER_REVIEW"
          ).length;
          setPending(count);
        })
        .catch(() => {});
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Subscription gate — a locked account can still log in (per product
  // decision), but every other dashboard page bounces to the renew screen
  // until the superadmin approves a payment submission. The backend enforces
  // this on every API call (402 → redirected by lib/api.ts too); this just
  // avoids flashing real dashboard content first. Polls on the same 30s
  // cadence as pendingCount below so a practitioner sitting on the locked
  // Subscription page sees it unlock as soon as a superadmin approves,
  // without needing to navigate away and back.
  useEffect(() => {
    if (!user) return;
    const fetchStatus = () => {
      getSubscriptionStatus()
        .then(s => {
          setLocked(s.locked);
          setDaysRemaining(s.daysRemaining);
          if (s.locked && !pathname.startsWith("/dashboard/subscription")) {
            router.replace("/dashboard/subscription?locked=1");
          }
        })
        .catch(() => {});
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [user, pathname, router]);

  const handleLogout = async () => {
    // Best-effort — records a real logout time for clinic staff attendance
    // (see StaffAttendanceService). If it fails (offline, expired token),
    // the session is still cleared locally; a stray "still active" row just
    // means an admin sees a slightly stale attendance record, not a stuck login.
    try { await api.post("/auth/logout"); } catch {}
    clearSession();
    router.push("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/dashboard/patients?q=${encodeURIComponent(q)}` : "/dashboard/patients");
    if (isMobile) setSidebar(false);
  };

  // A clinic's tenant-root account (accountType CLINIC, no tenantId of its
  // own) manages staff; a clinic STAFF login (tenantId set) is instead
  // gated by its granted permissions — mirrors the backend's
  // StaffPermissionFilter exactly, so a staff member never sees a link that
  // would just 403 when clicked. Individuals and superadmin-adjacent tenant
  // roots are unaffected either way (isStaff stays false).
  // user is null during the initial (pre-hydration) render — see the
  // `if (!user) return ...` guard below — so every access here must
  // tolerate that rather than throwing during prerendering.
  const isClinicOwner = user?.accountType === "CLINIC" && !user?.tenantId;
  const isStaff = !!user?.tenantId;
  const staffPermissions: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
  const isStaffDoctor = isStaff && user?.role === "ROLE_PSYCHOLOGIST";

  const hasPermission = (permission: string) => {
    if (!isStaff) return true; // tenant roots always have full access
    if (isStaffDoctor && (permission === "APPOINTMENTS" || permission === "PATIENTS")) return true;
    return staffPermissions.includes(permission);
  };

  // Locked (trial/subscription lapsed) accounts only see the Subscription
  // page — everything else 404s at the API layer anyway (SubscriptionAccessFilter),
  // so there's no point showing nav links that would just bounce back here.
  const subscriptionBadge = locked ? 1 : (daysRemaining != null && daysRemaining <= 3 ? daysRemaining : undefined);
  const navItems: NavItem[] = locked
    ? [{ label: "Subscription", icon: ShieldCheck, path: "/dashboard/subscription", group: "Account", badge: subscriptionBadge }]
    : [
        { label: "Overview",      icon: LayoutDashboard, path: "/dashboard",              group: "Workspace" },
        ...(hasPermission("ANALYTICS") ? [{ label: "Analytics", icon: BarChart, path: "/dashboard/analytics", group: "Workspace" }] : []),
        ...(hasPermission("APPOINTMENTS") ? [{ label: "Appointments", icon: Calendar, path: "/dashboard/appointments", group: "Manage", badge: pendingCount }] : []),
        ...(hasPermission("PATIENTS") ? [{ label: "Patients", icon: Users, path: "/dashboard/patients", group: "Manage" }] : []),
        ...(hasPermission("BILLING") ? [{ label: "Billing", icon: Receipt, path: "/dashboard/billing", group: "Manage" }] : []),
        ...(hasPermission("SETTINGS") ? [{ label: "Services", icon: Sparkles, path: "/dashboard/services", group: "Manage" }] : []),
        ...(isClinicOwner ? [{ label: "Staff", icon: UserCog, path: "/dashboard/staff", group: "Manage" }] : []),
        // A staff-doctor needs the Settings page even without the SETTINGS
        // permission — it's the only UI for their own bio/services/
        // availability (the /me/** endpoints, self-scoped by construction).
        // The page itself hides the clinic-wide tabs (Practice/Payment/
        // Holidays) unless SETTINGS is actually granted — see settings/page.tsx.
        ...(hasPermission("SETTINGS") || isStaffDoctor ? [{ label: "Settings", icon: Settings, path: "/dashboard/settings", group: "System" }] : []),
        ...(!isStaff ? [{ label: "Subscription", icon: ShieldCheck, path: "/dashboard/subscription", group: "System", badge: subscriptionBadge }] : []),
      ];

  const pageTitle = (() => {
    const seg = pathname.split("/").pop();
    if (!seg || seg === "dashboard") return "Overview";
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  })();

  if (!user) return <div style={{ minHeight: "100vh" }} />;

  const framePad = isMobile ? 8 : 20;
  const frameGap = isMobile ? 0 : 16;

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      padding: framePad, gap: frameGap,
      boxSizing: "border-box", alignItems: "stretch",
    }}>

      {/* Desktop sidebar — its own floating rounded panel, separate from
          the content frame (the gap between them shows the body's aurora
          background, echoing the reference's two distinct floating cards).
          Solid dark navy (TailAdmin-style), independent of light/dark theme. */}
      <aside className="sidebar-shell anim-fade-up" style={{
        width: 240,
        display: isMobile ? "none" : "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: framePad,
        height: `calc(100vh - ${framePad * 2}px)`,
      }}>
        <Sidebar
          user={user}
          navItems={navItems}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div
            className="overlay-enter"
            style={{
              position: "absolute", inset: 0,
              background: "rgba(10,14,40,0.45)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={() => setSidebar(false)}
          />
          <aside className="sidebar-shell sidebar-shell--drawer drawer-enter" style={{
            position: "relative",
            width: 240,
            display: "flex",
            flexDirection: "column",
            boxShadow: "8px 0 40px rgba(0,0,0,0.32)",
          }}>
            <button
              onClick={() => setSidebar(false)}
              style={{
                position: "absolute", top: 16, right: 16,
                background: "rgba(255,255,255,0.10)", border: "1px solid var(--sidebar-border)",
                borderRadius: 10, padding: 6, cursor: "pointer", color: "var(--sidebar-text)",
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
            <Sidebar
              user={user}
              navItems={navItems}
              pathname={pathname}
              onNavClick={() => setSidebar(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Main content — its own floating rounded panel */}
      <main className="app-frame anim-fade-up d1" style={{
        flex: 1, display: "flex", flexDirection: "column",
        minWidth: 0,
        height: `calc(100vh - ${framePad * 2}px)`,
      }}>

        {/* Header — liquid glass */}
        <header style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
          zIndex: 9,
          background: "var(--glass-header)",
          backdropFilter: "blur(var(--blur-lg)) saturate(var(--sat))",
          WebkitBackdropFilter: "blur(var(--blur-lg)) saturate(var(--sat))",
          borderBottom: "1px solid var(--glass-border-dim)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button
                style={{
                  padding: 8, borderRadius: 11, border: "1px solid var(--glass-border-dim)",
                  background: "var(--glass)", cursor: "pointer", color: "var(--text-2)",
                  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onClick={() => setSidebar(true)}
              >
                <Menu style={{ width: 18, height: 18 }} />
              </button>
            )}
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.02em" }}>{pageTitle}</h2>
          </div>

          {!isMobile && (
            <form onSubmit={handleSearchSubmit} className="header-search" style={{ flex: 1, margin: "0 24px" }}>
              <Search style={{ width: 15, height: 15, color: "var(--text-3)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ThemeToggle />

            {pendingCount > 0 && (
              <Link href="/dashboard/appointments" style={{ position: "relative", display: "flex", textDecoration: "none" }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--glass)",
                  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid var(--glass-border-dim)",
                  boxShadow: "0 2px 10px var(--glass-shadow)",
                }}>
                  <Bell style={{ width: 16, height: 16, color: "var(--accent)" }} />
                </div>
                <span className="badge-pop" style={{
                  position: "absolute", top: 0, right: 0,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "var(--warning)",
                  color: "#1a1a1a", fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(245,158,11,0.4)",
                }}>
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              </Link>
            )}

            {/* Avatar */}
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 14, color: "#fff",
              background: "linear-gradient(135deg, var(--grad-1-from), var(--grad-1-to))",
              boxShadow: "0 3px 12px var(--grad-1-glow)",
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content — keyed by route so each page animates in */}
        <div style={{
          flex: 1,
          overflow: "auto",
          padding: isMobile ? "18px 14px" : "28px 28px",
        }}>
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
