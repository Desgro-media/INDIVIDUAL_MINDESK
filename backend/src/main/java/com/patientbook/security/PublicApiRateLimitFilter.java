package com.patientbook.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

// Lightweight, single-instance, in-memory rate limiter for the unauthenticated
// public booking surface (no login, so no per-user identity to throttle on —
// only the client IP). Fixed-window counter per (IP, bucket): cheap, no new
// dependency, good enough for one backend instance. If this app ever runs as
// multiple replicas, this needs to move to a shared store (e.g. Redis)
// instead, since each instance would otherwise track its own counters.
@Component
public class PublicApiRateLimitFilter extends OncePerRequestFilter {

    private record Bucket(String key, int limit, long windowMillis) {}

    // POST /appointments is the actual booking submission — cheapest way to
    // spam-fill someone's calendar or the notifications pipeline (SMS/email
    // are sent per booking), so it gets the tightest limit.
    private static final Bucket BOOKING_SUBMIT = new Bucket("booking", 8, 10 * 60_000L);
    // /patients/check leaks a boolean per phone number — without a limit it's
    // a free phone-number enumeration oracle against a practitioner's patient list.
    private static final Bucket PATIENT_CHECK = new Bucket("patient-check", 20, 60_000L);
    // Everything else under /public/** (info/services/slots/holidays) is read
    // traffic a legitimate booking page fires several of on every load.
    private static final Bucket PUBLIC_READ = new Bucket("public-read", 120, 60_000L);

    private static final class Counter {
        final AtomicLong windowStart = new AtomicLong(System.currentTimeMillis());
        final AtomicInteger count = new AtomicInteger(0);
    }

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        Bucket bucket = bucketFor(request);
        if (bucket == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = bucket.key() + ':' + clientIp(request);
        if (!allow(key, bucket)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests — please try again shortly.\"}");
            return;
        }

        // Cap unbounded growth from a slow trickle of distinct IPs over a long
        // uptime — not a precise LRU, just a safety valve.
        if (counters.size() > 50_000) {
            counters.clear();
        }

        filterChain.doFilter(request, response);
    }

    private boolean allow(String key, Bucket bucket) {
        Counter counter = counters.computeIfAbsent(key, k -> new Counter());
        long now = System.currentTimeMillis();
        long start = counter.windowStart.get();

        if (now - start > bucket.windowMillis()) {
            // Window elapsed — reset if we win the race, otherwise fall through
            // and let whoever reset it own this window.
            if (counter.windowStart.compareAndSet(start, now)) {
                counter.count.set(0);
            }
        }

        return counter.count.incrementAndGet() <= bucket.limit();
    }

    private Bucket bucketFor(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method) && uri.endsWith("/api/v1/appointments")) {
            return BOOKING_SUBMIT;
        }
        if (!uri.contains("/api/v1/public/")) {
            return null;
        }
        if (uri.endsWith("/patients/check")) {
            return PATIENT_CHECK;
        }
        return PUBLIC_READ;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
