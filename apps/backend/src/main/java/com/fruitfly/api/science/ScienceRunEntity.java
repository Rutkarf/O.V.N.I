package com.fruitfly.api.science;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "science_runs")
public class ScienceRunEntity {

  @Id private UUID id;

  @Column(name = "run_id", nullable = false, unique = true, length = 64)
  private String runId;

  @Column(name = "owner_id")
  private UUID ownerId;

  @Column(name = "motif_id")
  private String motifId;

  @Column(name = "circuit_id")
  private String circuitId;

  private String action;

  private Long seed;

  @Column(name = "dataset_hash")
  private String datasetHash;

  @Column(name = "adapters_hash")
  private String adaptersHash;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private String payload;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  protected ScienceRunEntity() {}

  public static ScienceRunEntity fromWorkerPayload(String json, UUID ownerId) {
    ScienceRunEntity e = new ScienceRunEntity();
    e.id = UUID.randomUUID();
    e.ownerId = ownerId;
    e.payload = json;
    e.createdAt = Instant.now();
    return e;
  }

  public void setRunId(String runId) {
    this.runId = runId;
  }

  public void setMotifId(String motifId) {
    this.motifId = motifId;
  }

  public void setCircuitId(String circuitId) {
    this.circuitId = circuitId;
  }

  public void setAction(String action) {
    this.action = action;
  }

  public void setSeed(Long seed) {
    this.seed = seed;
  }

  public void setDatasetHash(String datasetHash) {
    this.datasetHash = datasetHash;
  }

  public void setAdaptersHash(String adaptersHash) {
    this.adaptersHash = adaptersHash;
  }

  public UUID getId() {
    return id;
  }

  public String getRunId() {
    return runId;
  }

  public String getPayload() {
    return payload;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public String getMotifId() {
    return motifId;
  }

  public String getAction() {
    return action;
  }
}
