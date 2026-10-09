import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InstrumentStore } from '../../core/instrument.store';
import { actionFrEn } from '../../core/labels';
import { DoseCurveRow, ScienceService } from '../../core/science.service';

@Component({
  selector: 'app-batch',
  imports: [FormsModule, DecimalPipe, KeyValuePipe],
  templateUrl: './batch.html',
  styleUrl: './batch.css',
})
export class BatchPage {
  private readonly science = inject(ScienceService);
  private readonly instrument = inject(InstrumentStore);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly dose = signal<DoseCurveRow[] | null>(null);
  readonly batchSummary = signal<Record<string, number> | null>(null);
  readonly batchN = signal(0);

  // dose-response
  channel: 'looming' | 'sugar' | 'bitter' | 'hunger' = 'looming';
  levelsCsv = '0,0.25,0.5,0.75,1';
  repeats = 5;
  baseSeed = 42;
  holdSugar = 0;
  holdBitter = 0;
  holdLooming = 0;
  holdHunger = 0;
  shuffle = false;

  // batch factorial sugar × bitter
  factorSugar = true;
  factorBitter = true;
  factorLooming = false;
  factorHunger = 0.8;

  // compare
  compareIds = '';
  readonly compareRows = signal<unknown[] | null>(null);

  runDose(): void {
    this.busy.set(true);
    this.error.set('');
    const levels = this.levelsCsv
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    this.science
      .doseResponse({
        channel: this.channel,
        levels,
        repeats: this.repeats,
        sugar: this.holdSugar,
        bitter: this.holdBitter,
        looming: this.holdLooming,
        hunger: this.holdHunger,
        base_seed: this.baseSeed,
        shuffle_edges: this.shuffle,
      })
      .subscribe({
        next: (r) => {
          this.dose.set(r.curve);
          this.busy.set(false);
          const last = r.curve[r.curve.length - 1];
          if (last?.run_ids?.length) {
            this.science.run(last.run_ids[last.run_ids.length - 1]).subscribe({
              next: (run) => this.instrument.ingestRun(run),
            });
          }
          this.instrument.doseSummary.set(
            `${r.channel}: ` +
              r.curve.map((c) => `${c.level}→E${c.p_escape.toFixed(1)}`).join(' · '),
          );
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
        },
      });
  }

  runFactorial(): void {
    const trials: Record<string, number>[] = [];
    const sugars = this.factorSugar ? [0, 0.9] : [this.holdSugar];
    const bitters = this.factorBitter ? [0, 0.8] : [this.holdBitter];
    const loomings = this.factorLooming ? [0, 0.9] : [this.holdLooming];
    for (const sugar of sugars) {
      for (const bitter of bitters) {
        for (const looming of loomings) {
          trials.push({
            sugar,
            bitter,
            looming,
            hunger: this.factorHunger,
          });
        }
      }
    }
    this.busy.set(true);
    this.error.set('');
    this.science.batch(trials, this.baseSeed).subscribe({
      next: (r) => {
        this.batchSummary.set(r.action_counts);
        this.batchN.set(r.n);
        this.busy.set(false);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
      },
    });
  }

  runCompare(): void {
    const ids = this.compareIds
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length < 2) {
      this.error.set('Il faut au moins 2 identifiants d’essais');
      return;
    }
    this.busy.set(true);
    this.science.compare(ids).subscribe({
      next: (r) => {
        this.compareRows.set(r.runs);
        this.busy.set(false);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(String(e?.error?.error || e?.error?.message || e.message || e));
      },
    });
  }

  barWidth(p: number): string {
    return `${Math.round(p * 100)}%`;
  }

  actionLabel(code: string): string {
    return actionFrEn(code);
  }

  channelLabel(channel: string): string {
    switch (channel) {
      case 'looming':
        return 'menace';
      case 'sugar':
        return 'sucre';
      case 'bitter':
        return 'amer';
      case 'hunger':
        return 'faim';
      default:
        return channel;
    }
  }

  exportSvg(): void {
    const curve = this.dose();
    if (!curve?.length) {
      this.error.set('Lancez d’abord une dose-réponse');
      return;
    }
    const w = 720;
    const h = 420;
    const pad = { l: 56, r: 24, t: 40, b: 48 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const xs = curve.map((c) => c.level);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const xOf = (v: number) => pad.l + ((v - minX) / (maxX - minX || 1)) * iw;
    const yOf = (p: number) => pad.t + (1 - p) * ih;
    const poly = (key: 'p_escape' | 'p_eat' | 'p_idle', color: string) => {
      const pts = curve.map((c) => `${xOf(c.level)},${yOf(c[key])}`).join(' ');
      return `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${pts}" />`;
    };
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#0b1210"/>
  <text x="${pad.l}" y="24" fill="#39ff9b" font-family="Roboto, sans-serif" font-size="14">
    Dose-réponse — ${this.channelLabel(this.channel)} (n=${this.repeats}/niveau)
  </text>
  <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + ih}" stroke="#3a4a42"/>
  <line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="#3a4a42"/>
  ${poly('p_escape', '#ff3d6e')}
  ${poly('p_eat', '#ffc857')}
  ${poly('p_idle', '#6f887e')}
  <text x="${pad.l}" y="${h - 14}" fill="#6f887e" font-family="Roboto, sans-serif" font-size="11">niveau</text>
  <text x="${w - 200}" y="24" fill="#ff3d6e" font-size="11">Fuite</text>
  <text x="${w - 140}" y="24" fill="#ffc857" font-size="11">Alimentation</text>
  <text x="${w - 40}" y="24" fill="#6f887e" font-size="11">Repos</text>
</svg>`;
    this.downloadBlob(svg, `dose-${this.channel}.svg`, 'image/svg+xml');
  }

  exportPng(): void {
    const curve = this.dose();
    if (!curve?.length) {
      this.error.set('Lancez d’abord une dose-réponse');
      return;
    }
    const w = 720;
    const h = 420;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pad = { l: 56, r: 24, t: 40, b: 48 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const xs = curve.map((c) => c.level);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const xOf = (v: number) => pad.l + ((v - minX) / (maxX - minX || 1)) * iw;
    const yOf = (p: number) => pad.t + (1 - p) * ih;

    ctx.fillStyle = '#0b1210';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#39ff9b';
    ctx.font = '14px Roboto, sans-serif';
    ctx.fillText(
      `Dose-réponse — ${this.channelLabel(this.channel)} (n=${this.repeats}/niveau)`,
      pad.l,
      24,
    );
    ctx.strokeStyle = '#3a4a42';
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + ih);
    ctx.lineTo(pad.l + iw, pad.t + ih);
    ctx.stroke();

    const draw = (key: 'p_escape' | 'p_eat' | 'p_idle', color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      curve.forEach((c, i) => {
        const x = xOf(c.level);
        const y = yOf(c[key]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    draw('p_escape', '#ff3d6e');
    draw('p_eat', '#ffc857');
    draw('p_idle', '#6f887e');
    ctx.fillStyle = '#6f887e';
    ctx.font = '11px Roboto, sans-serif';
    ctx.fillText('niveau', pad.l, h - 14);
    ctx.fillStyle = '#ff3d6e';
    ctx.fillText('Fuite', w - 200, 24);
    ctx.fillStyle = '#ffc857';
    ctx.fillText('Alimentation', w - 140, 24);
    ctx.fillStyle = '#6f887e';
    ctx.fillText('Repos', w - 40, 24);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dose-${this.channel}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  private downloadBlob(text: string, filename: string, type: string): void {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
