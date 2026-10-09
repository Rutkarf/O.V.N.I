package com.fruitfly.api.organism;

import com.fruitfly.api.organism.OrganismDtos.CreateOrganismRequest;
import com.fruitfly.api.organism.OrganismDtos.OrganismResponse;
import com.fruitfly.api.security.UserPrincipal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrganismService {

  private final OrganismRepository organisms;

  public OrganismService(OrganismRepository organisms) {
    this.organisms = organisms;
  }

  @Transactional(readOnly = true)
  public List<OrganismResponse> listMine(UserPrincipal principal) {
    return organisms.findByOwnerIdOrderByCreatedAtDesc(principal.getId()).stream()
        .map(OrganismResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public OrganismResponse getMine(UserPrincipal principal, UUID id) {
    return OrganismResponse.from(requireOwned(principal.getId(), id));
  }

  @Transactional
  public OrganismResponse create(UserPrincipal principal, CreateOrganismRequest request) {
    OrganismEntity entity =
        OrganismEntity.create(principal.getId(), request.name().trim(), request.species());
    return OrganismResponse.from(organisms.save(entity));
  }

  public OrganismEntity requireOwned(UUID ownerId, UUID organismId) {
    return organisms
        .findByIdAndOwnerId(organismId, ownerId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "organism not found"));
  }
}
