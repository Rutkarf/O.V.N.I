package com.fruitfly.api.job;

import com.fruitfly.api.job.JobDtos.CreateJobRequest;
import com.fruitfly.api.job.JobDtos.JobResponse;
import com.fruitfly.api.organism.OrganismService;
import com.fruitfly.api.security.UserPrincipal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class JobService {

  private final SimJobRepository jobs;
  private final OrganismService organisms;

  public JobService(SimJobRepository jobs, OrganismService organisms) {
    this.jobs = jobs;
    this.organisms = organisms;
  }

  @Transactional
  public JobResponse enqueue(UserPrincipal principal, CreateJobRequest request) {
    organisms.requireOwned(principal.getId(), request.organismId());
    String mode =
        request.mode() == null || request.mode().isBlank() ? "rules" : request.mode().trim();
    if (!mode.equals("rules") && !mode.equals("fruitfly")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "mode must be rules|fruitfly");
    }
    int ticks = request.ticks() == null ? 8 : request.ticks();
    SimJobEntity job =
        SimJobEntity.create(
            principal.getId(), request.organismId(), mode, ticks, request.seed());
    return JobResponse.from(jobs.save(job));
  }

  @Transactional(readOnly = true)
  public List<JobResponse> listMine(UserPrincipal principal) {
    return jobs.findByOwnerIdOrderByCreatedAtDesc(principal.getId()).stream()
        .map(JobResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public JobResponse getMine(UserPrincipal principal, UUID id) {
    return JobResponse.from(
        jobs.findByIdAndOwnerId(id, principal.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "job not found")));
  }
}
