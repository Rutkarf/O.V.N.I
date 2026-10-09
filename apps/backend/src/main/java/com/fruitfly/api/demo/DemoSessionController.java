package com.fruitfly.api.demo;

import com.fruitfly.api.security.UserPrincipal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/sessions")
public class DemoSessionController {

  private final DemoSessionRepository repository;
  private final ObjectMapper mapper;

  public DemoSessionController(DemoSessionRepository repository, ObjectMapper mapper) {
    this.repository = repository;
    this.mapper = mapper;
  }

  @PostMapping
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    try {
      UUID owner = currentOwnerOrNull();
      String title = String.valueOf(body.getOrDefault("title", "session"));
      Long seed = null;
      Object seedObj = body.get("seed");
      if (seedObj instanceof Number n) {
        seed = n.longValue();
      }
      Object payload = body.getOrDefault("payload", Map.of());
      String payloadJson = mapper.writeValueAsString(payload);
      DemoSessionEntity saved = repository.save(DemoSessionEntity.create(title, seed, payloadJson, owner));
      return toMap(saved);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
    }
  }

  @GetMapping("/{id}")
  public Map<String, Object> get(@PathVariable UUID id) {
    DemoSessionEntity row =
        repository
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "session introuvable"));
    return toMap(row);
  }

  private Map<String, Object> toMap(DemoSessionEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId().toString());
    m.put("title", e.getTitle());
    m.put("seed", e.getSeed());
    m.put("created_at", e.getCreatedAt().toString());
    try {
      m.put("payload", mapper.readValue(e.getPayload(), Map.class));
    } catch (Exception ex) {
      m.put("payload", e.getPayload());
    }
    return m;
  }

  private UUID currentOwnerOrNull() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof UserPrincipal p) {
      return p.getId();
    }
    return null;
  }
}
