package com.fruitfly.api.sim;

public class WorkerUnavailableException extends RuntimeException {

  public WorkerUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }
}
