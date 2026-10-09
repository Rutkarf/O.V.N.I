package com.fruitfly.api.organism;

import com.fruitfly.api.organism.OrganismDtos.CreateOrganismRequest;
import com.fruitfly.api.organism.OrganismDtos.OrganismResponse;
import com.fruitfly.api.security.SecurityUtils;
import com.fruitfly.api.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/v1/organisms")
public class OrganismController {

  private final OrganismService organismService;

  public OrganismController(OrganismService organismService) {
    this.organismService = organismService;
  }

  @GetMapping
  public List<OrganismResponse> list() {
    UserPrincipal principal = SecurityUtils.requirePrincipal();
    return organismService.listMine(principal);
  }

  @GetMapping("/{id}")
  public OrganismResponse get(@PathVariable UUID id) {
    return organismService.getMine(SecurityUtils.requirePrincipal(), id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public OrganismResponse create(@Valid @RequestBody CreateOrganismRequest request) {
    return organismService.create(SecurityUtils.requirePrincipal(), request);
  }

  @GetMapping("/meta/roadmap")
  public Map<String, Object> roadmap() {
    return Map.of(
        "product", "fruitfly",
        "stages",
            List.of(
                "auth + persistence",
                "clone DNA profile",
                "build neural graph",
                "enqueue simulation jobs",
                "commercialize access"),
        "current", "auth + postgres + jobs");
  }
}
