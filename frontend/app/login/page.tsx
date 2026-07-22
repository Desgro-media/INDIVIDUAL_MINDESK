"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Activity, Mail, Lock, LogIn, ArrowLeft } from "lucide-react";
import api from "../../lib/api";
import { storeSession, syncSessionCookie, clearSession } from "../../lib/authSession";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      setCheckingSession(false);
      if (searchParams.get("expired") === "1") {
        setNotice("Your session expired. Please sign in again.");
      }
      return;
    }

    // A token/user record existing in localStorage is not proof of a valid
    // session — it may be stale, expired, or left behind on a shared
    // machine. Confirm it against the server before skipping the login form.
    api.get("/auth/me")
      .then((res) => {
        // Mirror the confirmed token into the middleware cookie first,
        // otherwise the /dashboard redirect bounces straight back here.
        syncSessionCookie();
        router.replace(res.data.role === "ROLE_SUPERADMIN" ? "/superadmin/dashboard" : "/dashboard");
      })
      .catch(() => {
        clearSession();
        setCheckingSession(false);
      });
  }, [router, searchParams]);

  if (checkingSession) {
    return <div className="min-h-screen bg-white" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      storeSession(res.data.token, {
        id: res.data.id,
        username: res.data.username,
        name: res.data.name,
        slug: res.data.slug,
        role: res.data.role,
        accountType: res.data.accountType,
        tenantId: res.data.tenantId,
        permissions: res.data.permissions,
      });
      // This form is the practitioner entry point — a superadmin account
      // (there's only ever one, seeded server-side) still routes correctly
      // if it ends up here instead of /superadmin/login.
      router.push(res.data.role === "ROLE_SUPERADMIN" ? "/superadmin/dashboard" : "/dashboard");
    } catch (err) {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden bg-white text-[#1b2048]"
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 20% 0%, rgba(79,110,247,0.16) 0%, transparent 60%), radial-gradient(ellipse 50% 45% at 100% 20%, rgba(122,108,230,0.14) 0%, transparent 65%)",
        }}
      ></div>

      {/* Minimal Nav */}
      <nav className="relative z-10 px-7 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-[#4a5282] hover:text-[#1b2048] transition-colors">
          <div className="w-9 h-9 rounded-full border border-[#E4E8FF] bg-[#F8F9FF] flex items-center justify-center">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-[13px] font-medium">Back to Site</span>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px] rounded-[28px] border border-[#E4E8FF] bg-white px-9 py-12 shadow-[0_12px_28px_rgba(80,110,200,0.07),0_32px_64px_rgba(80,110,200,0.11)] anim-scale-in">

          <div className="text-center mb-9">
            <div className="w-16 h-16 rounded-full border border-[#E4E8FF] bg-[#F8F9FF] flex items-center justify-center mx-auto mb-5">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7A6CE6 0%, #4B3EC2 100%)" }}
              >
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>

            <h1
              className="text-2xl font-bold text-[#1b2048] mb-2"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Sign In
            </h1>
            <p className="text-sm text-[#4a5282]">
              Access your practice dashboard
            </p>
          </div>

          {notice && !error && (
            <div className="anim-fade-in rounded-xl border border-[#E4E8FF] bg-[#F3F5FF] px-4 py-3 mb-6 text-[#4a5282] text-[13px] text-center">
              {notice}
            </div>
          )}

          {error && (
            <div className="anim-fade-in rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] px-4 py-3 mb-6 text-[#B91C1C] text-[13px] text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            <div>
              <label className="block text-[11px] font-semibold text-[#8a90bc] uppercase tracking-[0.08em] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a90bc] pointer-events-none" />
                <input
                  type="email"
                  className="w-full rounded-xl border border-[#E4E8FF] bg-[#F8F9FF] pl-11 pr-4 py-3.5 text-[14px] text-[#1b2048] placeholder:text-[#8a90bc] outline-none transition-colors focus:border-[#4f6ef7] focus:bg-white"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8a90bc] uppercase tracking-[0.08em] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a90bc] pointer-events-none" />
                <input
                  type="password"
                  className="w-full rounded-xl border border-[#E4E8FF] bg-[#F8F9FF] pl-11 pr-4 py-3.5 text-[14px] text-[#1b2048] placeholder:text-[#8a90bc] outline-none transition-colors focus:border-[#4f6ef7] focus:bg-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#4f6ef7] py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#3d5ce0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </button>

          </form>

          <p className="text-center text-[13px] text-[#8a90bc] mt-7">
            New here?{" "}
            <Link href="/signup" className="text-[#4f6ef7] font-semibold hover:text-[#3d5ce0] transition-colors">
              Create an account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
