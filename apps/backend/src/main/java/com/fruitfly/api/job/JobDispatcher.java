package com.fruitfly.api.job;

import tools.jackson.databind.ObjectMapper;
import com.fruitfly.api.config.AppProperties;
import com.fruitfly.api.sim.SimWorkerClient;
import com.fruitfly.api.sim.WorkerUnavailableException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class JobDispatcher {

  private static final Logger log = LoggerFactory.getLogger(JobDispatcher.class);

  private final SimJobRepository jobs;
  private final SimWorkerClient worker;
  private final ObjectMapper objectMapper;
  private final AppProperties properties;

  public JobDispatcher(
      SimJobRepository jobs,
      SimWorkerClient worker,
      ObjectMapper objectMapper,
      AppProperties properties) {
    this.jobs = jobs;
    this.worker = worker;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  @Scheduled(fixedDelayString = "${fruitfly.jobs.poll-ms:2000}")
  @Transactional
  public void poll() {
    List<SimJobEntity> pending = jobs.lockNextPending();
    if (pending.isEmpty()) {
      return;
    }
    SimJobEntity job = pending.getFirst();
    job.markRunning();
    jobs.save(job);

    try {
      if (job.getType() == JobType.SCIENCE_DOSE || job.getType() == JobType.SCIENCE_LOT) {
        runScienceJob(job);
        return;
      }

      Map<String, Object> resetBody = new HashMap<>();
      resetBody.put("mode", job.getMode());
      if (job.getSeed() != null) {
        resetBody.put("seed", job.getSeed());
      }
      worker.reset(resetBody);

      List<Map<String, Object>> ticks = new ArrayList<>();
      Map<String, Object> last = Map.of();
      for (int i = 0; i < job.getTicks(); i++) {
        last = worker.tick(Map.of("mode", job.getMode()));
        ticks.add(last);
        Object alive = last.get("alive");
        if (alive instanceof Boolean b && !b) {
          break;
        }
      }

      Map<String, Object> result = new HashMap<>();
      result.put("organismId", job.getOrganismId() == null ? null : job.getOrganismId().toString());
      result.put("ticksRequested", job.getTicks());
      result.put("ticksExecuted", ticks.size());
      result.put("finalState", last);
      result.put("history", ticks);

      job.markSucceeded(objectMapper.writeValueAsString(result));
      jobs.save(job);
      log.info("Job {} succeeded ({} ticks)", job.getId(), ticks.size());
    } catch (WorkerUnavailableException ex) {
      handleFailure(job, ex.getMessage(), true);
    } catch (Exception ex) {
      handleFailure(job, ex.getMessage(), false);
    }
  }

  private void runScienceJob(SimJobEntity job) throws Exception {
    @SuppressWarnings("unchecked")
    Map<String, Object> payload =
        job.getPayload() == null || job.getPayload().isBlank()
            ? Map.of()
            : objectMapper.readValue(job.getPayload(), Map.class);
    String path =
        job.getType() == JobType.SCIENCE_DOSE ? "/api/science/jobs/dose" : "/api/science/jobs/lot";
    Map<String, Object> submitted = worker.sciencePost(path, payload);
    Object jobId = submitted.get("job_id");
    Map<String, Object> status = Map.of("soumission", submitted);
    if (jobId != null) {
      for (int i = 0; i < 120; i++) {
        Thread.sleep(250);
        status = worker.scienceGet("/api/science/jobs/" + jobId);
        Object st = status.get("statut");
        if ("termine".equals(st) || "echec".equals(st)) {
          break;
        }
      }
    }
    job.markSucceeded(objectMapper.writeValueAsString(status));
    jobs.save(job);
    log.info("Job science {} terminé ({})", job.getId(), job.getType());
  }

  private void handleFailure(SimJobEntity job, String message, boolean retriable) {
    int max = properties.getJobs().getMaxAttempts();
    if (retriable && job.getAttemptCount() < max) {
      job.requeue();
      jobs.save(job);
      log.warn("Job {} requeued after worker error: {}", job.getId(), message);
      return;
    }
    job.markFailed(message == null ? "unknown error" : message);
    jobs.save(job);
    log.error("Job {} failed: {}", job.getId(), message);
  }
}
