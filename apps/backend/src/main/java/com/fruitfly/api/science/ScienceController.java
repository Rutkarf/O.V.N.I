package com.fruitfly.api.science;

import com.fruitfly.api.security.UserPrincipal;
import com.fruitfly.api.sim.SimWorkerClient;
import com.fruitfly.api.sim.WorkerUnavailableException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/science")
public class ScienceController {

  private final SimWorkerClient worker;
  private final ScienceRunService runService;

  public ScienceController(SimWorkerClient worker, ScienceRunService runService) {
    this.worker = worker;
    this.runService = runService;
  }

  @GetMapping("/atlas")
  public Map<String, Object> atlas(
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer taille,
      @RequestParam(required = false) String roi,
      @RequestParam(required = false) String classe) {
    StringBuilder q = new StringBuilder("/api/science/atlas?");
    if (page != null) q.append("page=").append(page).append("&");
    if (taille != null) q.append("taille=").append(taille).append("&");
    if (roi != null) q.append("roi=").append(roi).append("&");
    if (classe != null) q.append("classe=").append(classe).append("&");
    return get(q.toString());
  }

  @GetMapping("/motifs")
  public Map<String, Object> motifs() {
    return get("/api/science/motifs");
  }

  @GetMapping("/plateformes")
  public Map<String, Object> plateformes() {
    return get("/api/science/plateformes");
  }

  @GetMapping("/atlas/status")
  public Map<String, Object> atlasStatus() {
    return get("/api/science/atlas/status");
  }

  @GetMapping("/zenodo")
  public Map<String, Object> zenodo() {
    return get("/api/science/zenodo");
  }

  @GetMapping("/organisms")
  public Map<String, Object> organisms() {
    return get("/api/science/organisms");
  }

  @GetMapping("/passerelles/maelstrom")
  public Map<String, Object> maelstrom(@RequestParam(required = false) String runId) {
    String q = runId == null || runId.isBlank() ? "" : "?run_id=" + runId;
    return get("/api/science/passerelles/maelstrom" + q);
  }

  @GetMapping("/passerelles/argon")
  public Map<String, Object> argon(@RequestParam(required = false) String runId) {
    String q = runId == null || runId.isBlank() ? "" : "?run_id=" + runId;
    return get("/api/science/passerelles/argon" + q);
  }

  @PostMapping("/replay")
  public Map<String, Object> replay(@RequestBody Map<String, Object> body) {
    Map<String, Object> result = post("/api/science/replay", body);
    runService.persistIfPresent(result, currentOwnerOrNull());
    return result;
  }

  @PostMapping("/validation/imagerie")
  public Map<String, Object> validationImagerie(@RequestBody Map<String, Object> body) {
    return post("/api/science/validation/imagerie", body);
  }

  @GetMapping("/passerelles/pont-imagerie")
  public Map<String, Object> pontImagerie(@RequestParam(required = false) String runId) {
    String q = runId == null || runId.isBlank() ? "" : "?run_id=" + runId;
    return get("/api/science/passerelles/pont-imagerie" + q);
  }

  @GetMapping("/passerelles/clem")
  public Map<String, Object> clem(@RequestParam(required = false) String runId) {
    String q = runId == null || runId.isBlank() ? "" : "?run_id=" + runId;
    return get("/api/science/passerelles/clem" + q);
  }

  @GetMapping("/passerelles/pipeline")
  public Map<String, Object> pipeline(@RequestParam(required = false) String runId) {
    String q = runId == null || runId.isBlank() ? "" : "?run_id=" + runId;
    return get("/api/science/passerelles/pipeline" + q);
  }

  @PostMapping("/passerelles/carte-genetique")
  public Map<String, Object> carteGenetique(@RequestBody Map<String, Object> body) {
    return post("/api/science/passerelles/carte-genetique", body);
  }

  @PostMapping("/passerelles/journal-colonie")
  public Map<String, Object> journalColonie(@RequestBody Map<String, Object> body) {
    return post("/api/science/passerelles/journal-colonie", body);
  }

  @PostMapping("/passerelles/protocole")
  public Map<String, Object> protocole(@RequestBody Map<String, Object> body) {
    return post("/api/science/passerelles/protocole", body);
  }

  @GetMapping("/genetics/catalog")
  public Map<String, Object> geneticsCatalog() {
    return get("/api/science/genetics/catalog");
  }

  @PostMapping("/genetics/cross")
  public Map<String, Object> geneticsCross(@RequestBody Map<String, Object> body) {
    return post("/api/science/genetics/cross", body);
  }

  @PostMapping("/genetics/edit")
  public Map<String, Object> geneticsEdit(@RequestBody Map<String, Object> body) {
    return post("/api/science/genetics/edit", body);
  }

  @PostMapping("/genetics/kepler")
  public Map<String, Object> geneticsKepler(@RequestBody Map<String, Object> body) {
    return post("/api/science/genetics/kepler", body);
  }

  @PostMapping("/genetics/phenotype")
  public Map<String, Object> geneticsPhenotype(@RequestBody Map<String, Object> body) {
    return post("/api/science/genetics/phenotype", body);
  }

  @PostMapping("/genetics/argon-ready")
  public Map<String, Object> geneticsArgonReady(@RequestBody Map<String, Object> body) {
    return post("/api/science/genetics/argon-ready", body);
  }

  @PostMapping("/genetics/drivers")
  public Map<String, Object> geneticsDrivers(@RequestBody Map<String, Object> body) {
    return post("/api/science/genetics/drivers", body);
  }

  @PostMapping("/argon/doi")
  public Map<String, Object> argonDoi(@RequestBody Map<String, Object> body) {
    return post("/api/science/argon/doi", body);
  }

  @PostMapping("/rocrate")
  public Map<String, Object> rocrate(@RequestBody Map<String, Object> body) {
    return post("/api/science/rocrate", body);
  }

  @PostMapping("/gpu-sweep")
  public Map<String, Object> gpuSweep(@RequestBody Map<String, Object> body) {
    return post("/api/science/gpu-sweep", body);
  }

  @PostMapping("/opto/curve")
  public Map<String, Object> optoCurve(@RequestBody Map<String, Object> body) {
    return post("/api/science/opto/curve", body);
  }

  @GetMapping("/picsl/sample")
  public Map<String, Object> picslSample() {
    return get("/api/science/picsl/sample");
  }

  @GetMapping("/bridges/fiji")
  public Map<String, Object> bridgeFiji(@RequestParam(required = false) String runId) {
    String q = runId == null || runId.isBlank() ? "" : "?run_id=" + runId;
    return get("/api/science/bridges/fiji" + q);
  }

  @GetMapping("/bridges/napari")
  public Map<String, Object> bridgeNapari(@RequestParam(required = false) String runId) {
    String q = runId == null || runId.isBlank() ? "" : "?run_id=" + runId;
    return get("/api/science/bridges/napari" + q);
  }

  @GetMapping("/openapi.json")
  public Map<String, Object> openapi() {
    return get("/api/science/openapi.json");
  }

  @GetMapping("/echelles")
  public Map<String, Object> echelles() {
    return get("/api/science/echelles");
  }

  @PostMapping("/echelles/resolve")
  public Map<String, Object> echellesResolve(@RequestBody Map<String, Object> body) {
    return post("/api/science/echelles/resolve", body);
  }

  @GetMapping("/ovni/lifecycle")
  public Map<String, Object> ovniLifecycle() {
    return get("/api/science/ovni/lifecycle");
  }

  @PostMapping("/ovni/birth")
  public Map<String, Object> ovniBirth(@RequestBody Map<String, Object> body) {
    return post("/api/science/ovni/birth", body);
  }

  @PostMapping("/ovni/advance")
  public Map<String, Object> ovniAdvance(@RequestBody Map<String, Object> body) {
    return post("/api/science/ovni/advance", body);
  }

  @GetMapping("/voix/aide")
  public Map<String, Object> voixAide() {
    return get("/api/science/voix/aide");
  }

  @PostMapping("/voix/fiche")
  public Map<String, Object> voixFiche(@RequestBody(required = false) Map<String, Object> body) {
    return post("/api/science/voix/fiche", body == null ? Map.of() : body);
  }

  @PostMapping("/voix/lexique")
  public Map<String, Object> voixLexique(@RequestBody(required = false) Map<String, Object> body) {
    return post("/api/science/voix/lexique", body == null ? Map.of() : body);
  }

  @PostMapping("/voix/gabarit")
  public Map<String, Object> voixGabarit(@RequestBody(required = false) Map<String, Object> body) {
    return post("/api/science/voix/gabarit", body == null ? Map.of() : body);
  }

  @PostMapping("/voix/dialoguer")
  public Map<String, Object> voixDialoguer(@RequestBody Map<String, Object> body) {
    return post("/api/science/voix/dialoguer", body);
  }

  @PostMapping("/voix/verify")
  public Map<String, Object> voixVerify(@RequestBody Map<String, Object> body) {
    return post("/api/science/voix/verify", body);
  }

  @PostMapping("/voix/stimulate")
  public Map<String, Object> voixStimulate(@RequestBody Map<String, Object> body) {
    Map<String, Object> result = post("/api/science/voix/stimulate", body);
    Object run = result.get("run");
    if (run instanceof Map<?, ?> runMap) {
      @SuppressWarnings("unchecked")
      Map<String, Object> runPayload = (Map<String, Object>) runMap;
      runService.persistIfPresent(runPayload, currentOwnerOrNull());
    }
    return result;
  }

  @PostMapping("/voix/replay")
  public Map<String, Object> voixReplay(@RequestBody Map<String, Object> body) {
    return post("/api/science/voix/replay", body);
  }

  @GetMapping("/voix/journal")
  public Map<String, Object> voixJournal(@RequestParam(defaultValue = "30") int limit) {
    return get("/api/science/voix/journal?limit=" + limit);
  }

  @GetMapping("/voix/journal.md")
  public ResponseEntity<String> voixJournalMd(@RequestParam(defaultValue = "50") int limit) {
    String md = getText("/api/science/voix/journal.md?limit=" + limit);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"voix-journal.md\"")
        .contentType(MediaType.parseMediaType("text/markdown"))
        .body(md);
  }

  @PostMapping("/motif")
  public Map<String, Object> motif(@RequestBody Map<String, Object> body) {
    return post("/api/science/motif", body);
  }

  @GetMapping("/concordance")
  public Map<String, Object> concordance() {
    return get("/api/science/concordance");
  }

  @GetMapping("/flywire")
  public Map<String, Object> flywire() {
    return get("/api/science/flywire");
  }

  @PostMapping("/stimulate")
  public Map<String, Object> stimulate(@RequestBody Map<String, Object> body) {
    Map<String, Object> result = post("/api/science/stimulate", body);
    runService.persistIfPresent(result, currentOwnerOrNull());
    return result;
  }

  @GetMapping("/runs/db")
  public List<Map<String, Object>> runsDb() {
    return runService.recent().stream()
        .map(
            e -> {
              Map<String, Object> m = new LinkedHashMap<>();
              m.put("run_id", e.getRunId());
              m.put("motif_id", e.getMotifId());
              m.put("action", e.getAction());
              m.put("created_at", e.getCreatedAt().toString());
              return m;
            })
        .toList();
  }

  @GetMapping("/runs")
  public List<Map<String, Object>> runs(@RequestParam(defaultValue = "50") int limit) {
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> list =
        (List<Map<String, Object>>) (List<?>) getList("/api/science/runs?limit=" + limit);
    return list;
  }

  @GetMapping("/runs/{id}")
  public Map<String, Object> run(@PathVariable String id) {
    return get("/api/science/runs/" + id);
  }

  @GetMapping("/runs/{id}/spikes.csv")
  public ResponseEntity<String> spikesCsv(@PathVariable String id) {
    String csv = getText("/api/science/runs/" + id + "/spikes.csv");
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"spikes-" + id + ".csv\"")
        .contentType(new MediaType("text", "csv"))
        .body(csv);
  }

  @GetMapping("/runs/{id}/methods.md")
  public ResponseEntity<String> methods(@PathVariable String id) {
    String md = getText("/api/science/runs/" + id + "/methods.md");
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"methodes-" + id + ".md\"")
        .contentType(MediaType.parseMediaType("text/markdown"))
        .body(md);
  }

  @GetMapping("/runs/{id}/figure.svg")
  public ResponseEntity<String> figure(@PathVariable String id) {
    String svg = getText("/api/science/runs/" + id + "/figure.svg");
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"figure-" + id + ".svg\"")
        .contentType(MediaType.parseMediaType("image/svg+xml"))
        .body(svg);
  }

  @PostMapping("/upload/edges")
  public Map<String, Object> upload(@RequestBody Map<String, Object> body) {
    return post("/api/science/upload/edges", body);
  }

  @PostMapping("/circuit/reset")
  public Map<String, Object> resetCircuit() {
    return post("/api/science/circuit/reset", Map.of());
  }

  @GetMapping("/validate")
  public Map<String, Object> validate() {
    return get("/api/science/validate");
  }

  @GetMapping("/adapters")
  public Map<String, Object> adapters() {
    return get("/api/science/adapters");
  }

  @PostMapping("/adapters")
  public Map<String, Object> saveAdapters(@RequestBody Map<String, Object> body) {
    return post("/api/science/adapters", body);
  }

  @PostMapping("/adapters/reset")
  public Map<String, Object> resetAdapters() {
    return post("/api/science/adapters/reset", Map.of());
  }

  @PostMapping("/batch")
  public Map<String, Object> batch(@RequestBody Map<String, Object> body) {
    return post("/api/science/batch", body);
  }

  @PostMapping("/dose-response")
  public Map<String, Object> doseResponse(@RequestBody Map<String, Object> body) {
    return post("/api/science/dose-response", body);
  }

  private UUID currentOwnerOrNull() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof UserPrincipal p) {
      return p.getId();
    }
    return null;
  }

  @PostMapping("/compare")
  public Map<String, Object> compare(@RequestBody Map<String, Object> body) {
    return post("/api/science/compare", body);
  }

  @PostMapping("/jobs/dose")
  public Map<String, Object> jobDose(@RequestBody Map<String, Object> body) {
    return post("/api/science/jobs/dose", body);
  }

  @PostMapping("/jobs/lot")
  public Map<String, Object> jobLot(@RequestBody Map<String, Object> body) {
    return post("/api/science/jobs/lot", body);
  }

  @GetMapping("/jobs/{id}")
  public Map<String, Object> job(@PathVariable String id) {
    return get("/api/science/jobs/" + id);
  }

  private Map<String, Object> get(String path) {
    try {
      return worker.scienceGet(path);
    } catch (WorkerUnavailableException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ex.getMessage(), ex);
    }
  }

  private List<?> getList(String path) {
    try {
      return worker.scienceGetList(path);
    } catch (WorkerUnavailableException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ex.getMessage(), ex);
    }
  }

  private String getText(String path) {
    try {
      return worker.scienceGetText(path);
    } catch (WorkerUnavailableException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ex.getMessage(), ex);
    }
  }

  private Map<String, Object> post(String path, Map<String, Object> body) {
    try {
      return worker.sciencePost(path, body);
    } catch (WorkerUnavailableException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ex.getMessage(), ex);
    }
  }
}
