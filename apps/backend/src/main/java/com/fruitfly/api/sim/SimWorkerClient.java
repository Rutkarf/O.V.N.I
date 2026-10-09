package com.fruitfly.api.sim;

import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.json.JsonMapper;

@Component
public class SimWorkerClient {

  private final RestClient restClient;
  private final JsonMapper jsonMapper;

  public SimWorkerClient(RestClient workerRestClient, JsonMapper jsonMapper) {
    this.restClient = workerRestClient;
    this.jsonMapper = jsonMapper;
  }

  public Map<String, Object> state() {
    return getMap("/api/state");
  }

  public Map<String, Object> tick(Map<String, Object> body) {
    return postMap("/api/tick", body);
  }

  public Map<String, Object> reset(Map<String, Object> body) {
    return postMap("/api/reset", body);
  }

  public Map<String, Object> mode(Map<String, Object> body) {
    return postMap("/api/mode", body);
  }

  public Map<String, Object> health() {
    return getMap("/health");
  }

  public Map<String, Object> scienceGet(String path) {
    return getMap(path);
  }

  public List<?> scienceGetList(String path) {
    try {
      return restClient.get().uri(path).retrieve().body(List.class);
    } catch (RestClientResponseException ex) {
      throw new WorkerUnavailableException(
          "Worker GET " + path + " → " + ex.getStatusCode().value(), ex);
    } catch (Exception ex) {
      throw new WorkerUnavailableException("Worker unreachable on GET " + path, ex);
    }
  }

  public String scienceGetText(String path) {
    try {
      return restClient.get().uri(path).retrieve().body(String.class);
    } catch (RestClientResponseException ex) {
      throw new WorkerUnavailableException(
          "Worker GET " + path + " → " + ex.getStatusCode().value(), ex);
    } catch (Exception ex) {
      throw new WorkerUnavailableException("Worker unreachable on GET " + path, ex);
    }
  }

  public Map<String, Object> sciencePost(String path, Map<String, Object> body) {
    return postMap(path, body);
  }

  private Map<String, Object> getMap(String path) {
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> body = restClient.get().uri(path).retrieve().body(Map.class);
      return body;
    } catch (RestClientResponseException ex) {
      throw new WorkerUnavailableException(
          "Worker GET " + path + " → " + ex.getStatusCode().value(), ex);
    } catch (Exception ex) {
      throw new WorkerUnavailableException("Worker unreachable on GET " + path, ex);
    }
  }

  private Map<String, Object> postMap(String path, Map<String, Object> payload) {
    try {
      String json = jsonMapper.writeValueAsString(payload == null ? Map.of() : payload);
      @SuppressWarnings("unchecked")
      Map<String, Object> body =
          restClient
              .post()
              .uri(path)
              .contentType(MediaType.APPLICATION_JSON)
              .body(json)
              .retrieve()
              .body(Map.class);
      return body;
    } catch (RestClientResponseException ex) {
      throw new WorkerUnavailableException(
          "Worker POST " + path + " → " + ex.getStatusCode().value(), ex);
    } catch (Exception ex) {
      throw new WorkerUnavailableException("Worker unreachable on POST " + path, ex);
    }
  }
}
