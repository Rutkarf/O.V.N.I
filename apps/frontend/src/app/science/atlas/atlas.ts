import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Atlas, AtlasNeuron, ScienceService } from '../../core/science.service';

@Component({
  selector: 'app-atlas',
  imports: [FormsModule, RouterLink],
  templateUrl: './atlas.html',
  styleUrl: './atlas.css',
})
export class AtlasPage implements OnInit {
  private readonly science = inject(ScienceService);
  readonly atlas = signal<Atlas | null>(null);
  readonly error = signal('');
  readonly claimStatus = signal<Record<string, unknown> | null>(null);
  query = '';
  roi = '';
  selected = signal<AtlasNeuron | null>(null);

  readonly filtered = computed(() => {
    const a = this.atlas();
    if (!a) return [];
    const q = this.query.trim().toLowerCase();
    return a.neurons.filter((n) => {
      if (this.roi && n.roi !== this.roi) return false;
      if (!q) return true;
      return (
        n.id.toLowerCase().includes(q) ||
        n.class.toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  });

  ngOnInit(): void {
    this.science.atlas().subscribe({
      next: (a) => this.atlas.set(a),
      error: (e) => this.error.set(String(e?.error?.message || e.message || e)),
    });
    this.science.atlasStatus().subscribe({
      next: (s) => this.claimStatus.set(s),
      error: () => undefined,
    });
  }

  pick(n: AtlasNeuron): void {
    this.selected.set(n);
  }
}
