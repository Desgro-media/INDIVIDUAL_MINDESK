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

function decodeRole(token: string): string | null {
    try {
        const part = token.split(".")[1];
        if (!part) return null;
        const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));
        return typeof payload.role === "string" ? payload.role : null;
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    // /admin itself is the platform-admin login form. It's matched by
    // "/admin/:path*" below (":path*" matches zero segments too) but must
    // never be gated, or an unauthenticated visit would redirect to itself in
    // a loop. Exact-match, so /admin/dashboard is still gated normally.
    if (request.nextUrl.pathname === "/admin") {
        return NextResponse.next();
    }

    // The platform-admin console lives at an unlisted URL — nothing in the
    // marketing site, the client login, or the practitioner dashboard links
    // to it, and /login deliberately never routes here (see app/login).
    // You reach it only by typing /admin.
    const isSuperAdminArea = request.nextUrl.pathname.startsWith("/admin");
    const loginPath = isSuperAdminArea ? "/admin" : "/login";

    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (!token || !isTokenUsable(token)) {
        const loginUrl = new URL(token ? `${loginPath}?expired=1` : loginPath, request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(AUTH_COOKIE);
        return response;
    }

    // Superadmin area also gets a quick role check here for UX (skip
    // rendering the admin shell for an obviously-wrong session). This is NOT
    // signature-verified (see comment above) and is not the real access
    // control — every /api/v1/superadmin/** call is independently enforced
    // server-side via hasAuthority('ROLE_SUPERADMIN').
    if (isSuperAdminArea && decodeRole(token) !== "ROLE_SUPERADMIN") {
        const response = NextResponse.redirect(new URL("/admin", request.url));
        response.cookies.delete(AUTH_COOKIE);
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*"],
};
