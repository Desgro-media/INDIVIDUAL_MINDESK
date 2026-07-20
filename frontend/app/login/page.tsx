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
      .then(() => {
        // Mirror the confirmed token into the middleware cookie first,
        // otherwise the /dashboard redirect bounces straight back here.
        syncSessionCookie();
        router.replace("/dashboard");
      })
      .catch(() => {
        clearSession();
        setCheckingSession(false);
      });
  }, [router, searchParams]);

  if (checkingSession) {
    return <div className="min-h-screen bg-[#0A1211]" />;
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
      });
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden bg-[#0A1211] text-white"
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 20% 0%, rgba(51,124,126,0.35) 0%, transparent 60%), radial-gradient(ellipse 50% 45% at 100% 20%, rgba(128,117,196,0.20) 0%, transparent 65%)",
        }}
      ></div>

      {/* Minimal Nav */}
      <nav className="relative z-10 px-7 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <div className="w-9 h-9 rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-[13px] font-medium">Back to Site</span>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl px-9 py-12 shadow-2xl shadow-black/40 anim-scale-in">

          <div className="text-center mb-9">
            <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
              <div className="w-11 h-11 rounded-full bg-[#337C7E]/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#5FE0C8]" />
              </div>
            </div>

            <h1
              className="text-2xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Sign In
            </h1>
            <p className="text-sm text-white/50">
              Access your practice dashboard
            </p>
          </div>

          {notice && !error && (
            <div className="anim-fade-in rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 mb-6 text-white/70 text-[13px] text-center">
              {notice}
            </div>
          )}

          {error && (
            <div className="anim-fade-in rounded-xl border border-[#fb4b6e]/25 bg-[#fb4b6e]/10 px-4 py-3 mb-6 text-[#ff8fa3] text-[13px] text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35 pointer-events-none" />
                <input
                  type="email"
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] pl-11 pr-4 py-3.5 text-[14px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#337C7E] focus:bg-white/[0.06]"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35 pointer-events-none" />
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] pl-11 pr-4 py-3.5 text-[14px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#337C7E] focus:bg-white/[0.06]"
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
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#337C7E] py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#3f9294] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </button>

          </form>

          <p className="text-center text-[13px] text-white/40 mt-7">
            New here?{" "}
            <Link href="/signup" className="text-[#5FE0C8] font-semibold hover:text-white transition-colors">
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
    <Suspense fallback={<div className="min-h-screen bg-[#0A1211]" />}>
      <LoginForm />
    </Suspense>
  );
}
