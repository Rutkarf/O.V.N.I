import { JsonPipe, SlicePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { actionFrEn } from '../../core/labels';
import { RunResult, RunSummary, ScienceService } from '../../core/science.service';

@Component({
  selector: 'app-runs',
  imports: [JsonPipe, SlicePipe],
  templateUrl: './runs.html',
  styleUrl: './runs.css',
})
export class RunsPage implements OnInit {
  private readonly science = inject(ScienceService);
  readonly runs = signal<RunSummary[]>([]);
  readonly selected = signal<RunResult | null>(null);
  readonly replayNote = signal('');
  readonly error = signal('');

  actionLabel(code: string): string {
    return actionFrEn(code);
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.science.runs().subscribe({
      next: (r) => this.runs.set(r),
      error: (e) => this.error.set(String(e?.error?.message || e.message || e)),
    });
  }

  open(id: string): void {
    this.science.run(id).subscribe({
      next: (r) => this.selected.set(r),
      error: (e) => this.error.set(String(e?.error?.message || e.message || e)),
    });
  }

  downloadSpikes(id: string): void {
    this.science.downloadSpikes(id);
  }

  downloadMethods(id: string): void {
    this.science.downloadMethods(id);
  }

  replay(id: string): void {
    this.replayNote.set('Rejeu…');
    this.science.replay(id).subscribe({
      next: (r) => {
        this.selected.set(r);
        this.replayNote.set(
          r.replay_match
            ? `Rejeu OK — même action (${r.action})`
            : `Écart rejeu : attendu ≠ ${r.action}`,
        );
        this.reload();
      },
      error: (e) =>
        this.error.set(String(e?.error?.error || e?.error?.message || e.message || e)),
    });
  }
}
