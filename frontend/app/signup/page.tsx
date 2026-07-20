"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, User, Mail, Lock, UserPlus, ArrowLeft } from "lucide-react";
import api from "../../lib/api";
import { storeSession } from "../../lib/authSession";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/signup", { name, email, password });
      storeSession(res.data.token, {
        id: res.data.id,
        username: res.data.username,
        name: res.data.name,
        slug: res.data.slug,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not create your account. Please try again.");
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
              Create Your Account
            </h1>
            <p className="text-sm text-white/50">
              Set up your own practice dashboard and booking link
            </p>
          </div>

          {error && (
            <div className="anim-fade-in rounded-xl border border-[#fb4b6e]/25 bg-[#fb4b6e]/10 px-4 py-3 mb-6 text-[#ff8fa3] text-[13px] text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-5">

            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em] mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35 pointer-events-none" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] pl-11 pr-4 py-3.5 text-[14px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#337C7E] focus:bg-white/[0.06]"
                  placeholder="Dr. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

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
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name || !email || !password}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#337C7E] py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#3f9294] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              )}
            </button>

          </form>

          <p className="text-center text-[13px] text-white/40 mt-7">
            Already have an account?{" "}
            <Link href="/login" className="text-[#5FE0C8] font-semibold hover:text-white transition-colors">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
