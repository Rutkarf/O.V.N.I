import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  effect,
} from '@angular/core';

/** Schéma pédagogique Cas12a / CRISPR 2 — pas une prédiction off-target réelle. */
@Component({
  selector: 'app-crispr2-viz',
  template: `<canvas #cv class="crispr-canvas" aria-label="Schéma CRISPR 2 Cas12a"></canvas>`,
  styles: [
    `
      .crispr-canvas {
        width: 100%;
        height: 220px;
        display: block;
        background: rgba(10, 10, 10, 0.35);
        border: 1px solid rgba(245, 245, 242, 0.12);
      }
    `,
  ],
})
export class Crispr2Viz implements AfterViewInit, OnDestroy {
  readonly driver = input('GAL4/UAS');
  readonly outil = input('CRISPR 2 / Cas12a');

  @ViewChild('cv', { static: true }) private cv!: ElementRef<HTMLCanvasElement>;
  private ro: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.driver();
      this.outil();
      this.draw();
    });
  }

  ngAfterViewInit(): void {
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(this.cv.nativeElement);
    this.draw();
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  private draw(): void {
    const canvas = this.cv?.nativeElement;
    if (!canvas) return;
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 220;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#f5f5f2';
    ctx.font = '600 13px Orbitron, sans-serif';
    ctx.fillText('CRISPR 2 · Cas12a (couche génétique)', 16, 24);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#9c9c97';
    ctx.fillText(`Driver : ${this.driver()} · ${this.outil()}`, 16, 44);

    const y = h * 0.55;
    const dnaW = w - 80;
    const x0 = 40;
    ctx.strokeStyle = '#007a3d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + dnaW, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, y + 14);
    ctx.lineTo(x0 + dnaW, y + 14);
    ctx.stroke();

    const targetX = x0 + dnaW * 0.42;
    ctx.fillStyle = 'rgba(206, 17, 38, 0.25)';
    ctx.fillRect(targetX - 28, y - 22, 56, 52);
    ctx.strokeStyle = '#ce1126';
    ctx.lineWidth = 2;
    ctx.strokeRect(targetX - 28, y - 22, 56, 52);
    ctx.fillStyle = '#ce1126';
    ctx.font = '11px Roboto, sans-serif';
    ctx.fillText('PAM / cible', targetX - 24, y - 28);

    ctx.fillStyle = '#1faa56';
    ctx.beginPath();
    ctx.ellipse(targetX + 70, y - 8, 38, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Cas12a', targetX + 48, y - 4);

    ctx.strokeStyle = '#f5f5f2';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(targetX + 32, y);
    ctx.lineTo(targetX + 48, y - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#d4a84b';
    ctx.fillRect(targetX - 8, y - 38, 4, 18);
    ctx.fillRect(targetX + 4, y - 38, 4, 18);
    ctx.fillStyle = '#9c9c97';
    ctx.font = '10px Roboto, sans-serif';
    ctx.fillText('gRNA', targetX - 6, y - 42);

    ctx.fillStyle = '#9c9c97';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('→ export Maelstrom (génomique) · environnement Argon (reproductibilité)', 16, h - 16);
  }
}
