package com.fruitfly.api.job;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "sim_jobs")
public class SimJobEntity {

  @Id
  private UUID id;

  @Column(name = "owner_id", nullable = false)
  private UUID ownerId;

  @Column(name = "organism_id")
  private UUID organismId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private JobType type = JobType.SIM_RUN;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private JobStatus status = JobStatus.PENDING;

  @Column(nullable = false)
  private String mode = "rules";

  @Column(nullable = false)
  private int ticks = 8;

  private Long seed;

  @Column(name = "attempt_count", nullable = false)
  private int attemptCount = 0;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private String payload;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private String result;

  @Column(name = "error_message")
  private String errorMessage;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "started_at")
  private Instant startedAt;

  @Column(name = "finished_at")
  private Instant finishedAt;

  protected SimJobEntity() {}

  public static SimJobEntity create(
      UUID ownerId, UUID organismId, String mode, int ticks, Long seed) {
    SimJobEntity job = new SimJobEntity();
    job.id = UUID.randomUUID();
    job.ownerId = ownerId;
    job.organismId = organismId;
    job.type = JobType.SIM_RUN;
    job.status = JobStatus.PENDING;
    job.mode = mode == null || mode.isBlank() ? "rules" : mode;
    job.ticks = Math.max(1, Math.min(ticks, 50));
    job.seed = seed;
    job.createdAt = Instant.now();
    return job;
  }

  public UUID getId() {
    return id;
  }

  public UUID getOwnerId() {
    return ownerId;
  }

  public UUID getOrganismId() {
    return organismId;
  }

  public JobType getType() {
    return type;
  }

  public JobStatus getStatus() {
    return status;
  }

  public String getMode() {
    return mode;
  }

  public int getTicks() {
    return ticks;
  }

  public Long getSeed() {
    return seed;
  }

  public int getAttemptCount() {
    return attemptCount;
  }

  public String getPayload() {
    return payload;
  }

  public void setPayload(String payload) {
    this.payload = payload;
  }

  public void setType(JobType type) {
    this.type = type;
  }

  public String getResult() {
    return result;
  }

  public String getErrorMessage() {
    return errorMessage;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getStartedAt() {
    return startedAt;
  }

  public Instant getFinishedAt() {
    return finishedAt;
  }

  public void markRunning() {
    this.status = JobStatus.RUNNING;
    this.startedAt = Instant.now();
    this.attemptCount += 1;
    this.errorMessage = null;
  }

  public void markSucceeded(String resultJson) {
    this.status = JobStatus.SUCCEEDED;
    this.result = resultJson;
    this.finishedAt = Instant.now();
  }

  public void markFailed(String message) {
    this.status = JobStatus.FAILED;
    this.errorMessage = message;
    this.finishedAt = Instant.now();
  }

  public void requeue() {
    this.status = JobStatus.PENDING;
    this.startedAt = null;
  }
}
