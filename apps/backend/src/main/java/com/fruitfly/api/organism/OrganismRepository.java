package com.fruitfly.api.organism;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganismRepository extends JpaRepository<OrganismEntity, UUID> {
  List<OrganismEntity> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

  Optional<OrganismEntity> findByIdAndOwnerId(UUID id, UUID ownerId);
}
