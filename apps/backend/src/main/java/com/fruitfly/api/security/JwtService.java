package com.fruitfly.api.security;

import com.fruitfly.api.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final SecretKey key;
  private final long expirationMinutes;

  public JwtService(AppProperties properties) {
    byte[] secret = properties.getSecurity().getJwtSecret().getBytes(StandardCharsets.UTF_8);
    this.key = Keys.hmacShaKeyFor(secret);
    this.expirationMinutes = properties.getSecurity().getJwtExpirationMinutes();
  }

  public String issueToken(UserPrincipal principal) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(expirationMinutes * 60);
    return Jwts.builder()
        .subject(principal.getId().toString())
        .claim("email", principal.getUsername())
        .claim("name", principal.getDisplayName())
        .claim("role", principal.getRole().name())
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .signWith(key)
        .compact();
  }

  public UUID parseUserId(String token) {
    Claims claims =
        Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    return UUID.fromString(claims.getSubject());
  }
}
