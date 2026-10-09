package com.fruitfly.api.organism;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class OrganismDtos {

  private OrganismDtos() {}

  public record CreateOrganismRequest(
      @NotBlank @Size(max = 120) String name, @Size(max = 120) String species) {}

  public record OrganismResponse(
      UUID id,
      String name,
      String species,
      String status,
      Instant createdAt,
      Instant updatedAt) {

    public static OrganismResponse from(OrganismEntity entity) {
      return new OrganismResponse(
          entity.getId(),
          entity.getName(),
          entity.getSpecies(),
          entity.getStatus(),
          entity.getCreatedAt(),
          entity.getUpdatedAt());
    }
  }
}
