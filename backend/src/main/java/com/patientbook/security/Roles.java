package com.patientbook.security;

// Central definition of the two roles this app now has. Every account is one
// or the other — see AppUser.role, UserDetailsServiceImpl (wires this into
// Spring Security's GrantedAuthority), and SecurityConfig (URL-level rules).
public final class Roles {
    public static final String PSYCHOLOGIST = "ROLE_PSYCHOLOGIST";
    public static final String SUPERADMIN = "ROLE_SUPERADMIN";

    private Roles() {}
}
