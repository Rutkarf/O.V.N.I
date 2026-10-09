import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { motifFr } from '../../core/labels';
import { ScienceService } from '../../core/science.service';
import { Crispr2Viz } from './crispr2-viz';

@Component({
  selector: 'app-workflow',
  imports: [FormsModule, RouterLink, Crispr2Viz],
  templateUrl: './workflow.html',
  styleUrl: './workflow.css',
})
export class WorkflowPage implements OnInit {
  private readonly science = inject(ScienceService);

  readonly motifs = signal<{ id: string; nom: string }[]>([]);
  readonly etape = signal(1);
  readonly statut = signal('');
  readonly erreur = signal('');
  readonly pont = signal('');
  readonly methodes = signal('');
  readonly runId = signal('');
  readonly zenodo = signal('');

  motifId = 'malecns_roi_fuite_lop_v1';
  ligne = '';
  driver = 'GAL4/UAS';
  outil = 'CRISPR 2 / Cas12a';
  sugar = 0;
  bitter = 0;
  looming = 0.9;
  hunger = 0.5;
  seed = 7;

  isCrisprLayer(): boolean {
    return /crispr\s*2|cas12|base editor|prime editor/i.test(this.outil);
  }

  ngOnInit(): void {
    this.science.zenodoMeta().subscribe({
      next: (z) => this.zenodo.set(JSON.stringify(z, null, 2)),
    });
    this.science.motifs().subscribe({
      next: (m) => {
        this.motifs.set(
          (m.motifs || []).map((x) => ({ id: x.id, nom: x.nom || motifFr(x.id) })),
        );
        if (m.motif_actif) this.motifId = m.motif_actif;
      },
    });
  }

  etape1(): void {
    this.erreur.set('');
    this.science.selectionnerMotif(this.motifId).subscribe({
      next: () => {
        this.statut.set(`Motif actif : ${motifFr(this.motifId)}`);
        this.etape.set(2);
      },
      error: (e) => this.erreur.set(String(e?.error?.message || e.message || e)),
    });
  }

  etape2(): void {
    this.science
      .passerelleCarteGenetique({
        ligne: this.ligne,
        driver: this.driver,
        outil: this.outil,
        validation_imagerie: 'a_faire',
        plateforme_imagerie: 'PiCsL',
      })
      .subscribe({
        next: (c) => {
          this.pont.set(JSON.stringify(c, null, 2));
          this.statut.set(`Carte génétique (${c['famille'] || this.outil}) prête`);
          this.etape.set(3);
        },
        error: (e) => this.erreur.set(String(e?.error?.message || e.message || e)),
      });
  }

  etape3(): void {
    this.science
      .stimulate({
        sugar: this.sugar,
        bitter: this.bitter,
        looming: this.looming,
        hunger: this.hunger,
        seed: this.seed,
      })
      .subscribe({
        next: (r) => {
          this.runId.set(r.run_card.run_id);
          this.statut.set(`Essai ${r.run_card.run_id.slice(0, 8)} → ${r.action}`);
          this.etape.set(4);
          this.science.methodsText(r.run_card.run_id).subscribe({
            next: (md) => this.methodes.set(md),
          });
        },
        error: (e) => this.erreur.set(String(e?.error?.message || e.message || e)),
      });
  }

  exportMaelstrom(): void {
    const rid = this.runId() || undefined;
    this.science.passerelleMaelstrom(rid).subscribe({
      next: (p) => {
        this.pont.set(JSON.stringify(p, null, 2));
        this.statut.set('Bundle Maelstrom prêt');
      },
      error: (e) => this.erreur.set(String(e?.error?.message || e.message || e)),
    });
  }

  exportArgon(): void {
    const rid = this.runId() || undefined;
    this.science.passerelleArgon(rid).subscribe({
      next: (p) => {
        this.pont.set(JSON.stringify(p, null, 2));
        this.statut.set('Manifeste Argon prêt');
      },
      error: (e) => this.erreur.set(String(e?.error?.message || e.message || e)),
    });
  }

  etape4(): void {
    const rid = this.runId();
    this.science.passerellePont(rid || undefined).subscribe({
      next: (p) => {
        this.pont.set(JSON.stringify(p, null, 2));
        this.statut.set('Pont PiCsL généré — joindre aux métadonnées d’acquisition');
        this.etape.set(5);
      },
      error: (e) => this.erreur.set(String(e?.error?.message || e.message || e)),
    });
  }
}
