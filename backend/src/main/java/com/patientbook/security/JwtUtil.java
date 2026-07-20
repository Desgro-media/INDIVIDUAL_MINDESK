package com.patientbook.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

    private static final String PLACEHOLDER_SECRET = "CHANGE_ME_generate_a_real_256bit_secret_before_deploying";
    private static final int MIN_SECRET_BYTES = 32; // 256 bits, matches HS256's key-size requirement

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long jwtExpirationInMs;

    // Fails startup outright on a misconfigured prod deploy, rather than
    // silently signing every token with the literal placeholder secret from
    // application.properties (previously the only thing stopping that was
    // remembering to set JWT_SECRET — this makes it impossible to forget).
    @PostConstruct
    public void validateSecret() {
        if (secret == null || secret.isBlank() || PLACEHOLDER_SECRET.equals(secret)) {
            throw new IllegalStateException(
                    "JWT_SECRET is not set (or is still the placeholder). Generate a real one, " +
                    "e.g. `openssl rand -base64 64`, and set it via the JWT_SECRET environment variable.");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET is too short — it must be at least 256 bits (32 bytes).");
        }
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        // UX-only — lets the frontend route a superadmin without an extra
        // round-trip. Never trusted for authorization: every request still
        // re-resolves the role from the DB via UserDetailsService/
        // CurrentUserProvider, same as before this claim existed.
        userDetails.getAuthorities().stream().findFirst()
                .ifPresent(authority -> claims.put("role", authority.getAuthority()));
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationInMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
}
