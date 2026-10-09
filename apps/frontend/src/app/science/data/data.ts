import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScienceService } from '../../core/science.service';

const SAMPLE_MOTIF = `pre,post,weight,sign,synapses
sugar_sensory,MN9,1.8,1,12
sugar_sensory,KC,1.2,1,8
bitter_sensory,MN9,4.5,-1,10
LPLC2,DNp01_L,2.4,1,15
LPLC2,DNp01_R,2.2,1,14
LC4,DNp01_L,2.0,1,11
LC4,DNp01_R,2.1,1,12
`;

/** Mini ROI style MaleCNS (IDs fictifs + motif) pour brancher le pipeline. */
const SAMPLE_MALECNS = `pre,post,weight,sign,synapses,roi
LPLC2,DNp01_L,2.4,1,15,LOP
LPLC2,DNp01_R,2.2,1,14,LOP
LC4,DNp01_L,2.0,1,11,LOP
LC4,DNp01_R,2.1,1,12,LOP
MCNS_LPLC2_R,MCNS_DNp01_L,2.5,1,18,LOP
MCNS_LPLC2_R,MCNS_DNp01_R,2.3,1,16,LOP
MCNS_LC4_R,MCNS_DNp01_L,1.9,1,12,LOP
MCNS_LC4_R,MCNS_DNp01_R,2.0,1,13,LOP
sugar_sensory,MN9,1.8,1,12,SEZ
bitter_sensory,MN9,4.5,-1,10,SEZ
`;

@Component({
  selector: 'app-data',
  imports: [FormsModule],
  templateUrl: './data.html',
  styleUrl: './data.css',
})
export class DataPage {
  private readonly science = inject(ScienceService);
  csv = SAMPLE_MOTIF;
  mode: 'motif' | 'malecns' | 'flywire' = 'motif';
  roiFilter = '';
  readonly status = signal('');
  readonly error = signal('');
  readonly newNeurons = signal<string[]>([]);

  loadMotifSample(): void {
    this.mode = 'motif';
    this.csv = SAMPLE_MOTIF;
  }

  loadMalecnsSample(): void {
    this.mode = 'malecns';
    this.roiFilter = 'LOP';
    this.csv = SAMPLE_MALECNS;
  }

  upload(): void {
    this.error.set('');
    this.newNeurons.set([]);
    this.science
      .uploadEdges(this.csv, {
        mode: this.mode,
        roi: this.roiFilter.trim() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.status.set(
            `Circuit actif (${r.mode || this.mode}) — ${r.edge_count} connexions` +
              (r.neuron_count ? ` · ${r.neuron_count} neurones` : '') +
              (r.circuit_id ? ` · ${r.circuit_id}` : ''),
          );
          this.newNeurons.set(r.new_neurons || []);
        },
        error: (e) =>
          this.error.set(String(e?.error?.error || e?.error?.message || e.message || e)),
      });
  }

  reset(): void {
    this.science.resetCircuit().subscribe({
      next: (r) => {
        this.status.set(`Circuit restauré : ${r.circuit_id}`);
        this.newNeurons.set([]);
      },
      error: (e) => this.error.set(String(e?.error?.message || e.message || e)),
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void file.text().then((t) => {
      this.csv = t;
      this.status.set(`Fichier chargé : ${file.name}`);
    });
  }
}
