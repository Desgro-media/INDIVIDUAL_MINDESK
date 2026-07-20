package com.patientbook.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

// Optional extra layer on top of the role check (SecurityConfig/@PreAuthorize)
// for the superadmin surface. OFF by default (empty allowlist = no
// restriction) so it can never lock the operator out unintentionally — set
// SUPERADMIN_IP_ALLOWLIST (comma-separated exact IPs or dotted prefixes, e.g.
// "203.0.113.7,10.0.0.") to turn it on. Not a substitute for the role check,
// just one more thing an attacker would need to also get past.
@Component
public class SuperAdminIpFilter extends OncePerRequestFilter {

    @Value("${superadmin.ip-allowlist:}")
    private String allowlistRaw;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        if (!request.getRequestURI().contains("/api/v1/superadmin/") || !StringUtils.hasText(allowlistRaw)) {
            filterChain.doFilter(request, response);
            return;
        }

        List<String> allowed = Arrays.stream(allowlistRaw.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toList();
        String ip = clientIp(request);
        if (allowed.stream().anyMatch(ip::startsWith)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Access denied from this network.\"}");
        }
    }

    // Caddy is the only reverse proxy in front of this app in every deployment
    // (see Caddyfile/docker-compose.prod.yml — the backend port is never
    // exposed directly), and its default reverse_proxy behavior APPENDS the
    // real connecting peer's address to any existing X-Forwarded-For rather
    // than replacing it. Taking the FIRST entry (as a naive implementation
    // would) reads a value the client fully controls — trivially spoofable
    // to bypass this allowlist from any IP. The LAST entry is the one Caddy
    // itself appended, so that's the only one that can be trusted here.
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            String[] hops = forwarded.split(",");
            return hops[hops.length - 1].trim();
        }
        return request.getRemoteAddr();
    }
}
