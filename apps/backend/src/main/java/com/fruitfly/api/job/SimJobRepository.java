package com.fruitfly.api.job;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SimJobRepository extends JpaRepository<SimJobEntity, UUID> {

  List<SimJobEntity> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

  Optional<SimJobEntity> findByIdAndOwnerId(UUID id, UUID ownerId);

  @Query(
      value =
          """
          SELECT * FROM sim_jobs
          WHERE status = 'PENDING'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
          """,
      nativeQuery = true)
  List<SimJobEntity> lockNextPending();
}
