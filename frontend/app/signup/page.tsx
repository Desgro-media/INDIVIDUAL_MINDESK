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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Minimal Nav */}
      <nav style={{ padding: "20px 28px", position: "absolute", top: 0, left: 0, right: 0 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div className="btn-nm" style={{ width: 36, height: 36, borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft style={{ width: 15, height: 15, color: "var(--text-2)" }} />
          </div>
          <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Back to Site</span>
        </Link>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>

        <div className="nm-raised-lg anim-scale-in" style={{ borderRadius: 28, padding: "48px 36px", width: "100%", maxWidth: 420 }}>

          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div className="nm-raised" style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="nm-inset" style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity style={{ width: 20, height: 20, color: "var(--accent)" }} />
              </div>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>
              Create Your Account
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-2)" }}>
              Set up your own practice dashboard and booking link
            </p>
          </div>

          {error && (
            <div className="anim-fade-in nm-inset-sm" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 24, color: "var(--danger)", fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", pointerEvents: "none" }}>
                  <User style={{ width: 14, height: 14 }} />
                </div>
                <input
                  type="text"
                  className="nm-input"
                  placeholder="Dr. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", pointerEvents: "none" }}>
                  <Mail style={{ width: 14, height: 14 }} />
                </div>
                <input
                  type="email"
                  className="nm-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", pointerEvents: "none" }}>
                  <Lock style={{ width: 14, height: 14 }} />
                </div>
                <input
                  type="password"
                  className="nm-input"
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
              className="btn-nm-accent"
              disabled={loading || !name || !email || !password}
              style={{ width: "100%", marginTop: 12 }}
            >
              {loading ? "Creating account..." : (
                <><UserPlus style={{ width: 16, height: 16 }} /> Create Account</>
              )}
            </button>

          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-3)", marginTop: 24 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
