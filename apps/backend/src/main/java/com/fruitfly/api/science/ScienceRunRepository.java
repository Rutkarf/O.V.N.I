package com.fruitfly.api.science;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScienceRunRepository extends JpaRepository<ScienceRunEntity, UUID> {
  Optional<ScienceRunEntity> findByRunId(String runId);

  List<ScienceRunEntity> findTop100ByOrderByCreatedAtDesc();
}
