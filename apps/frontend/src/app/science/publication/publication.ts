import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClaimBanner } from '../../core/claim-banner';
import { InstrumentStore } from '../../core/instrument.store';
import { ScienceService } from '../../core/science.service';

@Component({
  selector: 'app-publication',
  imports: [FormsModule, ClaimBanner, RouterLink],
  templateUrl: './publication.html',
  styleUrl: './publication.css',
})
export class PublicationPage implements OnInit {
  private readonly science = inject(ScienceService);
  readonly store = inject(InstrumentStore);

  readonly out = signal('');
  readonly err = signal('');
  runId = '';

  ngOnInit(): void {
    this.refreshAtlas();
  }

  refreshAtlas(): void {
    this.science.atlasStatus().subscribe({
      next: (s) => this.out.set(JSON.stringify(s, null, 2)),
      error: (e) => this.err.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  publishArgon(): void {
    this.err.set('');
    this.science.argonDoi({ run_id: this.runId || null, publish: true }).subscribe({
      next: (r) => this.out.set(JSON.stringify(r, null, 2)),
      error: (e) => this.err.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  exportRocrate(): void {
    this.science.rocrate({ run_id: this.runId || null }).subscribe({
      next: (r) => this.out.set(JSON.stringify(r, null, 2)),
      error: (e) => this.err.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  gpuSweep(): void {
    this.science
      .gpuSweep({ channel: 'looming', levels: [0, 0.25, 0.5, 0.75, 1], repeats: 6, seed: 7 })
      .subscribe({
        next: (r) => this.out.set(JSON.stringify(r, null, 2)),
        error: (e) => this.err.set(String(e?.error?.error || e?.error?.message || e.message || e)),
      });
  }

  opto(): void {
    this.science.optoCurve({ max_hz: 80, intensity: 0.5 }).subscribe({
      next: (r) => this.out.set(JSON.stringify(r, null, 2)),
      error: (e) => this.err.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  bridges(): void {
    this.science.bridgeNapari(this.runId || undefined).subscribe({
      next: (r) => this.out.set(JSON.stringify(r, null, 2)),
      error: (e) => this.err.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }
}
