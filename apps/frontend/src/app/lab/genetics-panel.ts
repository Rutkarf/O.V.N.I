import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_GENOTYPE,
  GeneticsGenotype,
  InstrumentStore,
} from '../core/instrument.store';

interface LocusMeta {
  id: string;
  nom: string;
  dominant: string;
  recessif: string;
}

interface DriverMeta {
  id: string;
  nom: string;
  type: 'GAL4' | 'UAS' | string;
  description?: string;
}

@Component({
  selector: 'app-genetics-panel',
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="panel genetics-panel">
      <p class="kicker">Génétique · Argon · CRISPR · Kepler · GAL4/UAS</p>
      <p class="muted tiny">
        Éditeur d’allèles, croisements F1/F2, drivers GAL4×UAS — le mesh Three.js suit le phénotype.
        Validation wet-lab requise avant publication.
      </p>

      @if (store.geneticsPhenotype(); as ph) {
        <div class="row">
          <span>Phénotype 3D</span>
          <strong>{{ ph.genotype_label }}</strong>
        </div>
        <div class="row">
          <span>Échelle Argon</span>
          <strong>{{ ph.argon_scale | number: '1.2-2' }}×</strong>
        </div>
        @if (ph.driver_active) {
          <div class="row">
            <span>Driver</span>
            <strong>{{ ph.driver_label }}</strong>
          </div>
        }
      }

      <p class="kicker">Presets lignée</p>
      <div class="genetics-actions">
        <button type="button" (click)="store.geneticsPresetStock('oregon_r')">Oregon-R</button>
        <button type="button" (click)="store.geneticsPresetStock('white_mini')">w⁻ b⁻</button>
        <button type="button" (click)="store.geneticsPresetStock('tubby_yellow')">Tb⁻ y⁻</button>
        <button type="button" (click)="store.geneticsPresetStock('gal4_uas')">elav > GFP</button>
      </div>

      <p class="kicker">Éditeur d’allèles</p>
      <div class="genetics-actions">
        <button
          type="button"
          [class.on]="store.geneticsEditorFocus() === 'work'"
          (click)="store.geneticsEditorFocus.set('work')"
        >
          Travail
        </button>
        <button
          type="button"
          [class.on]="store.geneticsEditorFocus() === 'parent_a'"
          (click)="store.geneticsEditorFocus.set('parent_a')"
        >
          Parent A ♀
        </button>
        <button
          type="button"
          [class.on]="store.geneticsEditorFocus() === 'parent_b'"
          (click)="store.geneticsEditorFocus.set('parent_b')"
        >
          Parent B ♂
        </button>
        <button type="button" class="ghost" (click)="store.copyWorkToParent('parent_a')">→ A</button>
        <button type="button" class="ghost" (click)="store.copyWorkToParent('parent_b')">→ B</button>
      </div>

      <div class="allele-grid">
        @for (loc of loci(); track loc.id) {
          <div class="allele-row">
            <span class="allele-name" [title]="loc.nom">{{ loc.id }}</span>
            <select
              [ngModel]="allelePair(loc.id)[0]"
              (ngModelChange)="setAllele(loc.id, 0, $event)"
            >
              @for (a of alleleChoices(loc); track a) {
                <option [value]="a">{{ a }}</option>
              }
            </select>
            <span class="slash">/</span>
            <select
              [ngModel]="allelePair(loc.id)[1]"
              (ngModelChange)="setAllele(loc.id, 1, $event)"
            >
              @for (a of alleleChoices(loc); track a) {
                <option [value]="a">{{ a }}</option>
              }
            </select>
          </div>
        }
      </div>

      <p class="kicker">Croisement</p>
      <label class="field">
        <span>Type</span>
        <select [ngModel]="store.geneticsCrossType()" (ngModelChange)="store.geneticsCrossType.set($event)">
          @for (c of crossTypeOptions(); track c.id) {
            <option [value]="c.id">{{ c.nom }}</option>
          }
        </select>
      </label>
      <label class="field">
        <span>Graine progeny</span>
        <input
          type="number"
          [ngModel]="store.geneticsSeed()"
          (ngModelChange)="store.geneticsSeed.set(+$event)"
        />
      </label>
      <button type="button" class="primary" (click)="store.runGeneticsCross()" [disabled]="store.geneticsBusy()">
        Croiser A × B → descendants
      </button>

      @if (store.geneticsOffspring().length) {
        <p class="kicker">Descendants (sélection F1/F2)</p>
        <label class="field">
          <span>#{{ store.geneticsSelectedOffspring() + 1 }} / {{ store.geneticsOffspring().length }}</span>
          <select
            [ngModel]="store.geneticsSelectedOffspring()"
            (ngModelChange)="store.selectGeneticsOffspring(+$event)"
          >
            @for (o of store.geneticsOffspring(); track o.index) {
              <option [value]="o.index">
                {{ o.generation || 'F' }} · #{{ o.index + 1 }} · {{ o.label }}
              </option>
            }
          </select>
        </label>
        <pre class="brain tiny">{{ previewCounts(store.geneticsLastCross()) }}</pre>
      }

      <p class="kicker">GAL4 / UAS</p>
      <label class="field">
        <span>GAL4 (driver)</span>
        <select
          [ngModel]="store.geneticsDrivers().gal4"
          (ngModelChange)="store.setGeneticsDriver('gal4', $event)"
        >
          <option value="">— aucun —</option>
          @for (d of gal4Drivers(); track d.id) {
            <option [value]="d.id">{{ d.nom }}</option>
          }
        </select>
      </label>
      <label class="field">
        <span>UAS (effecteur)</span>
        <select
          [ngModel]="store.geneticsDrivers().uas"
          (ngModelChange)="store.setGeneticsDriver('uas', $event)"
        >
          <option value="">— aucun —</option>
          @for (d of uasDrivers(); track d.id) {
            <option [value]="d.id">{{ d.nom }}</option>
          }
        </select>
      </label>
      <button type="button" (click)="store.applyGeneticsDrivers()" [disabled]="store.geneticsBusy()">
        Appliquer GAL4 × UAS → scène 3D
      </button>

      <p class="kicker">Édition génome · cibles CRISPR</p>
      <div class="genetics-actions">
        @for (loc of loci(); track loc.id) {
          <button
            type="button"
            [class.on]="store.geneticsEditTargets().includes(loc.id)"
            (click)="store.toggleGeneticsEditTarget(loc.id)"
          >
            {{ loc.id }}
          </button>
        }
      </div>
      <div class="genetics-actions">
        <button type="button" (click)="store.runGeneticsEdit('crispr1_cas9')" [disabled]="store.geneticsBusy()">
          CRISPR 1 · Cas9
        </button>
        <button type="button" (click)="store.runGeneticsEdit('crispr2_cas12a')" [disabled]="store.geneticsBusy()">
          CRISPR 2 · Cas12a
        </button>
        <button type="button" class="kepler" (click)="store.runGeneticsKepler()" [disabled]="store.geneticsBusy()">
          Ciseaux Kepler
        </button>
      </div>

      <button type="button" class="ghost" (click)="store.geneticsArgonReady()" [disabled]="store.geneticsBusy()">
        Manifeste Argon + taille conteneur
      </button>

      @if (store.geneticsNote()) {
        <p class="banner">{{ store.geneticsNote() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .genetics-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin: 0.5rem 0;
      }
      .genetics-actions button.on {
        outline: 2px solid #1faa56;
        outline-offset: 1px;
      }
      .genetics-actions button.kepler {
        border-color: #46c4ff;
        color: #0a3040;
        background: rgba(70, 196, 255, 0.2);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin: 0.5rem 0;
        font-size: 0.85rem;
      }
      .field select,
      .field input {
        font: inherit;
        padding: 0.35rem 0.5rem;
      }
      .allele-grid {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin: 0.5rem 0 0.75rem;
      }
      .allele-row {
        display: grid;
        grid-template-columns: 2.2rem 1fr auto 1fr;
        gap: 0.3rem;
        align-items: center;
        font-size: 0.82rem;
      }
      .allele-name {
        font-family: Orbitron, sans-serif;
        font-weight: 700;
      }
      .slash {
        opacity: 0.5;
      }
      .allele-row select {
        font: inherit;
        padding: 0.25rem;
        min-width: 0;
      }
    `,
  ],
})
export class GeneticsPanel implements OnInit {
  readonly store = inject(InstrumentStore);

  readonly loci = computed<LocusMeta[]>(() => {
    const cat = this.store.geneticsCatalog();
    const fromApi = cat?.['loci'] as LocusMeta[] | undefined;
    if (fromApi?.length) return fromApi;
    return [
      { id: 'w', nom: 'white', dominant: 'w+', recessif: 'w' },
      { id: 'y', nom: 'yellow', dominant: 'y+', recessif: 'y' },
      { id: 'b', nom: 'miniature', dominant: 'b+', recessif: 'b' },
      { id: 'Tb', nom: 'tubby', dominant: 'Tb+', recessif: 'Tb' },
      { id: 's', nom: 'sable', dominant: 's+', recessif: 's' },
    ];
  });

  readonly crossTypeOptions = computed(() => {
    const cat = this.store.geneticsCatalog();
    const fromApi = cat?.['cross_types'] as { id: string; nom: string }[] | undefined;
    if (fromApi?.length) return fromApi;
    return [
      { id: 'mono_hybrid', nom: 'Monohybride' },
      { id: 'dihybrid', nom: 'Dihybride' },
      { id: 'test_cross', nom: 'Croisement test' },
      { id: 'backcross', nom: 'Rétrocroisement' },
      { id: 'reciprocal', nom: 'Réciproque' },
      { id: 'sibling', nom: 'Fratrie F2' },
    ];
  });

  readonly gal4Drivers = computed(() =>
    this.drivers().filter((d) => d.type === 'GAL4' || d.type === 'SPLIT_GAL4'),
  );

  readonly uasDrivers = computed(() =>
    this.drivers().filter((d) => d.type === 'UAS'),
  );

  private readonly drivers = computed<DriverMeta[]>(() => {
    const cat = this.store.geneticsCatalog();
    return (cat?.['drivers'] as DriverMeta[] | undefined) ?? [];
  });

  ngOnInit(): void {
    if (!this.store.geneticsCatalog()) {
      this.store.loadGeneticsCatalog();
    }
  }

  private focusedGenotype(): GeneticsGenotype {
    const focus = this.store.geneticsEditorFocus();
    if (focus === 'parent_a') return this.store.geneticsParentA();
    if (focus === 'parent_b') return this.store.geneticsParentB();
    return this.store.geneticsGenotype();
  }

  allelePair(locus: string): [string, string] {
    const g = this.focusedGenotype();
    const pair = g[locus] ?? DEFAULT_GENOTYPE[locus] ?? ['+', '+'];
    return [pair[0], pair[1]];
  }

  alleleChoices(loc: LocusMeta): string[] {
    return [loc.dominant, loc.recessif, `${loc.dominant}-GFP`];
  }

  setAllele(locus: string, which: 0 | 1, value: string): void {
    const [a, b] = this.allelePair(locus);
    if (which === 0) this.store.setGeneticsLocus(locus, value, b);
    else this.store.setGeneticsLocus(locus, a, value);
  }

  previewCounts(x: Record<string, unknown> | null): string {
    if (!x) return '';
    const c = x['counts_preview'] as Record<string, number> | undefined;
    if (!c) return '';
    return Object.entries(c)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  }
}
