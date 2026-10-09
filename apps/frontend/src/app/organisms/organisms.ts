import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Organism, SimJob } from '../core/sim.models';
import { ScienceService } from '../core/science.service';
import { SimService } from '../core/sim.service';

@Component({
  selector: 'app-organisms',
  imports: [FormsModule, RouterLink],
  templateUrl: './organisms.html',
  styleUrl: './organisms.css',
})
export class Organisms implements OnInit, OnDestroy {
  private readonly sim = inject(SimService);
  private readonly science = inject(ScienceService);

  readonly items = signal<Organism[]>([]);
  readonly registry = signal<{ nom: string; statut: string; id: string }[]>([]);
  readonly jobs = signal<SimJob[]>([]);
  readonly error = signal('');
  name = '';
  species = 'Drosophila melanogaster';
  selectedOrganismId = '';
  jobMode = 'rules';
  jobTicks = 8;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.reload();
    this.science.organismsRegistry().subscribe({
      next: (r) => {
        const list = (r['organismes'] as { id: string; nom: string; statut: string }[]) || [];
        this.registry.set(list);
      },
    });
    this.pollTimer = setInterval(() => this.reloadJobs(), 2500);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  reload(): void {
    this.sim.listOrganisms().subscribe({
      next: (items) => {
        this.items.set(items);
        if (!this.selectedOrganismId && items.length) {
          this.selectedOrganismId = items[0].id;
        }
      },
      error: (err) => this.error.set(String(err?.error?.message || err.message || err)),
    });
    this.reloadJobs();
  }

  reloadJobs(): void {
    this.sim.listJobs().subscribe({
      next: (jobs) => this.jobs.set(jobs),
      error: () => undefined,
    });
  }

  create(): void {
    if (!this.name.trim()) return;
    this.sim.createOrganism(this.name.trim(), this.species.trim()).subscribe({
      next: () => {
        this.name = '';
        this.reload();
      },
      error: (err) => this.error.set(String(err?.error?.message || err.message || err)),
    });
  }

  enqueue(): void {
    if (!this.selectedOrganismId) return;
    this.sim
      .createJob({
        organismId: this.selectedOrganismId,
        mode: this.jobMode,
        ticks: this.jobTicks,
      })
      .subscribe({
        next: () => this.reloadJobs(),
        error: (err) => this.error.set(String(err?.error?.message || err.message || err)),
      });
  }
}
