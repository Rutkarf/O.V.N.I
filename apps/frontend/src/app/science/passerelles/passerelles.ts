import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScienceService } from '../../core/science.service';

interface Outil {
  id: string;
  nom: string;
  type: string;
  lien?: string;
  lien_fbi?: string;
  passerelle_fruitfly: string;
  aide: string;
}

interface Categorie {
  id: string;
  nom: string;
  outils: Outil[];
}

@Component({
  selector: 'app-passerelles',
  imports: [FormsModule],
  templateUrl: './passerelles.html',
  styleUrl: './passerelles.css',
})
export class PasserellesPage implements OnInit {
  private readonly science = inject(ScienceService);

  readonly categories = signal<Categorie[]>([]);
  readonly organisme = signal('');
  readonly exportJson = signal('');
  readonly erreur = signal('');
  readonly statut = signal('');
  runId = '';
  filtre = '';
  ligne = '';
  driver = 'GAL4/UAS';

  ngOnInit(): void {
    this.science.plateformes().subscribe({
      next: (data) => {
        this.organisme.set(String(data['organisme'] || 'IBDML'));
        this.categories.set((data['categories'] as Categorie[]) || []);
      },
      error: (e) => this.erreur.set(String(e?.error?.message || e.message || e)),
    });
  }

  outilsFiltres(cat: Categorie): Outil[] {
    const q = this.filtre.trim().toLowerCase();
    if (!q) return cat.outils;
    return cat.outils.filter(
      (o) =>
        o.nom.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q) ||
        o.aide.toLowerCase().includes(q),
    );
  }

  generer(outil: Outil): void {
    this.erreur.set('');
    this.statut.set('Génération du pont…');
    const rid = this.runId.trim() || undefined;
    const done = (payload: Record<string, unknown>) => {
      this.exportJson.set(JSON.stringify(payload, null, 2));
      this.statut.set(`Pont prêt — ${outil.nom}`);
    };
    const fail = (e: { error?: { message?: string }; message?: string }) => {
      this.erreur.set(String(e?.error?.message || e.message || e));
      this.statut.set('');
    };

    switch (outil.passerelle_fruitfly) {
      case 'export_clem':
        this.science.passerelleClem(rid).subscribe({ next: done, error: fail });
        break;
      case 'export_pipeline':
        this.science.passerellePipeline(rid).subscribe({ next: done, error: fail });
        break;
      case 'export_genomique':
        this.science.passerelleMaelstrom(rid).subscribe({ next: done, error: fail });
        break;
      case 'export_argon_manifest':
        this.science.passerelleArgon(rid).subscribe({ next: done, error: fail });
        break;
      case 'carte_genetique':
        this.science
          .passerelleCarteGenetique({
            ligne: this.ligne,
            driver: this.driver,
            outil: outil.nom,
          })
          .subscribe({ next: done, error: fail });
        break;
      case 'journal_colonie':
        this.science
          .passerelleJournal({ notes: `Lien ${outil.nom}`, session_id: rid })
          .subscribe({ next: done, error: fail });
        break;
      case 'fiche_protocole':
      case 'bridge_imagerie':
        this.science
          .passerelleProtocole(outil.id, rid)
          .subscribe({ next: done, error: fail });
        break;
      case 'lien_externe':
        if (outil.lien) window.open(outil.lien, '_blank', 'noopener');
        this.science.passerellePont(rid).subscribe({ next: done, error: fail });
        break;
      default:
        this.science.passerellePont(rid).subscribe({ next: done, error: fail });
    }
  }

  copier(): void {
    if (!this.exportJson()) return;
    void navigator.clipboard.writeText(this.exportJson());
    this.statut.set('JSON copié dans le presse-papiers');
  }

  telecharger(): void {
    const blob = new Blob([this.exportJson()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pont-ibdml-ovni.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
