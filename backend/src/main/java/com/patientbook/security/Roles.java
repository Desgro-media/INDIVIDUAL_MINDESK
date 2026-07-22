package com.patientbook.security;

// Central definition of every role this app has. See AppUser.role,
// UserDetailsServiceImpl (wires this into Spring Security's
// GrantedAuthority), and SecurityConfig (URL-level rules).
//
// PSYCHOLOGIST is used both by tenant-root accounts (individual freelancers
// and clinic owners) AND by a clinic's bookable staff doctors (AppUser rows
// with tenantId set) — a staff doctor manages their own calendar via
// /api/v1/me/** exactly like an individual does, for free. RECEPTIONIST and
// STAFF only ever appear on rows with tenantId set (clinic staff, never
// tenant roots). See CurrentUserProvider.isTenantRoot() / getCurrentTenantId()
// for how tenant-scoping resolves regardless of which of these a caller has.
public final class Roles {
    public static final String PSYCHOLOGIST = "ROLE_PSYCHOLOGIST";
    public static final String RECEPTIONIST = "ROLE_RECEPTIONIST";
    public static final String STAFF = "ROLE_STAFF";
    public static final String SUPERADMIN = "ROLE_SUPERADMIN";

    private Roles() {}
}
