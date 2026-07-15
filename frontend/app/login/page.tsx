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
    return <div style={{ minHeight: "100vh" }} />;
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
              Sign In
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-2)" }}>
              Access your practice dashboard
            </p>
          </div>

          {notice && !error && (
            <div className="anim-fade-in nm-inset-sm" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 24, color: "var(--text-2)", fontSize: 13, textAlign: "center" }}>
              {notice}
            </div>
          )}

          {error && (
            <div className="anim-fade-in nm-inset-sm" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 24, color: "var(--danger)", fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

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
              className="btn-nm-accent"
              disabled={loading || !email || !password}
              style={{ width: "100%", marginTop: 12 }}
            >
              {loading ? "Signing in..." : (
                <><LogIn style={{ width: 16, height: 16 }} /> Sign In</>
              )}
            </button>

          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-3)", marginTop: 24 }}>
            New here?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
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
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <LoginForm />
    </Suspense>
  );
}
