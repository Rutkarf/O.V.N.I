package com.fruitfly.api.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "demo_sessions")
public class DemoSessionEntity {

  @Id private UUID id;

  @Column(name = "owner_id")
  private UUID ownerId;

  @Column(nullable = false)
  private String title = "session";

  private Long seed;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private String payload;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "expires_at")
  private Instant expiresAt;

  protected DemoSessionEntity() {}

  public static DemoSessionEntity create(String title, Long seed, String payloadJson, UUID ownerId) {
    DemoSessionEntity e = new DemoSessionEntity();
    e.id = UUID.randomUUID();
    e.title = title == null || title.isBlank() ? "session" : title;
    e.seed = seed;
    e.payload = payloadJson;
    e.ownerId = ownerId;
    e.createdAt = Instant.now();
    return e;
  }

  public UUID getId() {
    return id;
  }

  public String getTitle() {
    return title;
  }

  public Long getSeed() {
    return seed;
  }

  public String getPayload() {
    return payload;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
