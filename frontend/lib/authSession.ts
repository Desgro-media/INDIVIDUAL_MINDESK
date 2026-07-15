// Session helpers shared by the login page, the dashboard layout, and the
// axios interceptor. The JWT lives in localStorage (read by lib/api.ts for
// the Authorization header) and is mirrored into a cookie so middleware.ts
// can gate /dashboard routes on the server before any page is served.
// Every code path that creates or destroys a session must go through these
// helpers so localStorage and the cookie never drift apart.

export const AUTH_COOKIE = "individual_token";

const FALLBACK_MAX_AGE = 8 * 60 * 60; // seconds — matches backend jwt.expiration

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const part = token.split(".")[1];
        if (!part) return null;
        const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

// Seconds until the token expires, so the cookie dies exactly when the JWT does.
function tokenMaxAge(token: string): number {
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    if (typeof exp === "number") {
        const secs = Math.floor(exp - Date.now() / 1000);
        return secs > 0 ? secs : 0;
    }
    return FALLBACK_MAX_AGE;
}

function setAuthCookie(token: string) {
    document.cookie =
        `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${tokenMaxAge(token)}; SameSite=Lax`;
}

export function storeSession(token: string, user: object) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setAuthCookie(token);
}

// Re-mirror an already-stored token into the cookie (e.g. after the server
// confirmed via /auth/me that a localStorage token predating the cookie
// mechanism is still valid). Without this the middleware would bounce the
// user back to /login in a loop.
export function syncSessionCookie() {
    const token = localStorage.getItem("token");
    if (token) setAuthCookie(token);
}

export function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
