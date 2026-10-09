import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AtlasNeuron {
  id: string;
  type: string;
  class: string;
  hemisphere: string;
  roi: string;
  sex: string;
  tags?: string[];
}

export interface Atlas {
  circuit_id: string;
  circuit_version: string;
  provenance: { disclaimer?: string; citations?: string[]; type?: string };
  adapters_version: string;
  neuron_count: number;
  edge_count: number;
  neurons: AtlasNeuron[];
  edges: { pre: string; post: string; weight: number; sign: number }[];
  rois: string[];
  classes: string[];
  dataset_hash: string;
  citations: string[];
}

export interface StimulateRequest {
  sugar?: number;
  bitter?: number;
  looming?: number;
  hunger?: number;
  seed?: number;
  duration_ms?: number;
  silence?: string[];
  shuffle_edges?: boolean;
  neuron_rates?: Record<string, number>;
  param_overrides?: Record<string, number>;
  policy_overrides?: Record<string, unknown>;
  circadian?: 'day' | 'night';
  temperature_c?: number;
  fly_cohort?: number;
}

export interface RunResult {
  run_card: {
    run_id: string;
    created_at: string;
    action: string;
    decision_ms: number | null;
    seed: number;
    inputs: Record<string, unknown>;
    circuit_id: string;
    dataset_hash: string;
    provenance: { disclaimer?: string; citations?: string[] };
    params: Record<string, number>;
  };
  spikes: Record<string, number[]>;
  rates_hz: Record<string, number>;
  raster: { neuron: string; spikes_ms: number[] }[];
  action: string;
  decision_ms: number | null;
}

export interface RunSummary {
  run_id: string;
  created_at: string;
  action: string;
  seed: number;
  inputs: Record<string, unknown>;
  circuit_id: string;
}

export interface AdaptersDoc {
  version: string;
  dataset_claim?: string;
  notes?: string;
  inputs: Record<string, unknown>;
  policies: Record<string, unknown>;
  readouts: Record<string, unknown>;
  priority: string[];
  parameters: Record<string, number>;
  _meta?: {
    active_path: string;
    customized: boolean;
    hash: string;
  };
}

export interface DoseCurveRow {
  channel: string;
  level: number;
  repeats: number;
  action_counts: Record<string, number>;
  p_escape: number;
  p_eat: number;
  p_idle: number;
  run_ids: string[];
}

@Injectable({ providedIn: 'root' })
export class ScienceService {
  private readonly http = inject(HttpClient);

  atlas(params?: {
    page?: number;
    taille?: number;
    roi?: string;
    classe?: string;
  }): Observable<Atlas> {
    const q = new URLSearchParams();
    if (params?.page != null) q.set('page', String(params.page));
    if (params?.taille != null) q.set('taille', String(params.taille));
    if (params?.roi) q.set('roi', params.roi);
    if (params?.classe) q.set('classe', params.classe);
    const qs = q.toString();
    return this.http.get<Atlas>('/api/v1/science/atlas' + (qs ? `?${qs}` : ''));
  }

  motifs(): Observable<{ motif_actif: string; motifs: { id: string; nom: string; niveau: string }[] }> {
    return this.http.get<{ motif_actif: string; motifs: { id: string; nom: string; niveau: string }[] }>(
      '/api/v1/science/motifs',
    );
  }

  selectionnerMotif(motifId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/motif', { motif_id: motifId });
  }

  concordance(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/concordance');
  }

  flywire(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/flywire');
  }

  soumettreDoseAsync(body: Record<string, unknown>): Observable<{ job_id: string; statut: string }> {
    return this.http.post<{ job_id: string; statut: string }>('/api/v1/science/jobs/dose', body);
  }

  statutTravail(id: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`/api/v1/science/jobs/${id}`);
  }

  stimulate(body: StimulateRequest): Observable<RunResult> {
    return this.http.post<RunResult>('/api/v1/science/stimulate', body);
  }

  runs(): Observable<RunSummary[]> {
    return this.http.get<RunSummary[]>('/api/v1/science/runs');
  }

  run(id: string): Observable<RunResult> {
    return this.http.get<RunResult>(`/api/v1/science/runs/${id}`);
  }

  validate(): Observable<{ passed: boolean; cases: unknown[] }> {
    return this.http.get<{ passed: boolean; cases: unknown[] }>('/api/v1/science/validate');
  }

  adapters(): Observable<AdaptersDoc> {
    return this.http.get<AdaptersDoc>('/api/v1/science/adapters');
  }

  saveAdapters(doc: AdaptersDoc): Observable<AdaptersDoc> {
    return this.http.post<AdaptersDoc>('/api/v1/science/adapters', doc);
  }

  resetAdapters(): Observable<AdaptersDoc> {
    return this.http.post<AdaptersDoc>('/api/v1/science/adapters/reset', {});
  }

  batch(trials: StimulateRequest[], baseSeed = 0): Observable<{
    n: number;
    action_counts: Record<string, number>;
    trials: unknown[];
  }> {
    return this.http.post<{
      n: number;
      action_counts: Record<string, number>;
      trials: unknown[];
    }>('/api/v1/science/batch', { trials, base_seed: baseSeed });
  }

  doseResponse(body: {
    channel: string;
    levels?: number[];
    repeats?: number;
    sugar?: number;
    bitter?: number;
    looming?: number;
    hunger?: number;
    base_seed?: number;
    shuffle_edges?: boolean;
    silence?: string[];
    param_overrides?: Record<string, number>;
    policy_overrides?: Record<string, unknown>;
  }): Observable<{ channel: string; repeats: number; curve: DoseCurveRow[] }> {
    return this.http.post<{ channel: string; repeats: number; curve: DoseCurveRow[] }>(
      '/api/v1/science/dose-response',
      body,
    );
  }

  compare(runIds: string[]): Observable<{ n: number; runs: unknown[] }> {
    return this.http.post<{ n: number; runs: unknown[] }>('/api/v1/science/compare', {
      run_ids: runIds,
    });
  }

  uploadEdges(
    csv: string,
    opts?: { mode?: 'motif' | 'malecns' | 'flywire'; roi?: string },
  ): Observable<{
    ok: boolean;
    edge_count: number;
    circuit_id?: string;
    mode?: string;
    new_neurons?: string[];
    neuron_count?: number;
    rois?: string[];
  }> {
    return this.http.post<{
      ok: boolean;
      edge_count: number;
      circuit_id?: string;
      mode?: string;
      new_neurons?: string[];
      neuron_count?: number;
      rois?: string[];
    }>('/api/v1/science/upload/edges', {
      csv,
      mode: opts?.mode || 'motif',
      roi: opts?.roi || null,
    });
  }

  methodsText(id: string): Observable<string> {
    return this.http.get(this.methodsUrl(id), { responseType: 'text' });
  }

  resetCircuit(): Observable<{ ok: boolean; circuit_id: string }> {
    return this.http.post<{ ok: boolean; circuit_id: string }>(
      '/api/v1/science/circuit/reset',
      {},
    );
  }

  spikesUrl(id: string): string {
    return `/api/v1/science/runs/${id}/spikes.csv`;
  }

  methodsUrl(id: string): string {
    return `/api/v1/science/runs/${id}/methods.md`;
  }

  figureUrl(id: string): string {
    return `/api/v1/science/runs/${id}/figure.svg`;
  }

  telechargerFigure(id: string): void {
    this.download(this.figureUrl(id), `figure-${id.slice(0, 8)}.svg`);
  }

  plateformes(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/plateformes');
  }

  passerellePont(runId?: string): Observable<Record<string, unknown>> {
    const q = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<Record<string, unknown>>(`/api/v1/science/passerelles/pont-imagerie${q}`);
  }

  passerelleClem(runId?: string): Observable<Record<string, unknown>> {
    const q = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<Record<string, unknown>>(`/api/v1/science/passerelles/clem${q}`);
  }

  passerellePipeline(runId?: string): Observable<Record<string, unknown>> {
    const q = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<Record<string, unknown>>(`/api/v1/science/passerelles/pipeline${q}`);
  }

  passerelleCarteGenetique(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      '/api/v1/science/passerelles/carte-genetique',
      body,
    );
  }

  passerelleJournal(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      '/api/v1/science/passerelles/journal-colonie',
      body,
    );
  }

  passerelleProtocole(outilId: string, runId?: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/passerelles/protocole', {
      outil_id: outilId,
      run_id: runId || null,
    });
  }

  atlasStatus(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/atlas/status');
  }

  replay(runId: string): Observable<RunResult & { replay_match?: boolean; replay_of?: string }> {
    return this.http.post<RunResult & { replay_match?: boolean; replay_of?: string }>(
      '/api/v1/science/replay',
      { run_id: runId },
    );
  }

  validationImagerie(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/validation/imagerie', body);
  }

  passerelleMaelstrom(runId?: string): Observable<Record<string, unknown>> {
    const q = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<Record<string, unknown>>(`/api/v1/science/passerelles/maelstrom${q}`);
  }

  passerelleArgon(runId?: string): Observable<Record<string, unknown>> {
    const q = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<Record<string, unknown>>(`/api/v1/science/passerelles/argon${q}`);
  }

  zenodoMeta(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/zenodo');
  }

  organismsRegistry(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/organisms');
  }

  geneticsCatalog(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/genetics/catalog');
  }

  geneticsCross(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/genetics/cross', body);
  }

  geneticsEdit(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/genetics/edit', body);
  }

  geneticsKepler(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/genetics/kepler', body);
  }

  geneticsPhenotype(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/genetics/phenotype', body);
  }

  geneticsArgonReady(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/genetics/argon-ready', body);
  }

  geneticsDrivers(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/genetics/drivers', body);
  }

  argonDoi(body: Record<string, unknown> = {}): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/argon/doi', body);
  }

  rocrate(body: Record<string, unknown> = {}): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/rocrate', body);
  }

  gpuSweep(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/gpu-sweep', body);
  }

  optoCurve(body: Record<string, unknown> = {}): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/opto/curve', body);
  }

  picslSample(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/picsl/sample');
  }

  bridgeFiji(runId?: string): Observable<Record<string, unknown>> {
    const q = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<Record<string, unknown>>(`/api/v1/science/bridges/fiji${q}`);
  }

  bridgeNapari(runId?: string): Observable<Record<string, unknown>> {
    const q = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<Record<string, unknown>>(`/api/v1/science/bridges/napari${q}`);
  }

  echellesCatalog(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/echelles');
  }

  echellesResolve(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/echelles/resolve', body);
  }

  ovniLifecycleCatalog(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/ovni/lifecycle');
  }

  ovniBirth(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/ovni/birth', body);
  }

  ovniAdvance(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/ovni/advance', body);
  }

  voixAide(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>('/api/v1/science/voix/aide');
  }

  voixFiche(body: Record<string, unknown> = {}): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/voix/fiche', body);
  }

  voixLexique(body: Record<string, unknown> = {}): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/voix/lexique', body);
  }

  voixGabarit(body: Record<string, unknown> = {}): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/voix/gabarit', body);
  }

  voixDialoguer(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/voix/dialoguer', body);
  }

  voixVerify(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/voix/verify', body);
  }

  voixStimulate(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/voix/stimulate', body);
  }

  voixReplay(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/v1/science/voix/replay', body);
  }

  voixJournal(limit = 30): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`/api/v1/science/voix/journal?limit=${limit}`);
  }

  voixJournalMdUrl(limit = 50): string {
    return `/api/v1/science/voix/journal.md?limit=${limit}`;
  }

  downloadVoixJournal(limit = 50): void {
    this.download(this.voixJournalMdUrl(limit), 'voix-journal.md');
  }

  runsDb(): Observable<{ run_id: string; action: string; created_at: string }[]> {
    return this.http.get<{ run_id: string; action: string; created_at: string }[]>(
      '/api/v1/science/runs/db',
    );
  }

  download(path: string, filename: string): void {
    this.http.get(path, { responseType: 'text' }).subscribe((text) => {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  downloadSpikes(id: string): void {
    this.download(this.spikesUrl(id), `spikes-${id.slice(0, 8)}.csv`);
  }

  downloadMethods(id: string): void {
    this.download(this.methodsUrl(id), `methods-${id.slice(0, 8)}.md`);
  }
}
