import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DemoSessionPayload,
  buildDemoUrl,
  decodeDemoSession,
} from './demo-session';
import { actionFrEn } from './labels';
import { findBrain, findMotif } from '../organism-select/hybrid-composition';
import {
  AdaptersDoc,
  Atlas,
  RunResult,
  ScienceService,
  StimulateRequest,
} from './science.service';

export type CircadianMode = 'day' | 'night';

export interface LabFlyInstance {
  id: string;
  label: string;
  action: string;
  x: number;
  z: number;
  heading: number;
}

export interface LabSceneEnv {
  circadian: CircadianMode;
  /** Température de chambre (°C) — modulateur d’activité pédagogique. */
  temperatureC: number;
}

export type GeneticsTool = 'none' | 'crispr1_cas9' | 'crispr2_cas12a' | 'kepler';

export type GeneticsGenotype = Record<string, [string, string]>;

export interface GeneticsDrivers {
  gal4: string;
  uas: string;
}

export type OvniLifeForm = 'egg' | 'larva' | 'pupa' | 'adult' | 'dead';

/** Phénotype 3D (Argon taille, yeux, ailes, GAL4/UAS, stade) — pédagogie. */
export interface LabFlyPhenotype {
  argon_scale: number;
  wing_scale: number;
  eye_hex: number;
  cuticle_amber_shift: number;
  crispr_glow: boolean;
  genotype_label: string;
  kepler_active: boolean;
  crispr_tool: GeneticsTool;
  driver_active: boolean;
  driver_label: string;
  neuron_glow: number;
  reporter_hex: number;
  optogenetic: boolean;
  silence_boost: boolean;
  /** Morphologie cycle de vie OVNI */
  life_form?: OvniLifeForm;
  life_stage?: string;
  mesh_scale?: number;
  mobility?: number;
}

export interface OvniLifeState {
  ovni_id: string;
  stage: string;
  form: OvniLifeForm;
  age_ticks: number;
  stage_tick: number;
  alive: boolean;
  energy: number;
  mesh_scale: number;
  mobility: number;
  lif_gain: number;
  genotype: GeneticsGenotype;
  phenotype: Partial<LabFlyPhenotype>;
  echelle: string;
}

export interface GeneticsOffspringPick {
  index: number;
  label: string;
  genotype: GeneticsGenotype;
  phenotype?: Partial<LabFlyPhenotype>;
  generation?: string;
}

export const DEFAULT_GENOTYPE: GeneticsGenotype = {
  w: ['w+', 'w+'],
  y: ['y+', 'y+'],
  b: ['b+', 'b+'],
  Tb: ['Tb+', 'Tb+'],
  s: ['s+', 's+'],
};

export const DEFAULT_FLY_PHENOTYPE: LabFlyPhenotype = {
  argon_scale: 1,
  wing_scale: 1,
  eye_hex: 0xb01a2e,
  cuticle_amber_shift: 0,
  crispr_glow: false,
  genotype_label: 'Oregon-R (type sauvage)',
  kepler_active: false,
  crispr_tool: 'none',
  driver_active: false,
  driver_label: '',
  neuron_glow: 1,
  reporter_hex: 0,
  optogenetic: false,
  silence_boost: false,
  life_form: 'adult',
  life_stage: 'adult',
  mesh_scale: 1,
  mobility: 1,
};

/** Vue connectome pédagogique (pas LIF 1:1). */
export type NervousViewMode = 'brain' | 'cns' | 'motif_roi';

export interface LabNervous {
  mode: NervousViewMode;
  /** Gains 0–1 → visu 4D + modulation stimuli LIF */
  optic: number;
  mushroom: number;
  sez: number;
  vnc: number;
  globalDrive: number;
  /** Références atlas (littérature) */
  atlasBrain: number;
  atlasCns: number;
  motifCount: number;
}

/** État visu partagé — Lab 3D + autres pages. */
export interface LabVisual {
  sugar: number;
  bitter: number;
  looming: number;
  hunger: number;
  action: string;
  decisionMs: number | null;
  ratesHz: Record<string, number>;
  runId: string | null;
  seed: number;
  shuffle: boolean;
  source: 'idle' | 'science' | 'life' | 'ovni';
  /** Organisme Vivant Numérique Intelligent — actif si source === 'ovni'. */
  ovni?: { tick: number; charter: string; neuronScale: number };
  /** Mouvement autonome 3D (vitesse + intention comportementale). */
  autonomous?: boolean;
  motion?: {
    intent: 'walk' | 'feed' | 'escape' | 'groom' | 'explore';
    driftX: number;
    driftZ: number;
    turnRate: number;
  };
  alive: boolean;
  energy: number;
  fly: { x: number; z: number; heading: number };
  flies: LabFlyInstance[];
  scene: LabSceneEnv;
  food: { x: number; z: number; sugar: number; bitter: number };
  threat: { active: boolean; looming: number };
  brain: string;
  outcome: string;
  genotype: GeneticsGenotype;
  phenotype: LabFlyPhenotype;
  /** Nuage cerveau / SNC 4D + influence régionale */
  nervous: LabNervous;
}

@Injectable({ providedIn: 'root' })
export class InstrumentStore {
  private readonly science = inject(ScienceService);

  readonly sugar = signal(0);
  readonly bitter = signal(0);
  readonly looming = signal(0);
  readonly hunger = signal(0.5);
  readonly seed = signal(7);
  readonly durationMs = signal(500);
  readonly silence = signal('');
  readonly shuffle = signal(false);
  readonly neuronId = signal('');
  readonly neuronHz = signal(0);

  readonly atlas = signal<Atlas | null>(null);
  readonly adapters = signal<AdaptersDoc | null>(null);
  readonly lastRun = signal<RunResult | null>(null);
  readonly busy = signal(false);
  readonly status = signal('');
  readonly error = signal('');
  readonly validation = signal('');
  readonly doseSummary = signal('');
  readonly methodsText = signal('');
  readonly demoLink = signal('');
  readonly guideStep = signal(0);

  /** Environnement scène 3D (comportement + éclairage). */
  readonly circadian = signal<CircadianMode>('day');
  readonly temperatureC = signal(25);
  /** 1–5 mouches avec paramètres décalés (essaim pédagogique). */
  readonly flyCohort = signal(1);

  /**
   * Connectome pédagogique 4D :
   * LIF = motif ROI (~11 neurones) ; visu = proxies FlyWire (~139k) / SNC (~166k).
   */
  readonly nervousMode = signal<NervousViewMode>('cns');
  readonly nervousOptic = signal(0.75);
  readonly nervousMushroom = signal(0.45);
  readonly nervousSez = signal(0.55);
  readonly nervousVnc = signal(0.6);
  readonly nervousDrive = signal(0.35);

  /** Hyperfocus 3D — objet étudié dans le labo interactif */
  readonly labFocus = signal<{
    kind: 'roi' | 'brain_proxy' | 'vnc_proxy' | 'organism' | 'food' | 'threat' | 'arena';
    id: string;
    label: string;
    detail: string;
    region?: string;
    hz: number;
    atlasEquiv?: number;
  } | null>(null);

  /** O.V.N.I. choisi au login (taxonomie → espèce). Défaut = drosophile. */
  readonly selectedOrganismId = signal(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('fruitfly.organismId') || 'drosophila_melanogaster'
      : 'drosophila_melanogaster',
  );
  readonly selectedOrganismLabel = signal(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('fruitfly.organismLabel') || 'Drosophila melanogaster'
      : 'Drosophila melanogaster',
  );

  setSelectedOrganism(id: string, label?: string): void {
    this.selectedOrganismId.set(id);
    const nice =
      label ||
      (id === 'drosophila_melanogaster' ? 'Drosophila melanogaster' : id.replace(/_/g, ' '));
    this.selectedOrganismLabel.set(nice);
    try {
      localStorage.setItem('fruitfly.organismId', id);
      localStorage.setItem('fruitfly.organismLabel', nice);
    } catch {
      /* ignore */
    }
    this.status.set(`O.V.N.I. actif · ${nice}`);
  }

  /** Motif ROI LIF (indépendant du taxon — permet hybridations contrôles). */
  readonly selectedMotifId = signal(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('fruitfly.motifId') || 'escape_feed_v1'
      : 'escape_feed_v1',
  );

  /** Atlas cérébral de visualisation (FlyWire / MaleCNS / proxies). */
  readonly selectedBrainAtlasId = signal(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('fruitfly.brainAtlasId') || 'flywire_brain_2024'
      : 'flywire_brain_2024',
  );

  setSelectedMotif(id: string): void {
    this.selectedMotifId.set(id);
    try {
      localStorage.setItem('fruitfly.motifId', id);
    } catch {
      /* ignore */
    }
  }

  setSelectedBrainAtlas(id: string): void {
    this.selectedBrainAtlasId.set(id);
    try {
      localStorage.setItem('fruitfly.brainAtlasId', id);
    } catch {
      /* ignore */
    }
  }

  /** Composition hybride taxon × motif ROI × atlas. */
  setHybridComposition(opts: {
    organismId: string;
    organismLabel?: string;
    motifId: string;
    brainAtlasId: string;
  }): void {
    this.setSelectedOrganism(opts.organismId, opts.organismLabel);
    this.setSelectedMotif(opts.motifId);
    this.setSelectedBrainAtlas(opts.brainAtlasId);
    this.status.set(
      `Composition · ${opts.organismLabel || opts.organismId} × ${opts.motifId} × ${opts.brainAtlasId}`,
    );
  }

  static readonly CONNECTOME_CLAIM = {
    flywire_brain: 139_255,
    isotropic_brain: 199_000,
    cns_brain_vnc: 166_000,
    note:
      'Le LIF tourne sur un motif ROI (ex. escape_feed_v1 ≈ 11 neurones). ' +
      'Le nuage 4D visualise l’échelle connectome (FlyWire ~139 255 cerveau ; ~166 000 SNC) — pédagogie, pas simulation 1:1.',
  };

  /**
   * Mode Methods-only (P0 publication) :
   * masque pédagogie OVNI / autonomie 3D / génétique spectacle — garde LIF + exports.
   */
  readonly methodsOnly = signal(
    typeof localStorage !== 'undefined' && localStorage.getItem('fruitfly.methodsOnly') === '1',
  );

  setMethodsOnly(on: boolean): void {
    this.methodsOnly.set(on);
    try {
      localStorage.setItem('fruitfly.methodsOnly', on ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (on) {
      this.stopOvni();
    }
  }

  /** Atelier génétique (croisements, CRISPR 1/2, Ciseaux Kepler → mesh 3D). */
  readonly geneticsGenotype = signal<GeneticsGenotype>({ ...DEFAULT_GENOTYPE });
  readonly geneticsPhenotype = signal<LabFlyPhenotype>({ ...DEFAULT_FLY_PHENOTYPE });
  readonly geneticsParentA = signal<GeneticsGenotype>({ ...DEFAULT_GENOTYPE });
  readonly geneticsParentB = signal<GeneticsGenotype>({
    ...DEFAULT_GENOTYPE,
    w: ['w+', 'w'],
    Tb: ['Tb+', 'Tb'],
  });
  readonly geneticsCrossType = signal('mono_hybrid');
  readonly geneticsSeed = signal(42);
  readonly geneticsBusy = signal(false);
  readonly geneticsNote = signal('');
  readonly geneticsLastCross = signal<Record<string, unknown> | null>(null);
  readonly geneticsCatalog = signal<Record<string, unknown> | null>(null);
  readonly geneticsOffspring = signal<GeneticsOffspringPick[]>([]);
  readonly geneticsSelectedOffspring = signal(0);
  readonly geneticsDrivers = signal<GeneticsDrivers>({ gal4: '', uas: '' });
  readonly geneticsEditTargets = signal<string[]>(['w', 'y']);
  readonly geneticsEditorFocus = signal<'work' | 'parent_a' | 'parent_b'>('work');

  /** Comparaison A/B (avant / après règle). */
  readonly runA = signal<RunResult | null>(null);
  readonly runB = signal<RunResult | null>(null);
  readonly compareFocus = signal<'A' | 'B' | 'live'>('live');
  readonly compareNote = signal('');

  /** OVNI — Organisme Vivant Numérique Intelligent (cerveau = LIF sur le motif, monde autonome). */
  readonly ovniActive = signal(false);
  readonly ovniTick = signal(0);
  readonly ovniEnergy = signal(0.78);
  readonly ovniAlive = signal(true);
  readonly ovniFly = signal({ x: 0.1, z: -0.1, heading: 0.35 });
  readonly ovniFood = signal({ x: 2.4, z: 1.1, sugar: 0, bitter: 0 });
  readonly ovniLastRun = signal<RunResult | null>(null);
  readonly ovniLog = signal<string[]>([]);
  readonly ovniMotion = signal<{
    intent: 'walk' | 'feed' | 'escape' | 'groom' | 'explore';
    driftX: number;
    driftZ: number;
    turnRate: number;
  }>({ intent: 'walk', driftX: 0, driftZ: 0.35, turnRate: 0 });
  /** Cycle de vie OVNI (œuf → mort) + échelle Argon/Maelstrom */
  readonly ovniLife = signal<OvniLifeState | null>(null);
  readonly ovniEchelle = signal<'argon' | 'essai' | 'maelstrom'>('essai');
  private ovniTimer: ReturnType<typeof setTimeout> | null = null;

  static readonly OVNI_CHARTER = {
    acronym: 'Organisme Vivant Numérique Intelligent (O.V.N.I.)',
    devoirs: [
      'Maintenir l’énergie par alimentation quand le motif LIF choisit EAT',
      'Fuir quand les voies looming dominent (ESCAPE)',
      'Respecter graine + empreinte à chaque pas de cerveau',
    ],
    droits: [
      'Percevoir le monde sans clic utilisateur (stimuli stochastiques)',
      'Décider via intégration-décharge sur le connectome motif',
      'Explorer l’arène et mettre à jour la scène 3D en continu',
    ],
    note:
      'Ce n’est pas un LLM « magique » : le cerveau O.V.N.I. est le moteur LIF (intégration-décharge) sur un motif ROI. ' +
      'FlyWire 2024 ≈ 139 255 neurones (cerveau) ; SNC étendu ≈ 166 000. Le nuage 4D montre cette échelle ; le LIF reste le sous-graphe actif.',
  };

  /** Preview knobs → scene even before a run completes. */
  readonly visual = computed<LabVisual>(() => {
    const focus = this.compareFocus();
    if (this.ovniActive() && focus === 'live') {
      return this.buildOvniVisual();
    }
    if (focus === 'A' && this.runA()) return this.visualFromRun(this.runA()!);
    if (focus === 'B' && this.runB()) return this.visualFromRun(this.runB()!);
    const run = this.lastRun();
    const sugar = this.sugar();
    const bitter = this.bitter();
    const looming = this.looming();
    const hunger = this.hunger();
    if (run) {
      const inputs = run.run_card.inputs as Record<string, unknown>;
      const rs = Number(inputs['sugar'] ?? sugar);
      const rb = Number(inputs['bitter'] ?? bitter);
      const rl = Number(inputs['looming'] ?? looming);
      const rh = Number(inputs['hunger'] ?? hunger);
      const pose = this.poseFromAction(run.action, rl);
      return this.withSceneAndCohort({
        sugar: rs,
        bitter: rb,
        looming: rl,
        hunger: rh,
        action: run.action,
        decisionMs: run.decision_ms,
        ratesHz: run.rates_hz || {},
        runId: run.run_card.run_id,
        seed: run.run_card.seed,
        shuffle: Boolean(inputs['shuffle_edges']),
        source: 'science',
        alive: true,
        energy: Math.max(0.15, 1 - rh * 0.55),
        fly: pose,
        food: { x: 2.2, z: 1.0, sugar: rs, bitter: rb },
        threat: { active: rl > 0.15 || run.action === 'ESCAPE', looming: rl },
        brain: this.brainLine(run),
        outcome: `${actionFrEn(run.action)}${run.decision_ms != null ? ` @ ${run.decision_ms.toFixed(1)} ms` : ''}`,
      });
    }
    const action =
      looming > 0.4 ? 'ESCAPE' : sugar > 0.5 && bitter < 0.4 ? 'EAT' : 'IDLE';
    return this.withSceneAndCohort({
      sugar,
      bitter,
      looming,
      hunger,
      action,
      decisionMs: null,
      ratesHz: {},
      runId: null,
      seed: this.seed(),
      shuffle: this.shuffle(),
      source: 'idle',
      alive: true,
      energy: Math.max(0.2, 1 - hunger * 0.5),
      fly: this.poseFromAction(action, looming),
      food: { x: 2.2, z: 1.0, sugar, bitter },
      threat: { active: looming > 0.12, looming },
      brain: 'aperçu — lancez LIF pour tracer les spikes',
      outcome: 'prévisualisation en direct',
    });
  });

  loadAtlas(): void {
    this.science.atlas().subscribe({
      next: (a) => {
        this.atlas.set(a);
        if (!this.neuronId() && a.neurons.length) this.neuronId.set(a.neurons[0].id);
        this.status.set(
          `motif ${a.circuit_id} · ${a.neuron_count} neurones LIF · atlas visu ~${InstrumentStore.CONNECTOME_CLAIM.flywire_brain.toLocaleString('fr-FR')} (cerveau)`,
        );
      },
      error: (e) => this.error.set(String(e?.error?.message || e.message || e)),
    });
  }

  loadAdapters(): void {
    this.science.adapters().subscribe({
      next: (d) => this.adapters.set(d),
      error: (e) => this.error.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  setKnobs(partial: Partial<{
    sugar: number;
    bitter: number;
    looming: number;
    hunger: number;
    seed: number;
    durationMs: number;
    silence: string;
    shuffle: boolean;
  }>): void {
    if (partial.sugar != null) this.sugar.set(partial.sugar);
    if (partial.bitter != null) this.bitter.set(partial.bitter);
    if (partial.looming != null) this.looming.set(partial.looming);
    if (partial.hunger != null) this.hunger.set(partial.hunger);
    if (partial.seed != null) this.seed.set(partial.seed);
    if (partial.durationMs != null) this.durationMs.set(partial.durationMs);
    if (partial.silence != null) this.silence.set(partial.silence);
    if (partial.shuffle != null) this.shuffle.set(partial.shuffle);
  }

  ingestRun(run: RunResult): void {
    this.lastRun.set(run);
    const inputs = run.run_card.inputs as Record<string, unknown>;
    if (typeof inputs['sugar'] === 'number') this.sugar.set(inputs['sugar']);
    if (typeof inputs['bitter'] === 'number') this.bitter.set(inputs['bitter']);
    if (typeof inputs['looming'] === 'number') this.looming.set(inputs['looming']);
    if (typeof inputs['hunger'] === 'number') this.hunger.set(inputs['hunger']);
    this.seed.set(run.run_card.seed);
    this.status.set(`${actionFrEn(run.action)} · ${run.run_card.run_id.slice(0, 8)}`);
    this.error.set('');
  }

  buildRequest(): StimulateRequest {
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    // Influence régionale → modulé les canaux sensoriels du motif LIF
    const optic = this.nervousOptic();
    const sez = this.nervousSez();
    const vnc = this.nervousVnc();
    const mush = this.nervousMushroom();
    const drive = this.nervousDrive();
    const body: StimulateRequest = {
      sugar: clamp01(this.sugar() * (0.25 + sez * 1.1) * (0.7 + drive * 0.5)),
      bitter: clamp01(this.bitter() * (0.4 + (1 - sez) * 0.6)),
      looming: clamp01(this.looming() * (0.2 + optic * 1.2) * (0.65 + vnc * 0.55)),
      hunger: clamp01(this.hunger() * (0.5 + mush * 0.7)),
      seed: this.seed(),
      duration_ms: this.durationMs(),
      shuffle_edges: this.shuffle(),
      circadian: this.circadian(),
      temperature_c: this.temperatureC(),
      fly_cohort: this.flyCohort(),
      silence: this.silence()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const rates: Record<string, number> = {};
    if (this.neuronHz() > 0 && this.neuronId()) {
      rates[this.neuronId()] = this.neuronHz();
      body.sugar = 0;
      body.bitter = 0;
      body.looming = 0;
    }
    // Injection pédagogique sur voies moteur / KC selon gains VNC / mushroom
    if (vnc > 0.7 && !rates['DNp01_L']) {
      rates['DNp01_L'] = 25 + vnc * 55;
    }
    if (mush > 0.75 && !rates['KC']) {
      rates['KC'] = 15 + mush * 40;
    }
    if (Object.keys(rates).length) body.neuron_rates = rates;
    return body;
  }

  setNervousMode(mode: NervousViewMode): void {
    this.nervousMode.set(mode);
    const brain = findBrain(this.selectedBrainAtlasId());
    const motif = findMotif(this.selectedMotifId());
    const count = brain ? brain.proxyCount.toLocaleString('fr-FR') : '';
    const withVnc = this.selectedBrainAtlasId() === 'malecns_brain_vnc_2026';
    const label =
      mode === 'motif_roi'
        ? `vue motif ROI · ${motif?.name ?? 'LIF'} · ${motif?.neuronCount ?? 0} neurones`
        : withVnc && mode === 'cns'
          ? `vue SNC · ${brain?.name ?? 'atlas'} · ${count} · cerveau + chaîne ventrale`
          : `vue cerveau · ${brain?.name ?? 'atlas'} · ${count}`;
    this.status.set(label);
  }

  clearLabFocus(): void {
    this.labFocus.set(null);
  }

  /** Clic motif ROI → sélectionne le neurone LIF et propose une stimulation. */
  focusRoiNeuron(id: string, hzHint?: number): void {
    const rates = this.lastRun()?.rates_hz || this.ovniLastRun()?.rates_hz || {};
    const hz = hzHint ?? Number(rates[id] ?? 0);
    this.neuronId.set(id);
    this.labFocus.set({
      kind: 'roi',
      id,
      label: id,
      detail: 'Motif LIF — neurone simulé (intégration-décharge). Manipulez Hz puis relancez.',
      hz,
    });
    this.status.set(`hyperfocus ROI · ${id}`);
  }

  focusNervousProxy(opts: {
    layer: 'brain' | 'vnc';
    index: number;
    label: string;
    region: string;
    atlasEquiv: number;
  }): void {
    this.labFocus.set({
      kind: opts.layer === 'brain' ? 'brain_proxy' : 'vnc_proxy',
      id: `${opts.layer}-${opts.index}`,
      label: opts.label,
      detail:
        opts.layer === 'brain'
          ? `Proxy pédagogique cerveau (≈ ${opts.atlasEquiv} neurones FlyWire). Région : ${opts.region}.`
          : `Proxy pédagogique chaîne VNC (≈ ${opts.atlasEquiv} neurones). Région : ${opts.region}.`,
      region: opts.region,
      hz: 0,
      atlasEquiv: opts.atlasEquiv,
    });
    // Influence régionale selon la zone cliquée
    if (opts.region.includes('optic') || opts.region === 'optic') this.nervousOptic.set(0.95);
    if (opts.region.includes('mushroom') || opts.region === 'mushroom') this.nervousMushroom.set(0.9);
    if (opts.region.includes('sez') || opts.region === 'sez') this.nervousSez.set(0.9);
    if (opts.region.startsWith('vnc')) this.nervousVnc.set(0.95);
    this.status.set(`hyperfocus ${opts.label}`);
  }

  /** Stimule le neurone ROI / région / stimulus sélectionné et relance LIF. */
  stimulateFocused(hz = 80): void {
    const f = this.labFocus();
    if (f?.kind === 'roi') {
      this.neuronId.set(f.id);
      this.neuronHz.set(hz);
      this.labFocus.update((cur) => (cur ? { ...cur, hz } : cur));
      this.runLif();
      return;
    }
    if (f?.kind === 'food') {
      this.neuronHz.set(0);
      this.sugar.set(Math.min(1, Math.max(0.75, this.sugar() + 0.35)));
      this.hunger.set(Math.min(1, this.hunger() + 0.2));
      this.runLif();
      return;
    }
    if (f?.kind === 'threat') {
      this.neuronHz.set(0);
      this.looming.set(Math.min(1, Math.max(0.85, this.looming() + 0.35)));
      this.runLif();
      return;
    }
    if (f?.kind === 'organism') {
      this.runLif();
      return;
    }
    if (f?.kind === 'brain_proxy' || f?.kind === 'vnc_proxy') {
      this.neuronHz.set(0);
      if (f.region === 'optic') this.looming.set(Math.min(1, this.looming() + 0.4));
      else if (f.region === 'sez') this.sugar.set(Math.min(1, this.sugar() + 0.4));
      else if (f.region === 'mushroom') this.hunger.set(Math.min(1, this.hunger() + 0.35));
      else if (f.region?.startsWith('vnc')) {
        this.nervousVnc.set(1);
        this.looming.set(Math.min(1, this.looming() + 0.25));
      } else {
        this.nervousDrive.set(Math.min(1, this.nervousDrive() + 0.3));
      }
      this.runLif();
      return;
    }
    this.runLif();
  }

  silenceFocused(): void {
    const f = this.labFocus();
    if (f?.kind === 'roi') {
      const cur = this.silence()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!cur.includes(f.id)) cur.push(f.id);
      this.silence.set(cur.join(','));
      this.neuronHz.set(0);
      this.runLif();
    }
  }

  private buildNervous(): LabNervous {
    const motif = findMotif(this.selectedMotifId());
    const brain = findBrain(this.selectedBrainAtlasId());
    const withVnc = brain?.key === 'malecns_brain_vnc_2026';
    return {
      mode: this.nervousMode(),
      optic: this.nervousOptic(),
      mushroom: this.nervousMushroom(),
      sez: this.nervousSez(),
      vnc: this.nervousVnc(),
      globalDrive: this.nervousDrive(),
      atlasBrain: brain?.proxyCount ?? InstrumentStore.CONNECTOME_CLAIM.flywire_brain,
      atlasCns: withVnc ? brain.proxyCount : 0,
      motifCount: motif?.neuronCount ?? this.atlas()?.neuron_count ?? 11,
    };
  }

  runLif(): void {
    this.busy.set(true);
    this.error.set('');
    this.status.set('simulation LIF…');
    this.science.stimulate(this.buildRequest()).subscribe({
      next: (r) => {
        this.ingestRun(r);
        this.busy.set(false);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
      },
    });
  }

  preset(kind: 'escape' | 'eat' | 'bitter'): void {
    this.neuronHz.set(0);
    if (kind === 'escape') {
      this.setKnobs({ looming: 0.9, sugar: 0, bitter: 0, hunger: 0 });
    } else if (kind === 'eat') {
      this.setKnobs({ looming: 0, sugar: 0.9, bitter: 0, hunger: 0.8 });
    } else {
      this.setKnobs({ looming: 0, sugar: 0.9, bitter: 0.8, hunger: 0.8 });
    }
    this.runLif();
  }

  validate(): void {
    this.science.validate().subscribe({
      next: (v) =>
        this.validation.set(
          v.passed ? 'TESTS RÉUSSIS — motif reproductible' : 'TESTS ÉCHOUÉS',
        ),
      error: (e) => this.validation.set(String(e?.error?.message || e.message || e)),
    });
  }

  quickDose(channel: 'looming' | 'sugar' | 'bitter' | 'hunger' = 'looming'): void {
    this.busy.set(true);
    const canalFr =
      channel === 'looming'
        ? 'menace'
        : channel === 'sugar'
          ? 'sucre'
          : channel === 'bitter'
            ? 'amer'
            : 'faim';
    this.status.set(`dose-réponse ${canalFr}…`);
    this.science
      .doseResponse({
        channel,
        levels: [0, 0.25, 0.5, 0.75, 1],
        repeats: 3,
        sugar: this.sugar(),
        bitter: this.bitter(),
        looming: this.looming(),
        hunger: this.hunger(),
        base_seed: this.seed(),
      })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          const line = r.curve
            .map((c) => `${c.level}:E${c.p_escape.toFixed(1)}`)
            .join(' · ');
          this.doseSummary.set(`${canalFr} ×3 — ${line}`);
          this.status.set('courbe prête');
          const last = r.curve[r.curve.length - 1];
          if (last) {
            if (channel === 'looming') this.looming.set(last.level);
            if (channel === 'sugar') this.sugar.set(last.level);
            if (channel === 'bitter') this.bitter.set(last.level);
            if (channel === 'hunger') this.hunger.set(last.level);
            if (last.run_ids?.length) {
              this.science.run(last.run_ids[last.run_ids.length - 1]).subscribe({
                next: (run) => this.ingestRun(run),
              });
            }
          }
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
  }

  patchPolicy(key: string, value: unknown): void {
    const doc = this.adapters();
    if (!doc) return;
    this.applyPolicies({ ...(doc.policies || {}), [key]: value });
  }

  applyPolicies(policies: Record<string, unknown>, rerun = true, then?: () => void): void {
    const doc = this.adapters();
    if (!doc) {
      this.loadAdapters();
      return;
    }
    const next = { ...doc, policies: { ...(doc.policies || {}), ...policies } };
    delete (next as { _meta?: unknown })._meta;
    this.busy.set(true);
    this.science.saveAdapters(next).subscribe({
      next: (d) => {
        this.adapters.set(d);
        this.busy.set(false);
        this.status.set('règles appliquées · scène mise à jour');
        if (then) then();
        else if (rerun) this.runLif();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
      },
    });
  }

  /** Snapshot condition A (état actuel + run). */
  snapshotA(): void {
    const run = () => {
      const r = this.lastRun();
      if (r) {
        this.runA.set(r);
        this.compareNote.set(`A figé · ${actionFrEn(r.action)}`);
        this.compareFocus.set('A');
      }
    };
    if (!this.lastRun()) {
      this.busy.set(true);
      this.science.stimulate(this.buildRequest()).subscribe({
        next: (r) => {
          this.ingestRun(r);
          this.busy.set(false);
          run();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
    } else {
      run();
    }
  }

  /** Après changement de règle : run B et comparer. */
  runAsB(): void {
    this.busy.set(true);
    this.status.set('condition B…');
    this.science.stimulate(this.buildRequest()).subscribe({
      next: (r) => {
        this.ingestRun(r);
        this.runB.set(r);
        this.compareFocus.set('B');
        const a = this.runA();
        this.compareNote.set(
          a
            ? `A=${actionFrEn(a.action)} → B=${actionFrEn(r.action)}`
            : `B=${actionFrEn(r.action)} (figez A d’abord)`,
        );
        this.busy.set(false);
        this.status.set('comparaison A/B prête');
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
      },
    });
  }

  showCompare(side: 'A' | 'B' | 'live'): void {
    this.compareFocus.set(side);
  }

  fetchMethods(runId?: string): void {
    const id = runId || this.lastRun()?.run_card.run_id;
    if (!id) {
      this.error.set('Lancez d’abord un essai pour exporter Méthodes');
      return;
    }
    this.science.methodsText(id).subscribe({
      next: (text) => {
        this.methodsText.set(text);
        this.status.set('Méthodes prêtes à copier');
      },
      error: (e) => this.error.set(String(e?.error?.message || e.message || e)),
    });
  }

  downloadMethods(): void {
    const id = this.lastRun()?.run_card.run_id;
    if (!id) return;
    this.science.downloadMethods(id);
  }

  copyMethods(): void {
    const text = this.methodsText();
    if (!text) {
      this.fetchMethods();
      return;
    }
    void navigator.clipboard.writeText(text).then(() => {
      this.status.set('Méthodes copiées dans le presse-papiers');
    });
  }

  buildShareLink(): string {
    const adapters = this.adapters();
    const payload: DemoSessionPayload = {
      v: 1,
      seed: this.seed(),
      sugar: this.sugar(),
      bitter: this.bitter(),
      looming: this.looming(),
      hunger: this.hunger(),
      durationMs: this.durationMs(),
      shuffle: this.shuffle(),
      silence: this.silence(),
      policies: adapters?.policies,
      parameters: adapters?.parameters,
      adaptersVersion: adapters?.version,
      label: 'luminy-demo',
    };
    const url = buildDemoUrl(payload);
    this.demoLink.set(url);
    return url;
  }

  copyShareLink(): void {
    const url = this.buildShareLink();
    void navigator.clipboard.writeText(url).then(() => {
      this.status.set('Lien démo copié — même graine + règles');
    });
  }

  applyDemoFromLocation(): void {
    const hash = window.location.hash || '';
    const m = hash.match(/demo=([^&]+)/);
    if (!m) return;
    const payload = decodeDemoSession(m[1]);
    if (!payload) {
      this.error.set('Lien démo invalide');
      return;
    }
    this.setKnobs({
      sugar: payload.sugar,
      bitter: payload.bitter,
      looming: payload.looming,
      hunger: payload.hunger,
      seed: payload.seed,
      durationMs: payload.durationMs,
      silence: payload.silence,
      shuffle: payload.shuffle,
    });
    if (payload.policies || payload.parameters) {
      const doc = this.adapters();
      if (doc) {
        const next = {
          ...doc,
          policies: { ...(doc.policies || {}), ...(payload.policies || {}) },
          parameters: { ...(doc.parameters || {}), ...(payload.parameters || {}) },
        };
        delete (next as { _meta?: unknown })._meta;
        this.science.saveAdapters(next).subscribe({
          next: (d) => {
            this.adapters.set(d);
            this.status.set('Session démo chargée — LIF…');
            this.runLif();
          },
        });
        return;
      }
    }
    this.status.set('Session démo chargée — LIF…');
    this.runLif();
  }

  private visualFromRun(run: RunResult): LabVisual {
    const inputs = run.run_card.inputs as Record<string, unknown>;
    const sugar = Number(inputs['sugar'] ?? 0);
    const bitter = Number(inputs['bitter'] ?? 0);
    const looming = Number(inputs['looming'] ?? 0);
    const hunger = Number(inputs['hunger'] ?? 0);
    return this.withSceneAndCohort({
      sugar,
      bitter,
      looming,
      hunger,
      action: run.action,
      decisionMs: run.decision_ms,
      ratesHz: run.rates_hz || {},
      runId: run.run_card.run_id,
      seed: run.run_card.seed,
      shuffle: Boolean(inputs['shuffle_edges']),
      source: 'science',
      alive: true,
      energy: Math.max(0.15, 1 - hunger * 0.55),
      fly: this.poseFromAction(run.action, looming),
      food: { x: 2.2, z: 1.0, sugar, bitter },
      threat: { active: looming > 0.15 || run.action === 'ESCAPE', looming },
      brain: this.brainLine(run),
      outcome: `${actionFrEn(run.action)}${run.decision_ms != null ? ` @ ${run.decision_ms.toFixed(1)} ms` : ''}`,
    });
  }

  private withSceneAndCohort(
    base: Omit<
      LabVisual,
      'flies' | 'scene' | 'autonomous' | 'motion' | 'ovni' | 'genotype' | 'phenotype' | 'nervous'
    >,
  ): LabVisual {
    const scene: LabSceneEnv = {
      circadian: this.circadian(),
      temperatureC: this.temperatureC(),
    };
    const flies = this.buildFlyCohort(base);
    return {
      ...base,
      scene,
      flies,
      genotype: this.geneticsGenotype(),
      phenotype: this.geneticsPhenotype(),
      nervous: this.buildNervous(),
    };
  }

  loadGeneticsCatalog(): void {
    this.science.geneticsCatalog().subscribe({
      next: (c) => this.geneticsCatalog.set(c),
      error: (e) => this.error.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  private driversPayload(): GeneticsDrivers | Record<string, string> {
    const d = this.geneticsDrivers();
    if (!d.gal4 && !d.uas) return {};
    return { gal4: d.gal4, uas: d.uas };
  }

  private refreshPhenotype(): void {
    this.science
      .geneticsPhenotype({
        genotype: this.geneticsGenotype(),
        drivers: this.driversPayload(),
      })
      .subscribe({
        next: (res) => this.ingestGeneticsPayload(res),
      });
  }

  private ingestGeneticsPayload(
    payload: Record<string, unknown>,
    tool: GeneticsTool = 'none',
  ): void {
    const gt = payload['genotype'] as GeneticsGenotype | undefined;
    const ph = payload['phenotype'] as Partial<LabFlyPhenotype> | undefined;
    if (gt) this.geneticsGenotype.set({ ...DEFAULT_GENOTYPE, ...gt });
    if (ph) {
      this.geneticsPhenotype.set({
        ...DEFAULT_FLY_PHENOTYPE,
        ...ph,
        crispr_tool: tool !== 'none' ? tool : (ph.crispr_tool as GeneticsTool) ?? 'none',
        kepler_active: tool === 'kepler' || Boolean(ph.kepler_active),
      });
    }
  }

  runGeneticsCross(): void {
    this.geneticsBusy.set(true);
    this.geneticsNote.set('');
    this.science
      .geneticsCross({
        cross_type: this.geneticsCrossType(),
        parent_a: this.geneticsParentA(),
        parent_b: this.geneticsParentB(),
        seed: this.geneticsSeed(),
        n_offspring: 64,
        drivers: this.driversPayload(),
      })
      .subscribe({
        next: (res) => {
          this.geneticsLastCross.set(res);
          const selectable = (res['selectable'] as GeneticsOffspringPick[] | undefined) ?? [];
          const offspring = (res['offspring'] as GeneticsGenotype[] | undefined) ?? [];
          const picks: GeneticsOffspringPick[] =
            selectable.length > 0
              ? selectable
              : offspring.map((g, index) => ({
                  index,
                  label: Object.entries(g)
                    .map(([k, v]) => `${k}=${v[0]}/${v[1]}`)
                    .join('; '),
                  genotype: g,
                  generation: 'F1',
                }));
          this.geneticsOffspring.set(picks);
          this.geneticsSelectedOffspring.set(0);
          if (picks[0]) {
            this.selectGeneticsOffspring(0);
          } else {
            this.ingestGeneticsPayload(res);
          }
          this.geneticsNote.set(
            `Croisement ${String(res['cross_type'])} · ${picks.length} descendants listés · ${String(res['sex_annotation'] ?? '')}`,
          );
          this.geneticsBusy.set(false);
        },
        error: (e) => {
          this.geneticsBusy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
  }

  selectGeneticsOffspring(index: number): void {
    const picks = this.geneticsOffspring();
    const pick = picks[index];
    if (!pick) return;
    this.geneticsSelectedOffspring.set(index);
    this.geneticsGenotype.set({ ...DEFAULT_GENOTYPE, ...pick.genotype });
    if (pick.phenotype) {
      this.geneticsPhenotype.set({
        ...DEFAULT_FLY_PHENOTYPE,
        ...pick.phenotype,
      });
    } else {
      this.refreshPhenotype();
    }
    this.geneticsNote.set(
      `Descendant #${index + 1} (${pick.generation ?? 'F'}) · ${pick.label}`,
    );
  }

  runGeneticsEdit(tool: GeneticsTool): void {
    this.geneticsBusy.set(true);
    this.science
      .geneticsEdit({
        tool,
        genotype: this.geneticsGenotype(),
        targets: this.geneticsEditTargets(),
        drivers: this.driversPayload(),
      })
      .subscribe({
        next: (res) => {
          this.ingestGeneticsPayload(res, tool);
          this.geneticsNote.set(
            `Édition ${String(res['famille'] ?? tool)} · ${(res['events'] as unknown[])?.length ?? 0} événement(s)`,
          );
          this.geneticsBusy.set(false);
        },
        error: (e) => {
          this.geneticsBusy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
  }

  runGeneticsKepler(): void {
    this.geneticsBusy.set(true);
    this.science
      .geneticsKepler({
        genotype: this.geneticsGenotype(),
        cuts: this.geneticsEditTargets(),
        drivers: this.driversPayload(),
      })
      .subscribe({
        next: (res) => {
          this.ingestGeneticsPayload(res, 'kepler');
          this.geneticsNote.set(
            `Ciseaux Kepler · ${String((res['kepler'] as Record<string, unknown>)?.['n_cuts'] ?? '')} cibles`,
          );
          this.geneticsBusy.set(false);
        },
        error: (e) => {
          this.geneticsBusy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
  }

  applyGeneticsDrivers(): void {
    this.geneticsBusy.set(true);
    this.science
      .geneticsDrivers({
        genotype: this.geneticsGenotype(),
        drivers: this.driversPayload(),
      })
      .subscribe({
        next: (res) => {
          this.ingestGeneticsPayload(res);
          const drv = res['drivers'] as Record<string, unknown> | undefined;
          this.geneticsNote.set(
            drv?.['active']
              ? `Driver actif · ${String(drv['label'])}`
              : 'Choisissez un GAL4 et un UAS pour activer l’expression',
          );
          this.geneticsBusy.set(false);
        },
        error: (e) => {
          this.geneticsBusy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
  }

  setGeneticsDriver(kind: 'gal4' | 'uas', id: string): void {
    this.geneticsDrivers.update((d) => ({ ...d, [kind]: id }));
  }

  geneticsArgonReady(): void {
    this.geneticsBusy.set(true);
    this.science
      .geneticsArgonReady({
        genotype: this.geneticsGenotype(),
        drivers: this.driversPayload(),
        run_id: this.lastRun()?.run_card.run_id ?? null,
      })
      .subscribe({
        next: (res) => {
          const scale = Number((res['container_scale'] as number | undefined) ?? 1);
          this.geneticsPhenotype.update((p) => ({ ...p, argon_scale: scale }));
          this.geneticsNote.set('Lignée prête Argon — échelle conteneur = phénotype Tb/w/CRISPR');
          this.geneticsBusy.set(false);
        },
        error: (e) => {
          this.geneticsBusy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
  }

  private targetGenotypeSignal(): typeof this.geneticsGenotype {
    const focus = this.geneticsEditorFocus();
    if (focus === 'parent_a') return this.geneticsParentA;
    if (focus === 'parent_b') return this.geneticsParentB;
    return this.geneticsGenotype;
  }

  setGeneticsLocus(locus: string, maternal: string, paternal: string): void {
    const sig = this.targetGenotypeSignal();
    sig.update((g) => ({ ...g, [locus]: [maternal, paternal] }));
    if (this.geneticsEditorFocus() === 'work') {
      this.refreshPhenotype();
    }
  }

  copyWorkToParent(which: 'parent_a' | 'parent_b'): void {
    const g = { ...this.geneticsGenotype() };
    if (which === 'parent_a') this.geneticsParentA.set(g);
    else this.geneticsParentB.set(g);
    this.geneticsNote.set(`Lignée de travail → ${which === 'parent_a' ? 'parent A' : 'parent B'}`);
  }

  toggleGeneticsEditTarget(locus: string): void {
    this.geneticsEditTargets.update((list) =>
      list.includes(locus) ? list.filter((x) => x !== locus) : [...list, locus],
    );
  }

  geneticsPresetStock(id: 'oregon_r' | 'white_mini' | 'tubby_yellow' | 'gal4_uas'): void {
    if (id === 'white_mini') {
      this.geneticsGenotype.set({
        ...DEFAULT_GENOTYPE,
        w: ['w', 'w'],
        b: ['b', 'b'],
      });
    } else if (id === 'tubby_yellow') {
      this.geneticsGenotype.set({
        ...DEFAULT_GENOTYPE,
        y: ['y', 'y'],
        Tb: ['Tb', 'Tb'],
      });
    } else if (id === 'gal4_uas') {
      this.geneticsGenotype.set({ ...DEFAULT_GENOTYPE });
      this.geneticsDrivers.set({ gal4: 'elav-GAL4', uas: 'UAS-GFP' });
      this.applyGeneticsDrivers();
      return;
    } else {
      this.geneticsGenotype.set({ ...DEFAULT_GENOTYPE });
    }
    this.refreshPhenotype();
  }

  private buildFlyCohort(
    base: Omit<
      LabVisual,
      'flies' | 'scene' | 'autonomous' | 'motion' | 'ovni' | 'genotype' | 'phenotype' | 'nervous'
    >,
  ): LabFlyInstance[] {
    const n = Math.min(5, Math.max(1, this.flyCohort()));
    const night = this.circadian() === 'night';
    const temp = this.temperatureC();
    const tempStress = Math.abs(temp - 25) / 15;
    const flies: LabFlyInstance[] = [];
    for (let i = 0; i < n; i++) {
      const phase = i * 0.19;
      const s = base.sugar * (1 - phase * 0.12);
      const b = Math.min(1, base.bitter + phase * 0.08);
      const l = Math.min(1, base.looming + (i % 2 === 0 ? 0 : -0.06));
      const h = Math.min(1, base.hunger + phase * 0.05);
      let action = l > 0.4 ? 'ESCAPE' : s > 0.5 && b < 0.4 ? 'EAT' : 'IDLE';
      if (night) {
        if (action === 'EAT' && h < 0.55) action = 'IDLE';
        if (temp < 18 && action === 'ESCAPE') action = 'IDLE';
      }
      if (tempStress > 0.35 && action === 'EAT') action = 'IDLE';
      const pose = this.poseFromAction(action, l);
      const spread = (i - (n - 1) / 2) * 0.55;
      flies.push({
        id: `fly-${i + 1}`,
        label: `♀♂ ${i + 1}`,
        action,
        x: pose.x + spread,
        z: pose.z + spread * 0.35,
        heading: pose.heading + phase * 0.4,
      });
    }
    if (flies.length) {
      flies[0].action = base.action;
      flies[0].x = base.fly.x;
      flies[0].z = base.fly.z;
      flies[0].heading = base.fly.heading;
      flies[0].label = 'référence LIF';
    }
    return flies;
  }

  private poseFromAction(action: string, looming: number): {
    x: number;
    z: number;
    heading: number;
  } {
    if (action === 'ESCAPE') {
      return { x: -1.8 - looming, z: 1.4, heading: -2.2 };
    }
    if (action === 'EAT') {
      return { x: 1.6, z: 0.7, heading: 0.6 };
    }
    return { x: 0.1, z: -0.2, heading: 0.35 };
  }

  private brainLine(run: RunResult): string {
    const top = Object.entries(run.rates_hz || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([n, hz]) => `${n}:${hz.toFixed(0)}Hz`)
      .join('  ');
    return top || 'pas de spikes';
  }

  setOvniEchelle(e: 'argon' | 'essai' | 'maelstrom'): void {
    this.ovniEchelle.set(e);
    this.science.echellesResolve({ echelle: e }).subscribe({
      next: (r) => {
        const overrides = (r['param_overrides'] as Record<string, number>) || {};
        if (overrides['dt_ms'] != null) {
          /* dt appliqué via buildRequest param_overrides si exposé */
        }
        const cohort = Number(r['fly_cohort'] || 1);
        if (e === 'maelstrom') this.flyCohort.set(Math.min(5, Math.max(3, cohort)));
        else this.flyCohort.set(1);
        this.geneticsNote.set(
          e === 'argon'
            ? 'Échelle Argon — résolution fine / 1 individu / empreinte'
            : e === 'maelstrom'
              ? 'Échelle Maelstrom — cohorte / population pédagogique'
              : 'Échelle essai',
        );
      },
    });
  }

  /** Naître un OVNI avec le génotype / drivers actuels, puis lancer le cycle. */
  birthOvni(): void {
    this.geneticsBusy.set(true);
    this.science
      .ovniBirth({
        genotype: this.geneticsGenotype(),
        drivers: this.driversPayload(),
        echelle: this.ovniEchelle(),
      })
      .subscribe({
        next: (res) => {
          this.applyOvniLifePayload(res);
          this.geneticsBusy.set(false);
          this.geneticsNote.set(
            `OVNI né · stade ${String(res['stage'])} · ${String((res['phenotype'] as LabFlyPhenotype)?.genotype_label || '')}`,
          );
          if (!this.ovniActive()) {
            this.toggleOvni();
          }
        },
        error: (e) => {
          this.geneticsBusy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
  }

  forceOvniStage(stage: string): void {
    const state = this.ovniLife();
    this.science.ovniAdvance({ state, force_stage: stage }).subscribe({
      next: (res) => this.applyOvniLifePayload(res),
    });
  }

  private applyOvniLifePayload(res: Record<string, unknown>): void {
    const ph = (res['phenotype'] as Partial<LabFlyPhenotype>) || {};
    const form = (res['form'] as OvniLifeForm) || 'egg';
    const life: OvniLifeState = {
      ovni_id: String(res['ovni_id'] || ''),
      stage: String(res['stage'] || 'egg'),
      form,
      age_ticks: Number(res['age_ticks'] || 0),
      stage_tick: Number(res['stage_tick'] || 0),
      alive: Boolean(res['alive']),
      energy: Number(res['energy'] ?? 0.8),
      mesh_scale: Number(res['mesh_scale'] || 1),
      mobility: Number(res['mobility'] ?? 1),
      lif_gain: Number(res['lif_gain'] ?? 1),
      genotype: (res['genotype'] as GeneticsGenotype) || this.geneticsGenotype(),
      phenotype: ph,
      echelle: String(res['echelle'] || this.ovniEchelle()),
    };
    this.ovniLife.set(life);
    this.ovniEnergy.set(life.energy);
    this.ovniAlive.set(life.alive);
    if (res['genotype']) {
      this.geneticsGenotype.set({ ...DEFAULT_GENOTYPE, ...(res['genotype'] as GeneticsGenotype) });
    }
    this.geneticsPhenotype.set({
      ...DEFAULT_FLY_PHENOTYPE,
      ...ph,
      life_form: form,
      life_stage: life.stage,
      mesh_scale: life.mesh_scale,
      mobility: life.mobility,
      argon_scale: Number(ph.argon_scale ?? DEFAULT_FLY_PHENOTYPE.argon_scale),
    });
  }

  toggleOvni(): void {
    if (this.ovniActive()) {
      this.stopOvni();
      return;
    }
    this.resetOvniWorld();
    if (!this.ovniLife()) {
      // Naissance implicite Oregon-R si pas encore né
      this.birthOvni();
      return;
    }
    this.ovniActive.set(true);
    this.ovniAlive.set(this.ovniLife()?.alive ?? true);
    this.compareFocus.set('live');
    this.status.set('O.V.N.I. autonome — cerveau LIF actif');
    this.ovniLog.set([
      `OVNI · stade ${this.ovniLife()?.stage ?? 'adult'} · échelle ${this.ovniEchelle()}`,
    ]);
    this.ovniSchedule();
  }

  stopOvni(): void {
    this.ovniActive.set(false);
    if (this.ovniTimer) {
      clearTimeout(this.ovniTimer);
      this.ovniTimer = null;
    }
    if (!this.busy()) {
      this.status.set('O.V.N.I. en pause — reprenez le contrôle manuel');
    }
  }

  private resetOvniWorld(): void {
    this.ovniTick.set(0);
    this.ovniEnergy.set(0.78);
    this.ovniFly.set({ x: 0.1, z: -0.1, heading: 0.35 });
    this.ovniFood.set({ x: 2.4, z: 1.1, sugar: 0, bitter: 0 });
    this.ovniMotion.set({ intent: 'walk', driftX: 0, driftZ: 0.35, turnRate: 0 });
    this.sugar.set(0);
    this.bitter.set(0);
    this.looming.set(0);
    this.hunger.set(0.22);
    this.ovniLastRun.set(null);
  }

  private ovniSchedule(): void {
    if (!this.ovniActive() || !this.ovniAlive()) return;
    const temp = this.temperatureC();
    const base = this.circadian() === 'night' ? 950 : 680;
    const ms = base + Math.abs(temp - 25) * 12;
    this.ovniTimer = setTimeout(() => this.ovniStep(), ms);
  }

  private ovniStep(): void {
    if (!this.ovniActive() || !this.ovniAlive()) return;
    if (this.busy()) {
      this.ovniSchedule();
      return;
    }
    const life = this.ovniLife();
    const form = life?.form ?? 'adult';
    // Œuf / nymphe : développement sans LIF moteur (métamorphose)
    if (form === 'egg' || form === 'pupa' || form === 'dead') {
      this.science.ovniAdvance({ state: life }).subscribe({
        next: (res) => {
          this.applyOvniLifePayload(res);
          this.ovniTick.update((t) => t + 1);
          this.ovniLog.update((log) => [
            `métamorphose · ${String(res['stage'])} · âge ${String(res['age_ticks'])}`,
            ...log.slice(0, 6),
          ]);
          if (!res['alive'] || res['stage'] === 'dead') {
            this.ovniAlive.set(false);
            this.ovniActive.set(false);
            this.status.set('O.V.N.I. — fin de cycle (mort)');
            return;
          }
          this.ovniSchedule();
        },
        error: () => this.ovniSchedule(),
      });
      return;
    }

    this.ovniSpawnStimuli();
    this.hunger.set(Math.min(1, Math.max(0, 1 - this.ovniEnergy())));
    this.busy.set(true);
    this.seed.update((s) => s + 1);
    const req = this.buildRequest();
    const gain = life?.lif_gain ?? 1;
    req.sugar = (req.sugar ?? 0) * gain;
    req.bitter = (req.bitter ?? 0) * gain;
    req.looming = (req.looming ?? 0) * gain;
    if (this.ovniEchelle() === 'argon') {
      req.param_overrides = { ...(req.param_overrides || {}), dt_ms: 0.05 };
    }
    this.science.stimulate(req).subscribe({
      next: (run) => {
        this.ovniLastRun.set(run);
        this.ovniTick.update((t) => t + 1);
        this.applyOvniPhysics(run.action);
        // Avance cycle de vie en parallèle
        this.science
          .ovniAdvance({
            state: {
              ...this.ovniLife(),
              energy: this.ovniEnergy(),
            },
          })
          .subscribe({ next: (res) => this.applyOvniLifePayload(res) });
        const stage = this.ovniLife()?.stage ?? 'adult';
        this.ovniLog.update((log) =>
          [
            `pas ${this.ovniTick()} · ${stage} · ${actionFrEn(run.action)} · LIF`,
            ...log.slice(0, 6),
          ],
        );
        this.status.set(
          `O.V.N.I. ${stage} · ${actionFrEn(run.action)} · ${this.ovniEchelle()}`,
        );
        this.busy.set(false);
        if (this.ovniEnergy() <= 0.02 || this.ovniLife()?.stage === 'dead') {
          this.ovniAlive.set(false);
          this.ovniActive.set(false);
          this.status.set('O.V.N.I. — mort (réinitialisez / renaissez)');
          return;
        }
        this.ovniSchedule();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        this.ovniSchedule();
      },
    });
  }

  private ovniSpawnStimuli(): void {
    let s = this.sugar();
    let b = this.bitter();
    let l = this.looming();
    s = Math.max(0, s - 0.08);
    b = Math.max(0, b - 0.05);
    l = Math.max(0, l - 0.14);
    const roll = Math.random();
    const food = { ...this.ovniFood() };
    if (roll < 0.27) {
      s = Math.max(s, 0.42 + Math.random() * 0.52);
      food.x = (Math.random() - 0.5) * 6.5;
      food.z = (Math.random() - 0.5) * 6.5;
      food.sugar = s;
      if (Math.random() < 0.24) {
        b = Math.max(b, 0.32 + Math.random() * 0.48);
        food.bitter = b;
      }
    } else if (roll < 0.4) {
      l = Math.max(l, 0.52 + Math.random() * 0.42);
    } else if (roll < 0.5) {
      b = Math.max(b, 0.38 + Math.random() * 0.5);
    }
    this.sugar.set(Math.min(1, s));
    this.bitter.set(Math.min(1, b));
    this.looming.set(Math.min(1, l));
    food.sugar = s;
    food.bitter = b;
    this.ovniFood.set(food);
  }

  private applyOvniPhysics(action: string): void {
    const fly = { ...this.ovniFly() };
    const food = { ...this.ovniFood() };
    let energy = this.ovniEnergy();
    const looming = this.looming();
    const sugar = this.sugar();
    const bitter = this.bitter();
    const mob = this.ovniLife()?.mobility ?? 1;
    energy -= 0.028 * (this.ovniLife()?.stage === 'senescence' ? 1.35 : 1);

    let intent: 'walk' | 'feed' | 'escape' | 'groom' | 'explore' = 'walk';
    let driftX = 0;
    let driftZ = 0;
    let turnRate = 0;

    if (action === 'ESCAPE') {
      energy -= 0.06;
      intent = 'escape';
      const away = Math.atan2(fly.x - food.x * 0.2, fly.z - food.z * 0.2) + (Math.random() - 0.5) * 0.35;
      fly.heading = away;
      const jump = 1.05 + looming * 0.5;
      fly.x += Math.sin(away) * jump;
      fly.z += Math.cos(away) * jump;
      driftX = Math.sin(away) * 2.4;
      driftZ = Math.cos(away) * 2.4;
      turnRate = 0.12;
      if (looming > 0.45) this.looming.set(Math.max(0, looming - 0.35));
    } else if (action === 'EAT') {
      intent = 'feed';
      if (looming > 0.55) {
        energy = 0;
        this.ovniAlive.set(false);
      } else if (sugar > 0.05 && bitter < 0.42) {
        energy = Math.min(1, energy + 0.12 + sugar * 0.2);
        const dx = food.x - fly.x;
        const dz = food.z - fly.z;
        const dist = Math.hypot(dx, dz) || 1;
        fly.heading = Math.atan2(dx, dz);
        const step = Math.min(0.55, dist * 0.55);
        fly.x += (dx / dist) * step;
        fly.z += (dz / dist) * step;
        driftX = (dx / dist) * 0.45;
        driftZ = (dz / dist) * 0.45;
        turnRate = 0.04;
        if (dist < 0.35) {
          this.sugar.set(Math.max(0, sugar - 0.42));
          food.sugar = this.sugar();
        }
      } else {
        intent = 'explore';
        fly.heading += (Math.random() - 0.5) * 0.5;
        fly.x += Math.sin(fly.heading) * 0.18;
        fly.z += Math.cos(fly.heading) * 0.18;
        driftX = Math.sin(fly.heading) * 0.35;
        driftZ = Math.cos(fly.heading) * 0.35;
      }
    } else {
      if (Math.random() < 0.12) {
        intent = 'groom';
        driftX = 0;
        driftZ = 0;
        turnRate = (Math.random() - 0.5) * 0.02;
      } else if (sugar > 0.35 && bitter < 0.35) {
        intent = 'explore';
        const dx = food.x - fly.x;
        const dz = food.z - fly.z;
        const dist = Math.hypot(dx, dz) || 1;
        fly.heading = fly.heading * 0.7 + Math.atan2(dx, dz) * 0.3;
        fly.x += Math.sin(fly.heading) * 0.22;
        fly.z += Math.cos(fly.heading) * 0.22;
        driftX = Math.sin(fly.heading) * 0.55;
        driftZ = Math.cos(fly.heading) * 0.55;
      } else {
        intent = 'walk';
        fly.heading += (Math.random() - 0.5) * 0.65;
        const step = 0.14 + Math.random() * 0.12;
        fly.x += Math.sin(fly.heading) * step;
        fly.z += Math.cos(fly.heading) * step;
        driftX = Math.sin(fly.heading) * 0.42;
        driftZ = Math.cos(fly.heading) * 0.42;
        turnRate = (Math.random() - 0.5) * 0.03;
      }
    }

    if (looming > 0.72 && action !== 'ESCAPE' && Math.random() < 0.32) {
      energy = 0;
      this.ovniAlive.set(false);
    }

    // Mobilité selon stade (larve lente, adulte plein, sénescence réduite)
    driftX *= mob;
    driftZ *= mob;
    turnRate *= mob;
    if (mob < 0.05) {
      intent = 'groom';
      driftX = 0;
      driftZ = 0;
    }

    fly.x = Math.max(-4.6, Math.min(4.6, fly.x));
    fly.z = Math.max(-4.6, Math.min(4.6, fly.z));
    this.ovniFly.set(fly);
    this.ovniFood.set(food);
    this.ovniEnergy.set(Math.max(0, Math.min(1, energy)));
    this.ovniMotion.set({ intent, driftX, driftZ, turnRate });
  }

  private buildOvniVisual(): LabVisual {
    const run = this.ovniLastRun();
    const sugar = this.sugar();
    const bitter = this.bitter();
    const looming = this.looming();
    const hunger = this.hunger();
    const fly = this.ovniFly();
    const food = this.ovniFood();
    const action = run?.action ?? (looming > 0.4 ? 'ESCAPE' : sugar > 0.5 && bitter < 0.4 ? 'EAT' : 'IDLE');
    const atlas = this.atlas();
    const neuronScale = atlas?.neuron_count ?? atlas?.neurons?.length ?? 0;
    const brain = run
      ? `O.V.N.I. LIF · ${neuronScale} neurones (atlas) · ${this.brainLine(run)}`
      : `O.V.N.I. — en attente du premier pas LIF (${neuronScale} neurones atlas)`;

    const base = this.withSceneAndCohort({
      sugar,
      bitter,
      looming,
      hunger,
      action,
      decisionMs: run?.decision_ms ?? null,
      ratesHz: run?.rates_hz ?? {},
      runId: run?.run_card.run_id ?? null,
      seed: this.seed(),
      shuffle: this.shuffle(),
      source: 'ovni',
      alive: this.ovniAlive(),
      energy: this.ovniEnergy(),
      fly,
      food: {
        x: food.x,
        z: food.z,
        sugar: Math.max(sugar, food.sugar),
        bitter,
      },
      threat: { active: looming > 0.12, looming },
      brain,
      outcome: this.ovniAlive()
        ? `${this.ovniLife()?.stage ?? 'adulte'} · ${this.ovniEchelle()} · pas ${this.ovniTick()} · ${(this.ovniEnergy() * 100).toFixed(0)} %`
        : 'O.V.N.I. mort / arrêté',
    });
    const motion = this.ovniMotion();
    const life = this.ovniLife();
    return {
      ...base,
      autonomous: true,
      motion,
      ovni: {
        tick: this.ovniTick(),
        charter: InstrumentStore.OVNI_CHARTER.acronym,
        neuronScale,
      },
      phenotype: {
        ...this.geneticsPhenotype(),
        life_form: life?.form ?? 'adult',
        life_stage: life?.stage ?? 'adult',
        mesh_scale: life?.mesh_scale ?? 1,
        mobility: life?.mobility ?? 1,
      },
    };
  }
}
