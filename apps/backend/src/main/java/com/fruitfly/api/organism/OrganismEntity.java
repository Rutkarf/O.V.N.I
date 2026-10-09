package com.fruitfly.api.organism;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "organisms")
public class OrganismEntity {

  @Id
  private UUID id;

  @Column(name = "owner_id", nullable = false)
  private UUID ownerId;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String species;

  @Column(nullable = false)
  private String status = "draft";

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "dna_profile", columnDefinition = "jsonb")
  private String dnaProfile;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "neural_graph", columnDefinition = "jsonb")
  private String neuralGraph;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  protected OrganismEntity() {}

  public static OrganismEntity create(UUID ownerId, String name, String species) {
    OrganismEntity entity = new OrganismEntity();
    entity.id = UUID.randomUUID();
    entity.ownerId = ownerId;
    entity.name = name;
    entity.species =
        species == null || species.isBlank() ? "Drosophila melanogaster" : species.trim();
    entity.status = "draft";
    entity.createdAt = Instant.now();
    entity.updatedAt = entity.createdAt;
    return entity;
  }

  public UUID getId() {
    return id;
  }

  public UUID getOwnerId() {
    return ownerId;
  }

  public String getName() {
    return name;
  }

  public String getSpecies() {
    return species;
  }

  public String getStatus() {
    return status;
  }

  public String getDnaProfile() {
    return dnaProfile;
  }

  public String getNeuralGraph() {
    return neuralGraph;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void touch() {
    this.updatedAt = Instant.now();
  }
}
