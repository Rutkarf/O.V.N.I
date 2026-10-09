import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClaimBanner } from '../../core/claim-banner';
import { ScienceService } from '../../core/science.service';

@Component({
  selector: 'app-validation',
  imports: [FormsModule, ClaimBanner],
  templateUrl: './validation.html',
  styleUrl: './validation.css',
})
export class ValidationPage implements OnInit {
  private readonly science = inject(ScienceService);

  readonly rapport = signal('');
  readonly atlasStatus = signal('');
  readonly erreur = signal('');

  runId = '';
  nObs = 20;
  kEscapeObs = 8;
  batchIds = '';

  ngOnInit(): void {
    this.science.atlasStatus().subscribe({
      next: (s) => this.atlasStatus.set(JSON.stringify(s, null, 2)),
      error: (e) => this.erreur.set(String(e?.error?.message || e.message || e)),
    });
  }

  chargerPicsl(): void {
    this.erreur.set('');
    this.science.picslSample().subscribe({
      next: (o) => {
        this.nObs = Number(o['n'] || this.nObs);
        this.kEscapeObs = Number(
          o['escape'] || (o['action_counts'] as Record<string, number>)?.['ESCAPE'] || this.kEscapeObs,
        );
        this.rapport.set(JSON.stringify(o, null, 2));
      },
      error: (e) => this.erreur.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  comparer(): void {
    this.erreur.set('');
    const body: Record<string, unknown> = {
      run_id: this.runId.trim() || null,
      observe: {
        n: this.nObs,
        escape: this.kEscapeObs,
        source: 'PiCsL / essai comportement',
      },
    };
    const ids = this.batchIds
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length) body['batch_run_ids'] = ids;
    this.science.validationImagerie(body).subscribe({
      next: (r) => this.rapport.set(JSON.stringify(r, null, 2)),
      error: (e) => this.erreur.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }

  comparerAvecSample(): void {
    this.erreur.set('');
    const body: Record<string, unknown> = {
      run_id: this.runId.trim() || null,
      use_picsl_sample: true,
      n_sim: 48,
      escape_sim: 28,
    };
    const ids = this.batchIds
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length) body['batch_run_ids'] = ids;
    this.science.validationImagerie(body).subscribe({
      next: (r) => this.rapport.set(JSON.stringify(r, null, 2)),
      error: (e) => this.erreur.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }
}
