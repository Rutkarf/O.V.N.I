package com.fruitfly.api.job;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class JobDtos {

  private JobDtos() {}

  public record CreateJobRequest(
      @NotNull UUID organismId,
      String mode,
      @Min(1) @Max(50) Integer ticks,
      Long seed) {}

  public record JobResponse(
      UUID id,
      UUID organismId,
      String type,
      String status,
      String mode,
      int ticks,
      Long seed,
      int attemptCount,
      String result,
      String errorMessage,
      Instant createdAt,
      Instant startedAt,
      Instant finishedAt) {

    public static JobResponse from(SimJobEntity job) {
      return new JobResponse(
          job.getId(),
          job.getOrganismId(),
          job.getType().name(),
          job.getStatus().name(),
          job.getMode(),
          job.getTicks(),
          job.getSeed(),
          job.getAttemptCount(),
          job.getResult(),
          job.getErrorMessage(),
          job.getCreatedAt(),
          job.getStartedAt(),
          job.getFinishedAt());
    }
  }
}
