package com.fruitfly.api.sim;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/sim")
public class SimController {

  private final SimWorkerClient worker;

  public SimController(SimWorkerClient worker) {
    this.worker = worker;
  }

  @GetMapping("/state")
  public Map<String, Object> state() {
    return call(worker::state);
  }

  @PostMapping("/tick")
  public Map<String, Object> tick(@RequestBody(required = false) Map<String, Object> body) {
    return call(() -> worker.tick(body));
  }

  @PostMapping("/reset")
  public Map<String, Object> reset(@RequestBody(required = false) Map<String, Object> body) {
    return call(() -> worker.reset(body));
  }

  @PostMapping("/mode")
  public Map<String, Object> mode(@RequestBody Map<String, Object> body) {
    return call(() -> worker.mode(body));
  }

  private Map<String, Object> call(WorkerCall call) {
    try {
      return call.run();
    } catch (WorkerUnavailableException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ex.getMessage(), ex);
    }
  }

  @FunctionalInterface
  private interface WorkerCall {
    Map<String, Object> run();
  }
}
