import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InstrumentStore } from '../../core/instrument.store';
import { AdaptersDoc, ScienceService } from '../../core/science.service';

@Component({
  selector: 'app-rules',
  imports: [FormsModule],
  templateUrl: './rules.html',
  styleUrl: './rules.css',
})
export class RulesPage implements OnInit {
  private readonly science = inject(ScienceService);
  private readonly instrument = inject(InstrumentStore);

  readonly doc = signal<AdaptersDoc | null>(null);
  readonly status = signal('');
  readonly error = signal('');
  readonly busy = signal(false);

  // editable knobs
  version = '';
  notes = '';
  priorityCsv = '';

  bitterSuppresses = true;
  bitterGate = 0.45;
  bitterScale = 0.12;
  shuffleKeep = 0.2;
  synStrength = 8;
  synTau = 5;

  dt = 0.1;
  duration = 500;
  vRest = -65;
  vReset = -70;
  vThresh = -50;
  tau = 20;
  rMohm = 10;
  refractory = 2;

  sugarRate = 100;
  sugarHungerGain = 1.4;
  bitterRate = 100;
  loomingRate = 80;
  escapeWindow = 50;
  eatCount = 3;
  eatWindow = 80;

  rawJson = '';
  showRaw = false;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.error.set('');
    this.science.adapters().subscribe({
      next: (d) => {
        this.doc.set(d);
        this.fromDoc(d);
      },
      error: (e) => this.error.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  save(): void {
    const base = this.doc();
    if (!base) return;
    this.busy.set(true);
    this.error.set('');
    const body = this.toDoc(base);
    this.science.saveAdapters(body).subscribe({
      next: (d) => {
        this.doc.set(d);
        this.fromDoc(d);
        this.instrument.adapters.set(d);
        this.busy.set(false);
        this.status.set(
          `Règles enregistrées · empreinte ${d._meta?.hash || '?'} · Labo 3D synchronisé`,
        );
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
      },
    });
  }

  saveRaw(): void {
    try {
      const parsed = JSON.parse(this.rawJson) as AdaptersDoc;
      this.busy.set(true);
      this.science.saveAdapters(parsed).subscribe({
        next: (d) => {
          this.doc.set(d);
          this.fromDoc(d);
          this.instrument.adapters.set(d);
          this.busy.set(false);
          this.status.set('JSON des adaptateurs enregistré');
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
    } catch (err) {
      this.error.set(`JSON invalide : ${err}`);
    }
  }

  reset(): void {
    this.busy.set(true);
    this.science.resetAdapters().subscribe({
      next: (d) => {
        this.doc.set(d);
        this.fromDoc(d);
        this.instrument.adapters.set(d);
        this.busy.set(false);
        this.status.set('Réglages d’usine restaurés');
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.message || e.message || e));
      },
    });
  }

  private fromDoc(d: AdaptersDoc): void {
    this.version = d.version;
    this.notes = d.notes || '';
    this.priorityCsv = (d.priority || []).join(', ');
    const pol = d.policies || {};
    this.bitterSuppresses = Boolean(pol['bitter_suppresses_sugar'] ?? true);
    this.bitterGate = Number(pol['bitter_gate_threshold'] ?? 0.45);
    this.bitterScale = Number(pol['bitter_sugar_scale'] ?? 0.12);
    this.shuffleKeep = Number(pol['shuffle_keep_fraction'] ?? 0.2);
    this.synStrength = Number(pol['syn_strength'] ?? 8);
    this.synTau = Number(pol['syn_tau_ms'] ?? 5);
    const p = d.parameters || {};
    this.dt = Number(p['dt_ms'] ?? 0.1);
    this.duration = Number(p['duration_ms'] ?? 500);
    this.vRest = Number(p['v_rest'] ?? -65);
    this.vReset = Number(p['v_reset'] ?? -70);
    this.vThresh = Number(p['v_thresh'] ?? -50);
    this.tau = Number(p['tau_ms'] ?? 20);
    this.rMohm = Number(p['r_mohm'] ?? 10);
    this.refractory = Number(p['refractory_ms'] ?? 2);
    const sugar = (d.inputs?.['sugar'] || {}) as Record<string, number>;
    const bitter = (d.inputs?.['bitter'] || {}) as Record<string, number>;
    const looming = (d.inputs?.['looming'] || {}) as Record<string, number>;
    this.sugarRate = Number(sugar['max_rate_hz'] ?? 100);
    this.sugarHungerGain = Number(sugar['gain_by_hunger'] ?? 1.4);
    this.bitterRate = Number(bitter['max_rate_hz'] ?? 100);
    this.loomingRate = Number(looming['max_rate_hz'] ?? 80);
    const esc = (d.readouts?.['ESCAPE'] || {}) as Record<string, number>;
    const eat = (d.readouts?.['EAT'] || {}) as Record<string, number>;
    this.escapeWindow = Number(esc['window_ms'] ?? 50);
    this.eatCount = Number(eat['count'] ?? 3);
    this.eatWindow = Number(eat['window_ms'] ?? 80);
    const clone = { ...d };
    delete (clone as { _meta?: unknown })._meta;
    this.rawJson = JSON.stringify(clone, null, 2);
  }

  private toDoc(base: AdaptersDoc): AdaptersDoc {
    const inputs = structuredClone(base.inputs || {});
    const sugar = (inputs['sugar'] || {}) as Record<string, unknown>;
    sugar['max_rate_hz'] = this.sugarRate;
    sugar['gain_by_hunger'] = this.sugarHungerGain;
    inputs['sugar'] = sugar;
    const bitter = (inputs['bitter'] || {}) as Record<string, unknown>;
    bitter['max_rate_hz'] = this.bitterRate;
    inputs['bitter'] = bitter;
    const looming = (inputs['looming'] || {}) as Record<string, unknown>;
    looming['max_rate_hz'] = this.loomingRate;
    inputs['looming'] = looming;

    const readouts = structuredClone(base.readouts || {});
    const esc = (readouts['ESCAPE'] || {}) as Record<string, unknown>;
    esc['window_ms'] = this.escapeWindow;
    readouts['ESCAPE'] = esc;
    const eat = (readouts['EAT'] || {}) as Record<string, unknown>;
    eat['count'] = this.eatCount;
    eat['window_ms'] = this.eatWindow;
    readouts['EAT'] = eat;

    return {
      version: this.version || 'custom',
      dataset_claim: base.dataset_claim,
      notes: this.notes,
      inputs,
      policies: {
        ...(base.policies || {}),
        bitter_suppresses_sugar: this.bitterSuppresses,
        bitter_gate_threshold: this.bitterGate,
        bitter_sugar_scale: this.bitterScale,
        shuffle_keep_fraction: this.shuffleKeep,
        syn_strength: this.synStrength,
        syn_tau_ms: this.synTau,
      },
      readouts,
      priority: this.priorityCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      parameters: {
        dt_ms: this.dt,
        duration_ms: this.duration,
        v_rest: this.vRest,
        v_reset: this.vReset,
        v_thresh: this.vThresh,
        tau_ms: this.tau,
        r_mohm: this.rMohm,
        refractory_ms: this.refractory,
      },
    };
  }
}
