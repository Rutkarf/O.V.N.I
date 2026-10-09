import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InstrumentStore } from '../../core/instrument.store';
import { actionFrEn, motifFr } from '../../core/labels';
import { Atlas, RunResult, ScienceService } from '../../core/science.service';

@Component({
  selector: 'app-experiment',
  imports: [FormsModule],
  templateUrl: './experiment.html',
  styleUrl: './experiment.css',
})
export class ExperimentPage implements OnInit, AfterViewInit {
  private readonly science = inject(ScienceService);
  private readonly instrument = inject(InstrumentStore);

  @ViewChild('raster') rasterRef!: ElementRef<HTMLCanvasElement>;

  readonly atlas = signal<Atlas | null>(null);
  readonly result = signal<RunResult | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly validation = signal('');
  readonly motifs = signal<{ id: string; nom: string; niveau: string }[]>([]);

  sugar = 0;
  bitter = 0;
  looming = 0;
  hunger = 0.5;
  seed = 7;
  silence = '';
  shuffle = false;
  neuronId = '';
  neuronHz = 0;
  durationMs = 500;
  motifId = 'escape_feed_v1';
  bruit = 0;
  plasticite = false;
  optoClasse = '';
  optoHz = 40;
  showAdvanced = false;
  ovSynStrength: number | null = null;
  ovSynTau: number | null = null;
  ovVThresh: number | null = null;
  ovBitterGate: number | null = null;
  ovBitterSuppress: boolean | null = null;

  ngOnInit(): void {
    // sync knobs from shared instrument (Lab 3D / autres pages)
    this.sugar = this.instrument.sugar();
    this.bitter = this.instrument.bitter();
    this.looming = this.instrument.looming();
    this.hunger = this.instrument.hunger();
    this.seed = this.instrument.seed();
    this.durationMs = this.instrument.durationMs();
    this.silence = this.instrument.silence();
    this.shuffle = this.instrument.shuffle();
    const last = this.instrument.lastRun();
    if (last) {
      this.result.set(last);
    }
    this.science.motifs().subscribe({
      next: (m) => {
        this.motifs.set(
          (m.motifs || []).map((x) => ({
            ...x,
            nom: x.nom || motifFr(x.id),
          })),
        );
        this.motifId = m.motif_actif || this.motifId;
      },
    });
    this.rechargerAtlas();
  }

  rechargerAtlas(): void {
    this.science.atlas().subscribe({
      next: (a) => {
        this.atlas.set(a);
        if (a.neurons.length) this.neuronId = a.neurons[0].id;
      },
      error: (e) => this.error.set(String(e?.error?.message || e.message || e)),
    });
  }

  changerMotif(id: string): void {
    this.busy.set(true);
    this.science.selectionnerMotif(id).subscribe({
      next: () => {
        this.motifId = id;
        this.rechargerAtlas();
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(String(e?.error?.message || e.message || e));
        this.busy.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.drawRaster(this.result());
  }

  run(): void {
    this.busy.set(true);
    this.error.set('');
    const body: Record<string, unknown> = {
      sugar: this.sugar,
      bitter: this.bitter,
      looming: this.looming,
      hunger: this.hunger,
      seed: this.seed,
      duration_ms: this.durationMs,
      shuffle_edges: this.shuffle,
      silence: this.silence
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      bruit_synaptique: this.bruit,
      plasticite_courte: this.plasticite,
    };
    if (this.optoClasse.trim()) {
      body['opto'] = { classe: this.optoClasse.trim(), hz: this.optoHz };
    }
    const paramOverrides: Record<string, number> = {};
    if (this.ovSynStrength != null) paramOverrides['syn_strength'] = this.ovSynStrength;
    if (this.ovSynTau != null) paramOverrides['syn_tau_ms'] = this.ovSynTau;
    if (this.ovVThresh != null) paramOverrides['v_thresh'] = this.ovVThresh;
    if (Object.keys(paramOverrides).length) body['param_overrides'] = paramOverrides;
    const policyOverrides: Record<string, unknown> = {};
    if (this.ovBitterGate != null) policyOverrides['bitter_gate_threshold'] = this.ovBitterGate;
    if (this.ovBitterSuppress != null)
      policyOverrides['bitter_suppresses_sugar'] = this.ovBitterSuppress;
    if (Object.keys(policyOverrides).length) body['policy_overrides'] = policyOverrides;
    if (this.neuronHz > 0 && this.neuronId) {
      body['neuron_rates'] = { [this.neuronId]: this.neuronHz };
      body['sugar'] = 0;
      body['bitter'] = 0;
      body['looming'] = 0;
    }
    this.instrument.setKnobs({
      sugar: this.sugar,
      bitter: this.bitter,
      looming: this.looming,
      hunger: this.hunger,
      seed: this.seed,
      durationMs: this.durationMs,
      silence: this.silence,
      shuffle: this.shuffle,
    });
    this.science.stimulate(body as never).subscribe({
      next: (r) => {
        this.result.set(r);
        this.instrument.ingestRun(r);
        this.busy.set(false);
        this.drawRaster(r);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.message || e.message || e));
      },
    });
  }

  preset(kind: 'escape' | 'eat' | 'bitter'): void {
    this.neuronHz = 0;
    if (kind === 'escape') {
      this.looming = 0.9;
      this.sugar = 0;
      this.bitter = 0;
      this.hunger = 0;
    } else if (kind === 'eat') {
      this.looming = 0;
      this.sugar = 0.9;
      this.bitter = 0;
      this.hunger = 0.8;
    } else {
      this.looming = 0;
      this.sugar = 0.9;
      this.bitter = 0.8;
      this.hunger = 0.8;
    }
    this.run();
  }

  actionLabel(code: string): string {
    return actionFrEn(code);
  }

  runValidate(): void {
    this.science.validate().subscribe({
      next: (v) =>
        this.validation.set(
          v.passed ? 'TESTS RÉUSSIS — motif reproductible' : 'TESTS ÉCHOUÉS',
        ),
      error: (e) => this.validation.set(String(e?.error?.message || e.message || e)),
    });
  }

  downloadSpikes(id: string): void {
    this.science.downloadSpikes(id);
  }

  downloadMethods(id: string): void {
    this.science.downloadMethods(id);
  }

  private drawRaster(result: RunResult | null): void {
    const canvas = this.rasterRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const h = (canvas.height = Math.max(280, canvas.clientHeight) * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const cssW = w / devicePixelRatio;
    const cssH = h / devicePixelRatio;
    ctx.fillStyle = '#070d0b';
    ctx.fillRect(0, 0, cssW, cssH);

    if (!result) {
      ctx.fillStyle = '#6f887e';
      ctx.font = '12px Roboto';
      ctx.fillText('raster — lancez une stimulation', 16, 28);
      return;
    }

    const neurons = Object.keys(result.spikes).filter((n) => result.spikes[n].length);
    const rows = Math.max(neurons.length, 1);
    const top = 28;
    const rowH = (cssH - top - 16) / rows;
    const duration = result.run_card.params['duration_ms'] || 500;

    ctx.strokeStyle = 'rgba(57,255,155,0.08)';
    for (let i = 0; i < rows; i++) {
      const y = top + i * rowH;
      ctx.beginPath();
      ctx.moveTo(120, y + rowH);
      ctx.lineTo(cssW - 12, y + rowH);
      ctx.stroke();
    }

    neurons.forEach((nid, i) => {
      const y = top + i * rowH + rowH * 0.5;
      ctx.fillStyle = '#6f887e';
      ctx.font = '11px Roboto';
      ctx.fillText(nid, 10, y + 4);
      ctx.strokeStyle = '#39ff9b';
      for (const t of result.spikes[nid]) {
        const x = 120 + (t / duration) * (cssW - 140);
        ctx.beginPath();
        ctx.moveTo(x, y - rowH * 0.28);
        ctx.lineTo(x, y + rowH * 0.28);
        ctx.stroke();
      }
    });

    if (result.decision_ms != null) {
      const x = 120 + (result.decision_ms / duration) * (cssW - 140);
      ctx.strokeStyle = '#ff3d6e';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, cssH - 10);
      ctx.stroke();
      ctx.fillStyle = '#ff3d6e';
      ctx.fillText(`${result.action} @ ${result.decision_ms.toFixed(1)}ms`, x + 4, top - 8);
    }
  }
}
