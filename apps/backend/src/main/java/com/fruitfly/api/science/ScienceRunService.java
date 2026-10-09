package com.fruitfly.api.science;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class ScienceRunService {

  private final ScienceRunRepository repository;
  private final ObjectMapper mapper;

  public ScienceRunService(ScienceRunRepository repository, ObjectMapper mapper) {
    this.repository = repository;
    this.mapper = mapper;
  }

  @Transactional
  public void persistIfPresent(Map<String, Object> workerPayload, UUID ownerId) {
    if (workerPayload == null || !workerPayload.containsKey("run_card")) {
      return;
    }
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> card = (Map<String, Object>) workerPayload.get("run_card");
      String runId = String.valueOf(card.get("run_id"));
      if (repository.findByRunId(runId).isPresent()) {
        return;
      }
      ScienceRunEntity e = ScienceRunEntity.fromWorkerPayload(mapper.writeValueAsString(workerPayload), ownerId);
      e.setRunId(runId);
      e.setMotifId(card.get("motif_id") == null ? null : String.valueOf(card.get("motif_id")));
      e.setCircuitId(card.get("circuit_id") == null ? null : String.valueOf(card.get("circuit_id")));
      e.setAction(card.get("action") == null ? null : String.valueOf(card.get("action")));
      if (card.get("seed") instanceof Number n) {
        e.setSeed(n.longValue());
      }
      e.setDatasetHash(card.get("dataset_hash") == null ? null : String.valueOf(card.get("dataset_hash")));
      e.setAdaptersHash(card.get("adapters_hash") == null ? null : String.valueOf(card.get("adapters_hash")));
      repository.save(e);
    } catch (Exception ignored) {
      // ne casse pas le chemin science si la persistance échoue
    }
  }

  public List<ScienceRunEntity> recent() {
    return repository.findTop100ByOrderByCreatedAtDesc();
  }
}
