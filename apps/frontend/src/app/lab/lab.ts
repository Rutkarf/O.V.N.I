import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InstrumentStore } from '../core/instrument.store';
import { findBrain, findMotif } from '../organism-select/hybrid-composition';
import { findOrganism } from '../organism-select/organism-catalog';
import { actionFr } from '../core/labels';
import { SimService } from '../core/sim.service';
import { SimState } from '../core/sim.models';
import { GeneticsPanel } from './genetics-panel';
import { Viewport } from './viewport/viewport';
import { VoixTerminalPage } from '../science/voix-terminal/voix-terminal';

type CockpitTab = 'guide' | 'stim' | 'brain' | 'rules' | 'compare' | 'sweep' | 'life' | 'genetics';

@Component({
  selector: 'app-lab',
  imports: [FormsModule, Viewport, GeneticsPanel, DecimalPipe, RouterLink, VoixTerminalPage],
  templateUrl: './lab.html',
  styleUrl: './lab.css',
})
export class Lab implements OnInit, OnDestroy {
  @ViewChild(Viewport) private viewport?: Viewport;
  readonly store = inject(InstrumentStore);
  readonly ovniCharter = InstrumentStore.OVNI_CHARTER;
  readonly connectomeClaim = InstrumentStore.CONNECTOME_CLAIM;
  private readonly sim = inject(SimService);

  exitLabFocus(): void {
    this.viewport?.exitFocus();
  }

  compositionMotifLabel(): string {
    return findMotif(this.store.selectedMotifId())?.name || this.store.selectedMotifId();
  }

  compositionBrainLabel(): string {
    return findBrain(this.store.selectedBrainAtlasId())?.name || this.store.selectedBrainAtlasId();
  }

  compositionMotifCount(): number {
    return findMotif(this.store.selectedMotifId())?.neuronCount ?? 0;
  }

  compositionBrainCount(): string {
    const n = findBrain(this.store.selectedBrainAtlasId())?.proxyCount ?? 0;
    return n.toLocaleString('fr-FR');
  }

  compositionVncNote(): string {
    return this.store.selectedBrainAtlasId() === 'malecns_brain_vnc_2026'
      ? ' · cerveau + chaîne ventrale'
      : ' · sans chaîne ventrale';
  }

  taxonLine(): string {
    const t = findOrganism(this.store.selectedOrganismId())?.taxonomy;
    if (!t) return '';
    return [t.regne, t.embranchement, t.classe, t.ordre, t.famille, t.genre, t.espece].join(' › ');
  }

  motifDetail(): string {
    const m = findMotif(this.store.selectedMotifId());
    if (!m) return '';
    return `${m.subtitle} — ${m.sourceSpecies} · ${m.neuronCount} neurones · ${m.edgeCount} synapses · ${m.mesh} · ${this.statusFr(m.status)}`;
  }

  brainDetail(): string {
    const b = findBrain(this.store.selectedBrainAtlasId());
    if (!b) return '';
    const vnc =
      b.key === 'malecns_brain_vnc_2026' ? 'cerveau + chaîne ventrale' : 'sans chaîne ventrale';
    return `${b.subtitle} — ${b.sourceSpecies} · ${b.proxyCount.toLocaleString('fr-FR')} · ${b.mesh} · ${vnc} · ${this.statusFr(b.status)}`;
  }

  private statusFr(status: string): string {
    if (status === 'ready') return 'Prêt';
    if (status === 'locked') return 'CoL';
    return 'Teaser';
  }

  readonly tab = signal<CockpitTab>('guide');
  readonly lifeState = signal<SimState | null>(null);
  readonly lifePending = signal(false);
  lifeMode = 'rules';
  private lifeAuto = false;
  private lifeTimer: ReturnType<typeof setTimeout> | null = null;

  bitterGate = 0.45;
  synStrength = 8;
  bitterSuppress = true;

  ngOnInit(): void {
    this.store.loadAtlas();
    this.store.loadAdapters();
    // session partagée via #demo=…
    queueMicrotask(() => this.store.applyDemoFromLocation());
    this.sim.state().subscribe({
      next: (s) => {
        this.lifeState.set(s);
        this.lifeMode = s.mode;
      },
    });
  }

  ngOnDestroy(): void {
    this.lifeAuto = false;
    if (this.lifeTimer) clearTimeout(this.lifeTimer);
    this.store.stopOvni();
  }

  toggleOvni(): void {
    this.store.toggleOvni();
    if (this.store.ovniActive()) {
      this.tab.set('life');
    }
  }

  setTab(t: CockpitTab): void {
    this.tab.set(t);
    if (t === 'rules' || t === 'compare') {
      const a = this.store.adapters();
      if (a?.policies) {
        this.bitterGate = Number(a.policies['bitter_gate_threshold'] ?? 0.45);
        this.synStrength = Number(a.policies['syn_strength'] ?? 8);
        this.bitterSuppress = Boolean(a.policies['bitter_suppresses_sugar'] ?? true);
      } else {
        this.store.loadAdapters();
      }
    }
  }

  run(): void {
    this.store.compareFocus.set('live');
    this.store.runLif();
    this.store.guideStep.set(Math.max(this.store.guideStep(), 2));
  }

  preset(kind: 'escape' | 'eat' | 'bitter'): void {
    this.store.compareFocus.set('live');
    this.store.preset(kind);
    this.store.guideStep.set(Math.max(this.store.guideStep(), 1));
  }

  exportMethods(): void {
    this.store.fetchMethods();
    this.store.downloadMethods();
    this.store.guideStep.set(3);
  }

  savePolicies(): void {
    this.store.applyPolicies({
      bitter_gate_threshold: this.bitterGate,
      syn_strength: this.synStrength,
      bitter_suppresses_sugar: this.bitterSuppress,
    });
  }

  /** Appliquer règle puis lancer B pour A/B. */
  applyRuleThenB(): void {
    this.store.applyPolicies(
      {
        bitter_gate_threshold: this.bitterGate,
        syn_strength: this.synStrength,
        bitter_suppresses_sugar: this.bitterSuppress,
      },
      false,
      () => this.store.runAsB(),
    );
  }

  dose(channel: 'looming' | 'sugar' | 'bitter'): void {
    this.store.quickDose(channel);
  }

  lifeTick(): void {
    if (this.lifePending()) return;
    this.lifePending.set(true);
    this.sim.tick(this.lifeMode).subscribe({
      next: (s) => {
        this.lifeState.set(s);
        this.lifePending.set(false);
        this.store.setKnobs({
          sugar: s.sensors.sugar,
          bitter: s.sensors.bitter,
          looming: s.sensors.looming,
          hunger: s.sensors.hunger,
        });
        if (this.lifeAuto && s.alive) {
          this.lifeTimer = setTimeout(
            () => this.lifeTick(),
            s.mode === 'fruitfly' ? 800 : 650,
          );
        } else {
          this.lifeAuto = false;
        }
      },
      error: () => {
        this.lifePending.set(false);
        this.lifeAuto = false;
      },
    });
  }

  toggleLifeAuto(): void {
    this.lifeAuto = !this.lifeAuto;
    if (this.lifeAuto) this.lifeTick();
    else if (this.lifeTimer) clearTimeout(this.lifeTimer);
  }

  get lifeAutoLabel(): string {
    return this.lifeAuto ? 'Arrêter' : 'Automatique';
  }

  lifeReset(): void {
    this.lifeAuto = false;
    this.sim.reset(this.lifeMode).subscribe({
      next: (s) => this.lifeState.set(s),
    });
  }

  changeLifeMode(): void {
    this.sim.setMode(this.lifeMode).subscribe({
      next: (s) => this.lifeState.set(s),
    });
  }

  actionLabel(code: string): string {
    return actionFr(code);
  }
}
