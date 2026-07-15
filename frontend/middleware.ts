import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Server-side gate for the admin area. Runs before any /dashboard page is
// served, so the dashboard is never reachable — not even its static shell —
// without a session cookie holding an unexpired JWT.
//
// The signature is NOT verified here (that would require shipping the
// backend secret to the edge). This gate blocks missing/expired sessions;
// a forged-but-unexpired token still fails every API call with 401, which
// immediately clears the session and redirects to /login client-side.

const AUTH_COOKIE = "individual_token";

function isTokenUsable(token: string): boolean {
    try {
        const part = token.split(".")[1];
        if (!part) return false;
        const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));
        // No exp claim, or an exp in the past → not usable
        return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
    } catch {
        return false; // malformed token → treat as no session
    }
}

export function middleware(request: NextRequest) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (!token || !isTokenUsable(token)) {
        const loginUrl = new URL(token ? "/login?expired=1" : "/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(AUTH_COOKIE);
        return response;
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
