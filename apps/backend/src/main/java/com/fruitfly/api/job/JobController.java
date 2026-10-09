package com.fruitfly.api.job;

import com.fruitfly.api.job.JobDtos.CreateJobRequest;
import com.fruitfly.api.job.JobDtos.JobResponse;
import com.fruitfly.api.security.SecurityUtils;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {

  private final JobService jobService;

  public JobController(JobService jobService) {
    this.jobService = jobService;
  }

  @GetMapping
  public List<JobResponse> list() {
    return jobService.listMine(SecurityUtils.requirePrincipal());
  }

  @GetMapping("/{id}")
  public JobResponse get(@PathVariable UUID id) {
    return jobService.getMine(SecurityUtils.requirePrincipal(), id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.ACCEPTED)
  public JobResponse enqueue(@Valid @RequestBody CreateJobRequest request) {
    return jobService.enqueue(SecurityUtils.requirePrincipal(), request);
  }
}
