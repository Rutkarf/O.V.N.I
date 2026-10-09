import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  COL_SCALE,
  CarouselNavItem,
  DEFAULT_ORGANISM_ID,
  OrganismStatus,
  TAXON_RANKS,
  TAXON_RANK_LABELS,
  TaxonRank,
  TaxonomyFilter,
  PHYLA_BY_KINGDOM,
  OVNI_ORGANISM_CATALOG,
  OvniOrganismChoice,
  filterOrganisms,
  findOrganism,
  nextRankAfter,
  optionsAtRank,
  sampleOrganismFor,
} from './organism-catalog';
import { OrganismCarousel } from './organism-carousel';
import {
  TaxonBrowseSource,
  createBrowseSource,
  defaultBrowseIndex,
} from './taxon-browse-source';
import {
  BRAIN_ATLAS_CATALOG,
  BRAIN_ATLAS_SLOTS,
  BrainAtlasChoice,
  CompositionAxis,
  DEFAULT_BRAIN_ID,
  DEFAULT_MOTIF_ID,
  LIF_MOTIF_SLOTS,
  ROI_MOTIF_CATALOG,
  RoiMotifChoice,
  SelectorSlot,
  brainNavItems,
  findBrain,
  findMotif,
  motifNavItems,
  randomPickBrain,
  randomPickMotif,
  randomPickOrganism,
} from './hybrid-composition';
import { InstrumentStore } from '../core/instrument.store';

type RankQueryMap = Record<TaxonRank, string>;
type SlotQueryMap = Record<string, string>;

function emptyRankQueries(): RankQueryMap {
  return {
    regne: '',
    embranchement: '',
    classe: '',
    ordre: '',
    famille: '',
    genre: '',
    espece: '',
  };
}

function emptySlotQueries(slots: SelectorSlot[]): SlotQueryMap {
  return Object.fromEntries(slots.map((s) => [s.id, '']));
}

/** Dossier exhaustif d’un motif ROI LIF : le dé remplit chaque maillon. */
const MOTIF_LINE = [
  { id: 'circuit', label: 'Circuit' },
  { id: 'famille', label: 'Famille' },
  { id: 'identifiant', label: 'Identifiant' },
  { id: 'resume', label: 'Résumé' },
  { id: 'origine', label: 'Origine' },
  { id: 'neurones', label: 'Neurones' },
  { id: 'synapses', label: 'Synapses' },
  { id: 'maille', label: 'Maille' },
  { id: 'statut', label: 'Statut' },
] as const;

/** Dossier exhaustif d’un atlas cérébral. */
const BRAIN_LINE = [
  { id: 'atlas', label: 'Atlas' },
  { id: 'famille', label: 'Famille' },
  { id: 'identifiant', label: 'Identifiant' },
  { id: 'resume', label: 'Résumé' },
  { id: 'origine', label: 'Origine' },
  { id: 'effectif', label: 'Effectif' },
  { id: 'maille', label: 'Maille' },
  { id: 'vnc', label: 'VNC' },
  { id: 'statut', label: 'Statut' },
] as const;

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function emptyLine(fields: readonly { id: string }[]): SlotQueryMap {
  return Object.fromEntries(fields.map((f) => [f.id, '']));
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function scoreMatch(query: string, name: string): number {
  const q = norm(query);
  const n = norm(name);
  if (!q) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  if (n.includes(q)) return 70;
  let qi = 0;
  for (let i = 0; i < n.length && qi < q.length; i++) {
    if (n[i] === q[qi]) qi++;
  }
  return qi === q.length ? 40 : 0;
}

type GlobalHit = {
  id: string;
  kind: 'taxon' | 'motif' | 'brain';
  kindLabel: string;
  label: string;
  detail: string;
  haystack: string;
};

function buildGlobalIndex(): GlobalHit[] {
  const organisms: GlobalHit[] = OVNI_ORGANISM_CATALOG.filter((o) => o.status !== 'locked').map((o) => {
    const t = o.taxonomy;
    return {
      id: o.id,
      kind: 'taxon',
      kindLabel: 'Taxonomie',
      label: o.scientificName,
      detail: `${t.regne} · ${t.genre} ${t.espece}`,
      haystack: [
        o.scientificName,
        o.displayName,
        o.id,
        t.regne,
        t.embranchement,
        t.classe,
        t.ordre,
        t.famille,
        t.genre,
        t.espece,
      ].join(' '),
    };
  });
  const motifs: GlobalHit[] = ROI_MOTIF_CATALOG.filter((m) => m.status !== 'locked').map((m) => {
    const slot = LIF_MOTIF_SLOTS.find((s) => s.itemIds.includes(m.id));
    return {
      id: m.id,
      kind: 'motif',
      kindLabel: 'Motif ROI',
      label: slot?.label || m.name,
      detail: `${m.name} · ${m.sourceSpecies} · ${m.neuronCount} LIF`,
      haystack: [m.name, m.id, m.subtitle, m.sourceSpecies, m.mesh, slot?.label, slot?.placeholder].join(' '),
    };
  });
  const brains: GlobalHit[] = BRAIN_ATLAS_CATALOG.filter((b) => b.status !== 'locked').map((b) => {
    const slot = BRAIN_ATLAS_SLOTS.find((s) => s.itemIds.includes(b.key));
    return {
      id: b.key,
      kind: 'brain',
      kindLabel: 'Atlas',
      label: b.name,
      detail: `${b.sourceSpecies} · ${b.proxyCount.toLocaleString('fr-FR')}`,
      haystack: [b.name, b.key, b.subtitle, b.sourceSpecies, b.mesh, slot?.label, slot?.placeholder].join(' '),
    };
  });
  return [...organisms, ...motifs, ...brains];
}

const GLOBAL_INDEX = buildGlobalIndex();

function globalHits(query: string, limit = 7): GlobalHit[] {
  const q = query.trim();
  if (!q) return [];
  return GLOBAL_INDEX.map((hit) => {
    const onLabel = scoreMatch(q, hit.label);
    const onText = q.length < 2 ? 0 : scoreMatch(q, hit.haystack);
    return { hit, score: Math.max(onLabel, onText) };
  })
    .filter((row) => row.score >= 70)
    .sort((a, b) => b.score - a.score || a.hit.label.localeCompare(b.hit.label, 'fr'))
    .slice(0, limit)
    .map((row) => row.hit);
}

function suggestFrom(list: string[], query: string, limit = 8): string[] {
  if (!query.trim()) return [];
  return list
    .map((name) => ({ name, score: scoreMatch(query, name) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr'))
    .slice(0, limit)
    .map((x) => x.name);
}

@Component({
  selector: 'app-organism-select-drawer',
  imports: [DecimalPipe],
  templateUrl: './organism-select-drawer.html',
  styleUrl: './organism-select-drawer.css',
})
export class OrganismSelectDrawer implements OnDestroy {
  readonly show = input(false);
  readonly choisi = output<string>();
  readonly ferme = output<void>();

  private readonly store = inject(InstrumentStore);
  private stageEl: HTMLCanvasElement | null = null;
  private stageObserver: ResizeObserver | null = null;

  @ViewChild('stage')
  set stage(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.detachStageObserver();
    this.stageEl = ref?.nativeElement ?? null;
    if (this.stageEl && this.show()) {
      this.attachStageObserver(this.stageEl);
      requestAnimationFrame(() => {
        this.bootCarousel();
        requestAnimationFrame(() => this.carousel?.resize());
      });
    }
  }

  readonly filter = signal<TaxonomyFilter>({});
  readonly activeRank = signal<TaxonRank>('regne');
  readonly selectedId = signal(DEFAULT_ORGANISM_ID);
  readonly selectedItem = signal<CarouselNavItem | null>(null);
  readonly selectedIndex = signal(0);
  readonly totalAtRank = signal<number>(COL_SCALE.regne);
  readonly notice = signal('');
  readonly ranks = TAXON_RANKS;
  readonly rankLabels = TAXON_RANK_LABELS;
  readonly colScale = COL_SCALE;

  /** Axe actif du carrousel 3D (taxonomie | motif ROI | atlas). */
  readonly axis = signal<CompositionAxis>('taxon');
  readonly pickedMotifId = signal(DEFAULT_MOTIF_ID);
  readonly pickedBrainId = signal(DEFAULT_BRAIN_ID);
  readonly pickedOrganismId = signal(DEFAULT_ORGANISM_ID);
  /** Signature figée au clic Valider ; le cadenas tient tant que la chaîne ne change pas. */
  private readonly taxonLockSig = signal<string | null>(null);
  private readonly motifLockSig = signal<string | null>(null);
  private readonly brainLockSig = signal<string | null>(null);

  readonly rankQueries = signal<RankQueryMap>(emptyRankQueries());
  readonly searchRank = signal<TaxonRank>('regne');
  readonly openSuggestRank = signal<TaxonRank | null>(null);
  readonly openSuggestList = signal<'motif' | 'brain' | null>(null);
  readonly rankSuggestions = signal<string[]>([]);
  readonly motifSlots = LIF_MOTIF_SLOTS;
  readonly brainSlots = BRAIN_ATLAS_SLOTS;
  readonly motifLine = MOTIF_LINE;
  readonly brainLine = BRAIN_LINE;
  readonly motifQueries = signal<SlotQueryMap>(emptyLine(MOTIF_LINE));
  readonly brainQueries = signal<SlotQueryMap>(emptyLine(BRAIN_LINE));
  readonly searchMotifSlot = signal(LIF_MOTIF_SLOTS[0].id);
  readonly searchBrainSlot = signal(BRAIN_ATLAS_SLOTS[0].id);
  readonly motifSuggestions = signal<string[]>([]);
  readonly brainSuggestions = signal<string[]>([]);
  readonly suggestHighlight = signal(0);
  readonly searchFields = [
    {
      part: 0,
      label: 'Taxonomie',
      placeholder: 'espèce, règne…',
      aria: 'Taxonomie, premier terme de l’O.V.N.I.',
    },
    {
      part: 1,
      label: 'Motif ROI LIF',
      placeholder: 'circuit, sommeil…',
      aria: 'Motif ROI LIF, deuxième terme de l’O.V.N.I.',
    },
    {
      part: 2,
      label: 'Atlas cérébral',
      placeholder: 'FlyWire, Yeo…',
      aria: 'Atlas cérébral, troisième terme de l’O.V.N.I.',
    },
  ] as const;
  readonly searchParts = signal<[string, string, string]>(['', '', '']);
  readonly activeSearchPart = signal<0 | 1 | 2 | null>(null);
  readonly searchHits = signal<GlobalHit[]>([]);
  private searchCloseTimer = 0;
  /** Dé en cours d’animation (un seul à la fois). */
  readonly dieToss = signal<'taxon' | 'motif' | 'brain' | null>(null);
  private dieTossTimer = 0;
  /** Chevron du carrousel en cours de clic. */
  readonly chevronTap = signal<'prev' | 'next' | null>(null);
  private chevronTapTimer = 0;
  /** Bouton d’entrée en cours de clic. */
  readonly enterTap = signal(false);
  private enterTapTimer = 0;
  private entering = false;

  readonly rankPlaceholders: Record<TaxonRank, string> = {
    regne: 'Animalia',
    embranchement: 'Arthropoda',
    classe: 'Insecta',
    ordre: 'Diptera',
    famille: 'Drosophilidae',
    genre: 'Drosophila',
    espece: 'melanogaster',
  };

  private carousel: OrganismCarousel | null = null;
  private source: TaxonBrowseSource | null = null;
  private pointerDown = { x: 0, y: 0 };

  constructor() {
    let prevOpen = false;
    effect(() => {
      const open = this.show();
      if (!open) {
        prevOpen = false;
        this.teardownCarousel();
        return;
      }
      if (!prevOpen) {
        prevOpen = true;
        this.pickedMotifId.set(this.store.selectedMotifId());
        this.pickedBrainId.set(this.store.selectedBrainAtlasId());
        this.pickedOrganismId.set(this.store.selectedOrganismId());
      }
      requestAnimationFrame(() => {
        this.bootCarousel();
        requestAnimationFrame(() => this.carousel?.resize());
      });
    });
  }

  ngOnDestroy(): void {
    this.teardownCarousel();
  }

  private attachStageObserver(canvas: HTMLCanvasElement): void {
    this.stageObserver = new ResizeObserver(() => {
      this.carousel?.resize();
    });
    this.stageObserver.observe(canvas);
    const wrap = canvas.parentElement;
    if (wrap) this.stageObserver.observe(wrap);
  }

  private detachStageObserver(): void {
    this.stageObserver?.disconnect();
    this.stageObserver = null;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.carousel?.resize();
  }

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    if (!this.show()) return;
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      this.next();
    } else if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      this.prev();
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      this.jumpTo(0);
    } else if (ev.key === 'End') {
      ev.preventDefault();
      this.jumpTo(Math.max(0, this.totalAtRank() - 1));
    } else if (ev.key === '1') {
      this.setAxis('taxon');
    } else if (ev.key === '2') {
      this.setAxis('motif');
    } else if (ev.key === '3') {
      this.setAxis('brain');
    }
  }

  setAxis(axis: CompositionAxis): void {
    this.axis.set(axis);
    this.openSuggestRank.set(null);
    this.openSuggestList.set(null);
    this.rebuildScene();
  }

  /**
   * Clic sur une case taxonomique → carrousel du rang cliqué
   * (parents conservés, valeur du rang et descendants effacés).
   */
  activateRank(rank: TaxonRank): void {
    this.searchRank.set(rank);
    this.openSuggestList.set(null);
    this.openSuggestRank.set(null);
    const idx = TAXON_RANKS.indexOf(rank);
    const prev = this.filter();
    const next: TaxonomyFilter = {};
    for (let i = 0; i < idx; i++) {
      const r = TAXON_RANKS[i];
      if (prev[r]) next[r] = prev[r];
    }
    this.filter.set(next);
    this.rankQueries.update((q) => {
      const copy = { ...q };
      for (let i = idx; i < TAXON_RANKS.length; i++) copy[TAXON_RANKS[i]] = '';
      return copy;
    });
    this.axis.set('taxon');
    this.rebuildScene(0);
  }

  onRankFocus(rank: TaxonRank): void {
    this.searchRank.set(rank);
    this.openSuggestList.set(null);
    this.searchHits.set([]);
    const axisChanged = this.axis() !== 'taxon';
    this.axis.set('taxon');
    if (axisChanged) this.rebuildScene(0);
    this.refreshRankSuggestions(rank);
  }

  onRankInput(rank: TaxonRank, value: string): void {
    this.rankQueries.update((q) => ({ ...q, [rank]: value }));
    this.searchRank.set(rank);
    this.suggestHighlight.set(0);
    this.refreshRankSuggestions(rank);
  }

  onRankKeydown(rank: TaxonRank, ev: KeyboardEvent): void {
    const list = this.rankSuggestions();
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.suggestHighlight.set(Math.min(list.length - 1, this.suggestHighlight() + 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.suggestHighlight.set(Math.max(0, this.suggestHighlight() - 1));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.commitRankSearch(rank);
    } else if (ev.key === 'Escape') {
      this.openSuggestRank.set(null);
      (ev.target as HTMLInputElement).blur();
    }
  }

  onRankBlur(): void {
    setTimeout(() => this.openSuggestRank.set(null), 140);
  }

  commitRankSearch(rank: TaxonRank, name?: string): void {
    const picks = this.rankSuggestions();
    const chosen =
      name || picks[Math.max(0, this.suggestHighlight())] || picks[0] || this.rankQueries()[rank].trim();
    if (!chosen) return;

    this.rankQueries.update((q) => {
      const next = { ...q, [rank]: chosen };
      const idx = TAXON_RANKS.indexOf(rank);
      for (let i = idx + 1; i < TAXON_RANKS.length; i++) next[TAXON_RANKS[i]] = '';
      return next;
    });
    this.openSuggestRank.set(null);
    this.axis.set('taxon');
    this.selectTaxon(rank, chosen);
    requestAnimationFrame(() => this.jumpCarouselToName(chosen));
  }

  activateMotifSlot(slotId: string): void {
    this.searchMotifSlot.set(slotId);
    this.openSuggestRank.set(null);
    this.openSuggestList.set(null);
    const slot = LIF_MOTIF_SLOTS.find((s) => s.id === slotId);
    const motifId = slot?.itemIds[0];
    if (!slot || !motifId) return;
    this.pickedMotifId.set(motifId);
    this.store.setSelectedMotif(motifId);
    const motif = findMotif(motifId);
    if (motif) this.motifQueries.update((q) => ({ ...q, [slot.id]: motif.name }));
    this.axis.set('motif');
    this.rebuildScene();
    requestAnimationFrame(() => {
      const items = motifNavItems();
      const i = items.findIndex((x) => x.id === motifId);
      if (i >= 0) this.jumpTo(i);
    });
  }

  onMotifSlotFocus(slotId: string): void {
    this.searchMotifSlot.set(slotId);
    this.openSuggestRank.set(null);
    this.searchHits.set([]);
    const axisChanged = this.axis() !== 'motif';
    this.axis.set('motif');
    if (axisChanged) this.rebuildScene();
    this.openSuggestList.set('motif');
    this.refreshMotifSuggestions(slotId);
  }

  onMotifSlotInput(slotId: string, value: string): void {
    this.motifQueries.update((q) => ({ ...q, [slotId]: value }));
    this.searchMotifSlot.set(slotId);
    this.suggestHighlight.set(0);
    this.openSuggestList.set('motif');
    this.refreshMotifSuggestions(slotId);
  }

  onMotifSlotKeydown(slotId: string, ev: KeyboardEvent): void {
    const list = this.motifSuggestions();
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.suggestHighlight.set(Math.min(list.length - 1, this.suggestHighlight() + 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.suggestHighlight.set(Math.max(0, this.suggestHighlight() - 1));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.commitMotifSearch();
    } else if (ev.key === 'Escape') {
      this.openSuggestList.set(null);
    }
  }

  commitMotifSearch(name?: string): void {
    const fieldId = this.searchMotifSlot();
    const picks = this.motifSuggestions();
    const typed = this.motifQueries()[fieldId]?.trim();
    const chosen = name || picks[Math.max(0, this.suggestHighlight())] || picks[0] || typed;
    if (!chosen) return;
    if (fieldId === 'circuit' || fieldId === 'famille' || fieldId === 'identifiant') {
      const motif = this.resolveMotif(chosen);
      if (motif) {
        this.applyMotif(motif);
        this.openSuggestList.set(null);
        return;
      }
    }
    this.motifQueries.update((q) => ({ ...q, [fieldId]: chosen }));
    this.openSuggestList.set(null);
    this.publishMotif();
  }

  clearMotifField(fieldId: string): void {
    this.motifQueries.update((q) => ({ ...q, [fieldId]: '' }));
    this.openSuggestList.set(null);
  }

  activateBrainSlot(slotId: string): void {
    this.searchBrainSlot.set(slotId);
    this.openSuggestRank.set(null);
    this.openSuggestList.set(null);
    const slot = BRAIN_ATLAS_SLOTS.find((s) => s.id === slotId);
    const brainId = slot?.itemIds[0];
    if (!slot || !brainId) return;
    this.pickedBrainId.set(brainId);
    this.store.setSelectedBrainAtlas(brainId);
    const brain = findBrain(brainId);
    if (brain) this.brainQueries.update((q) => ({ ...q, [slot.id]: brain.name }));
    this.axis.set('brain');
    this.rebuildScene();
    requestAnimationFrame(() => {
      const items = brainNavItems();
      const i = items.findIndex((x) => x.id === brainId);
      if (i >= 0) this.jumpTo(i);
    });
  }

  onBrainSlotFocus(slotId: string): void {
    this.searchBrainSlot.set(slotId);
    this.openSuggestRank.set(null);
    this.searchHits.set([]);
    const axisChanged = this.axis() !== 'brain';
    this.axis.set('brain');
    if (axisChanged) this.rebuildScene();
    this.openSuggestList.set('brain');
    this.refreshBrainSuggestions(slotId);
  }

  onBrainSlotInput(slotId: string, value: string): void {
    this.brainQueries.update((q) => ({ ...q, [slotId]: value }));
    this.searchBrainSlot.set(slotId);
    this.suggestHighlight.set(0);
    this.openSuggestList.set('brain');
    this.refreshBrainSuggestions(slotId);
  }

  onBrainSlotKeydown(slotId: string, ev: KeyboardEvent): void {
    const list = this.brainSuggestions();
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.suggestHighlight.set(Math.min(list.length - 1, this.suggestHighlight() + 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.suggestHighlight.set(Math.max(0, this.suggestHighlight() - 1));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.commitBrainSearch();
    } else if (ev.key === 'Escape') {
      this.openSuggestList.set(null);
    }
  }

  commitBrainSearch(name?: string): void {
    const fieldId = this.searchBrainSlot();
    const picks = this.brainSuggestions();
    const typed = this.brainQueries()[fieldId]?.trim();
    const chosen = name || picks[Math.max(0, this.suggestHighlight())] || picks[0] || typed;
    if (!chosen) return;
    if (fieldId === 'atlas' || fieldId === 'famille' || fieldId === 'identifiant') {
      const brain = this.resolveBrain(chosen);
      if (brain) {
        this.applyBrain(brain);
        this.openSuggestList.set(null);
        return;
      }
    }
    this.brainQueries.update((q) => ({ ...q, [fieldId]: chosen }));
    this.openSuggestList.set(null);
    this.publishBrain();
  }

  clearBrainField(fieldId: string): void {
    this.brainQueries.update((q) => ({ ...q, [fieldId]: '' }));
    this.openSuggestList.set(null);
  }

  onListBlur(): void {
    setTimeout(() => this.openSuggestList.set(null), 140);
  }

  private parentFilterFor(rank: TaxonRank): TaxonomyFilter {
    const f = this.filter();
    const out: TaxonomyFilter = {};
    const idx = TAXON_RANKS.indexOf(rank);
    for (let i = 0; i < idx; i++) {
      const r = TAXON_RANKS[i];
      if (f[r]) out[r] = f[r];
    }
    return out;
  }

  private refreshRankSuggestions(rank: TaxonRank): void {
    const q = this.rankQueries()[rank];
    const pool = optionsAtRank(rank, this.parentFilterFor(rank));
    const list = q.trim() ? suggestFrom(pool, q) : pool.slice(0, 8);
    this.rankSuggestions.set(list);
    this.openSuggestRank.set(rank);
  }

  private refreshMotifSuggestions(fieldId: string): void {
    const pool = this.motifFieldPool(fieldId);
    const q = this.motifQueries()[fieldId] || '';
    const list = q.trim() ? suggestFrom(pool, q) : pool.slice(0, 8);
    this.motifSuggestions.set(list);
    this.openSuggestList.set('motif');
  }

  private refreshBrainSuggestions(fieldId: string): void {
    const pool = this.brainFieldPool(fieldId);
    const q = this.brainQueries()[fieldId] || '';
    const list = q.trim() ? suggestFrom(pool, q) : pool.slice(0, 8);
    this.brainSuggestions.set(list);
    this.openSuggestList.set('brain');
  }

  private motifFieldPool(fieldId: string): string[] {
    const open = ROI_MOTIF_CATALOG.filter((m) => m.status !== 'locked');
    if (fieldId === 'circuit') {
      return uniqueStrings(open.map((m) => m.name));
    }
    if (fieldId === 'famille') {
      return uniqueStrings(
        LIF_MOTIF_SLOTS.filter((s) => open.some((m) => s.itemIds.includes(m.id))).map((s) => s.label),
      );
    }
    if (fieldId === 'identifiant') return uniqueStrings(open.map((m) => m.id));
    if (fieldId === 'resume') return uniqueStrings(open.map((m) => m.subtitle));
    if (fieldId === 'origine') return uniqueStrings(open.map((m) => m.sourceSpecies));
    if (fieldId === 'neurones') return uniqueStrings(open.map((m) => `${m.neuronCount} LIF`));
    if (fieldId === 'synapses') return uniqueStrings(open.map((m) => String(m.edgeCount)));
    if (fieldId === 'maille') return uniqueStrings(open.map((m) => m.mesh));
    if (fieldId === 'statut') return uniqueStrings(open.map((m) => this.statusLabel(m.status)));
    return [];
  }

  private brainFieldPool(fieldId: string): string[] {
    const open = BRAIN_ATLAS_CATALOG.filter((b) => b.status !== 'locked');
    if (fieldId === 'atlas') {
      return uniqueStrings(open.map((b) => b.name));
    }
    if (fieldId === 'famille') {
      return uniqueStrings(
        BRAIN_ATLAS_SLOTS.filter((s) => open.some((b) => s.itemIds.includes(b.key))).map((s) => s.label),
      );
    }
    if (fieldId === 'identifiant') return uniqueStrings(open.map((b) => b.key));
    if (fieldId === 'resume') return uniqueStrings(open.map((b) => b.subtitle));
    if (fieldId === 'origine') return uniqueStrings(open.map((b) => b.sourceSpecies));
    if (fieldId === 'effectif') return uniqueStrings(open.map((b) => b.proxyCount.toLocaleString('fr-FR')));
    if (fieldId === 'maille') return uniqueStrings(open.map((b) => b.mesh));
    if (fieldId === 'vnc') return ['absente', 'présente'];
    if (fieldId === 'statut') return uniqueStrings(open.map((b) => this.statusLabel(b.status)));
    return [];
  }

  private resolveMotif(chosen: string) {
    const byName = ROI_MOTIF_CATALOG.find((m) => m.name === chosen || m.id === chosen);
    if (byName && byName.status !== 'locked') return byName;
    const slot = LIF_MOTIF_SLOTS.find((s) => s.label.toLowerCase() === chosen.toLowerCase());
    const motif = slot ? findMotif(slot.itemIds[0]) : undefined;
    return motif && motif.status !== 'locked' ? motif : undefined;
  }

  private resolveBrain(chosen: string) {
    const byName = BRAIN_ATLAS_CATALOG.find((b) => b.name === chosen || b.key === chosen);
    if (byName && byName.status !== 'locked') return byName;
    const slot = BRAIN_ATLAS_SLOTS.find((s) => s.label.toLowerCase() === chosen.toLowerCase());
    const brain = slot ? findBrain(slot.itemIds[0]) : undefined;
    return brain && brain.status !== 'locked' ? brain : undefined;
  }

  private jumpCarouselToName(name: string): void {
    if (!this.source) return;
    const limit = Math.min(this.source.total, 800);
    for (let i = 0; i < limit; i++) {
      if (this.source.getItem(i).name === name) {
        this.jumpTo(i);
        return;
      }
    }
  }

  /** Les pods affichent la ligne tirée au dé, pas l’aperçu du carrousel. */
  compositionTaxonLabel(): string {
    return this.organismFromChain()?.displayName || '—';
  }

  compositionMotifLabel(): string {
    const id = this.motifIdFromChain();
    return id ? findMotif(id)?.name || '—' : '—';
  }

  compositionMotifSpecies(): string {
    const id = this.motifIdFromChain();
    return id ? findMotif(id)?.sourceSpecies || '—' : '—';
  }

  compositionBrainLabel(): string {
    const id = this.brainIdFromChain();
    return id ? findBrain(id)?.name || '—' : '—';
  }

  compositionBrainSpecies(): string {
    const id = this.brainIdFromChain();
    return id ? findBrain(id)?.tagline || '—' : '—';
  }

  axisHint(): string {
    if (this.axis() === 'motif') return 'Aperçu · la ligne jaune se tire au dé';
    if (this.axis() === 'brain') return 'Aperçu · la ligne bleue se tire au dé';
    return 'Aperçu · la ligne verte se tire au dé';
  }

  axisCounterLabel(): string {
    if (this.axis() === 'motif') return 'Motif';
    if (this.axis() === 'brain') return 'Atlas';
    return `${this.rankLabels[this.browsingRank()]} · Avatar`;
  }

  kindBadge(kind: CarouselNavItem['kind']): string {
    if (kind === 'motif') return 'Motif ROI';
    if (kind === 'brain') return 'Atlas';
    if (kind === 'taxon') return 'Taxon';
    return this.statusLabel(this.selectedItem()?.status || 'preview');
  }

  confirmLabel(): string {
    const ax = this.axis();
    if (ax === 'motif') return 'Valider ce motif';
    if (ax === 'brain') return 'Valider cet atlas';
    return this.selectedItem()?.kind === 'taxon' ? 'Entrer dans ce taxon' : 'Valider l’espèce';
  }

  clearRankQuery(rank: TaxonRank, ev?: Event): void {
    ev?.stopPropagation();
    this.rankQueries.update((q) => ({ ...q, [rank]: '' }));
    this.clearFrom(rank);
  }

  clearMotifQuery(slotId: string, ev?: Event): void {
    ev?.stopPropagation();
    this.motifQueries.update((q) => ({ ...q, [slotId]: '' }));
    const slot = LIF_MOTIF_SLOTS.find((s) => s.id === slotId);
    if (slot && slot.itemIds.includes(this.pickedMotifId())) {
      const leftover = LIF_MOTIF_SLOTS.find((s) => s.id !== slotId && this.motifQueries()[s.id]);
      const nextId = leftover?.itemIds[0] || DEFAULT_MOTIF_ID;
      this.pickedMotifId.set(nextId);
      this.searchMotifSlot.set(leftover?.id || LIF_MOTIF_SLOTS[0].id);
      this.store.setSelectedMotif(nextId);
      this.rebuildScene();
    }
  }

  clearBrainQuery(slotId: string, ev?: Event): void {
    ev?.stopPropagation();
    this.brainQueries.update((q) => ({ ...q, [slotId]: '' }));
    const slot = BRAIN_ATLAS_SLOTS.find((s) => s.id === slotId);
    if (slot && slot.itemIds.includes(this.pickedBrainId())) {
      const leftover = BRAIN_ATLAS_SLOTS.find((s) => s.id !== slotId && this.brainQueries()[s.id]);
      const nextId = leftover?.itemIds[0] || DEFAULT_BRAIN_ID;
      this.pickedBrainId.set(nextId);
      this.searchBrainSlot.set(leftover?.id || BRAIN_ATLAS_SLOTS[0].id);
      this.store.setSelectedBrainAtlas(nextId);
      this.rebuildScene();
    }
  }

  /** Chaîne taxonomique complète : les 7 rangs affichés ont une valeur, et une espèce du catalogue correspond. */
  taxonChainReady(): boolean {
    const f = this.filter();
    if (!TAXON_RANKS.every((r) => !!f[r]?.trim())) return false;
    return filterOrganisms(f).length > 0;
  }

  /** Verrouille l’espèce seulement quand la chaîne taxonomique est remplie. */
  validateTaxonomy(): void {
    if (!this.taxonChainReady()) return;
    const org = filterOrganisms(this.filter())[0];
    if (!org) return;
    this.pickedOrganismId.set(org.id);
    this.taxonLockSig.set(this.taxonSignature());
    this.publishOrganism();
  }

  taxonChainLocked(): boolean {
    return this.taxonChainReady() && this.taxonLockSig() === this.taxonSignature();
  }

  /** La ligne or est prête quand le dé a écrit tout le dossier du motif. */
  motifChainReady(): boolean {
    return !!this.motifIdFromChain();
  }

  /** Verrouille le motif seulement quand la ligne est remplie. */
  validateMotif(): void {
    const id = this.motifIdFromChain();
    if (!id) return;
    this.pickedMotifId.set(id);
    this.motifLockSig.set(this.motifSignature());
    this.publishMotif();
  }

  motifChainLocked(): boolean {
    return this.motifChainReady() && this.motifLockSig() === this.motifSignature();
  }

  /** La ligne cyan est prête quand le dé a écrit tout le dossier de l’atlas. */
  brainChainReady(): boolean {
    return !!this.brainIdFromChain();
  }

  /** Verrouille l’atlas seulement quand la ligne est remplie. */
  validateBrain(): void {
    const id = this.brainIdFromChain();
    if (!id) return;
    this.pickedBrainId.set(id);
    this.brainLockSig.set(this.brainSignature());
    this.publishBrain();
  }

  brainChainLocked(): boolean {
    return this.brainChainReady() && this.brainLockSig() === this.brainSignature();
  }

  private taxonSignature(): string {
    const f = this.filter();
    return [this.pickedOrganismId(), ...TAXON_RANKS.map((r) => f[r] || '')].join('\u001f');
  }

  private motifSignature(): string {
    const q = this.motifQueries();
    return [this.pickedMotifId(), ...MOTIF_LINE.map((f) => q[f.id] || '')].join('\u001f');
  }

  private brainSignature(): string {
    const q = this.brainQueries();
    return [this.pickedBrainId(), ...BRAIN_LINE.map((f) => q[f.id] || '')].join('\u001f');
  }

  /** Les trois Valider sont verrouillés : l’entrée peut passer devant. */
  chainsLocked(): boolean {
    return this.taxonChainLocked() && this.motifChainLocked() && this.brainChainLocked();
  }

  /** Joue le sursaut, puis ouvre le laboratoire. */
  playEnter(): void {
    if (!this.chainsLocked() || this.entering) return;
    this.entering = true;
    this.enterTap.set(false);
    window.clearTimeout(this.enterTapTimer);
    window.setTimeout(() => {
      this.enterTap.set(true);
      this.enterTapTimer = window.setTimeout(() => this.enterLab(), 420);
    }, 20);
  }

  enterLab(): void {
    if (!this.chainsLocked()) {
      this.entering = false;
      this.enterTap.set(false);
      return;
    }
    const org = this.organismFromChain();
    const motifId = this.motifIdFromChain();
    const brainId = this.brainIdFromChain();
    if (!org || !motifId || !brainId || org.status === 'locked') {
      this.entering = false;
      this.enterTap.set(false);
      return;
    }
    this.pickedOrganismId.set(org.id);
    this.pickedMotifId.set(motifId);
    this.pickedBrainId.set(brainId);
    this.publishOrganism();
    this.publishMotif();
    this.publishBrain();
    this.store.setHybridComposition({
      organismId: org.id,
      organismLabel: org.scientificName,
      motifId,
      brainAtlasId: brainId,
    });
    this.choisi.emit(org.id);
    this.ferme.emit();
  }

  private organismFromChain() {
    if (!this.taxonChainReady()) return undefined;
    const matches = filterOrganisms(this.filter());
    return matches.find((o) => o.id === this.pickedOrganismId()) || matches[0];
  }

  private motifIdFromChain(): string | null {
    const q = this.motifQueries();
    if (!MOTIF_LINE.every((f) => !!q[f.id]?.trim())) return null;
    const name = q['circuit'].trim();
    const motif = ROI_MOTIF_CATALOG.find((m) => m.name === name || m.id === name);
    if (!motif || motif.status === 'locked') return null;
    return motif.id;
  }

  private brainIdFromChain(): string | null {
    const q = this.brainQueries();
    if (!BRAIN_LINE.every((f) => !!q[f.id]?.trim())) return null;
    const name = q['atlas'].trim();
    const brain = BRAIN_ATLAS_CATALOG.find((b) => b.name === name || b.key === name);
    if (!brain || brain.status === 'locked') return null;
    return brain.key;
  }

  /** Chaque dé ne touche que son axe : l’ordre des trois tirages ne réécrit pas les autres. */
  private publishOrganism(): void {
    const org = this.organismFromChain();
    if (!org || org.status === 'locked') return;
    this.store.setSelectedOrganism(org.id, org.scientificName);
  }

  private publishMotif(): void {
    const id = this.motifIdFromChain();
    if (id) this.store.setSelectedMotif(id);
  }

  private publishBrain(): void {
    const id = this.brainIdFromChain();
    if (id) this.store.setSelectedBrainAtlas(id);
  }

  taxonOptions(rank: TaxonRank): string[] {
    const opts = optionsAtRank(rank, this.filter());
    if (rank === 'regne') return opts;
    return opts.slice(0, 24);
  }

  colCount(rank: TaxonRank): string {
    return COL_SCALE[rank].toLocaleString('fr-FR');
  }

  breadcrumb(): { rank: TaxonRank; label: string; value: string }[] {
    const f = this.filter();
    return TAXON_RANKS.filter((r) => f[r]).map((r) => ({
      rank: r,
      label: TAXON_RANK_LABELS[r],
      value: f[r]!,
    }));
  }

  focusTaxonChip(rank: TaxonRank, value: string): void {
    this.ensureReady();
    if (!this.source || this.source.rank !== rank) {
      this.selectTaxon(rank, value);
      return;
    }
    const total = this.source.total;
    const limit = Math.min(total, 500);
    for (let i = 0; i < limit; i++) {
      if (this.source.getItem(i).name === value) {
        this.jumpTo(i);
        this.notice.set(
          `Avatar ${i + 1} / ${total.toLocaleString('fr-FR')} · ${value} — Entrée pour descendre`,
        );
        return;
      }
    }
    this.selectTaxon(rank, value);
  }

  selectTaxon(rank: TaxonRank, value: string): void {
    const prev = this.filter();
    const idx = TAXON_RANKS.indexOf(rank);
    const next: TaxonomyFilter = {};
    for (let i = 0; i < idx; i++) {
      const r = TAXON_RANKS[i];
      if (prev[r]) next[r] = prev[r];
    }
    const sample = sampleOrganismFor(rank, value, next);
    if (sample) {
      for (let i = 0; i < idx; i++) {
        next[TAXON_RANKS[i]] = sample.taxonomy[TAXON_RANKS[i]];
      }
    } else if (rank === 'embranchement' && !next.regne) {
      for (const [k, list] of Object.entries(PHYLA_BY_KINGDOM)) {
        if (list.includes(value)) {
          next.regne = k;
          break;
        }
      }
    }
    next[rank] = value;
    this.filter.set(next);
    this.rankQueries.update(() => {
      const copy = emptyRankQueries();
      for (const r of TAXON_RANKS) {
        if (next[r]) copy[r] = next[r]!;
      }
      return copy;
    });
    const nextBrowse = nextRankAfter(next);
    this.searchRank.set(nextBrowse);
    this.rebuildScene(0);
  }

  clearFrom(rank: TaxonRank): void {
    const next: TaxonomyFilter = { ...this.filter() };
    const idx = TAXON_RANKS.indexOf(rank);
    for (let i = idx; i < TAXON_RANKS.length; i++) {
      delete next[TAXON_RANKS[i]];
    }
    this.filter.set(next);
    this.rankQueries.update((q) => {
      const copy = { ...q };
      for (let i = idx; i < TAXON_RANKS.length; i++) copy[TAXON_RANKS[i]] = '';
      return copy;
    });
    this.searchRank.set(rank);
    if (this.axis() === 'taxon') this.rebuildScene(0);
  }

  resetTaxonomy(): void {
    this.clearTaxonomyChain();
  }

  /** Vide la chaîne taxonomie et retire le cadenas. */
  clearTaxonomyChain(): void {
    this.filter.set({});
    this.rankQueries.set(emptyRankQueries());
    this.searchRank.set('regne');
    this.taxonLockSig.set(null);
    this.openSuggestRank.set(null);
    if (this.axis() === 'taxon') this.rebuildScene(0);
  }

  /** Vide la chaîne motif et retire le cadenas. */
  clearMotifChain(): void {
    this.motifQueries.set(emptyLine(MOTIF_LINE));
    this.searchMotifSlot.set(MOTIF_LINE[0].id);
    this.motifLockSig.set(null);
    if (this.openSuggestList() === 'motif') this.openSuggestList.set(null);
    if (this.axis() === 'motif') this.rebuildScene();
  }

  /** Vide la chaîne atlas et retire le cadenas. */
  clearBrainChain(): void {
    this.brainQueries.set(emptyLine(BRAIN_LINE));
    this.searchBrainSlot.set(BRAIN_LINE[0].id);
    this.brainLockSig.set(null);
    if (this.openSuggestList() === 'brain') this.openSuggestList.set(null);
    if (this.axis() === 'brain') this.rebuildScene();
  }

  taxonChainFilled(): boolean {
    const f = this.filter();
    const q = this.rankQueries();
    return TAXON_RANKS.some((r) => !!f[r]?.trim() || !!q[r]?.trim());
  }

  motifChainFilled(): boolean {
    const q = this.motifQueries();
    return MOTIF_LINE.some((f) => !!q[f.id]?.trim());
  }

  brainChainFilled(): boolean {
    const q = this.brainQueries();
    return BRAIN_LINE.some((f) => !!q[f.id]?.trim());
  }

  goUp(): void {
    const f = this.filter();
    const filled = TAXON_RANKS.filter((r) => f[r]);
    if (!filled.length) return;
    this.clearFrom(filled[filled.length - 1]);
  }

  next(): void {
    this.ensureReady();
    this.carousel?.next();
    this.syncFromCarousel();
  }

  prev(): void {
    this.ensureReady();
    this.carousel?.prev();
    this.syncFromCarousel();
  }

  jumpTo(index: number): void {
    this.ensureReady();
    this.carousel?.selectIndex(index, true);
    this.syncFromCarousel();
  }

  onJumpInput(raw: string): void {
    const n = Number(raw.replace(/\s/g, '').replace(',', ''));
    if (!Number.isFinite(n) || n < 1) return;
    this.jumpTo(Math.floor(n) - 1);
  }

  onPointerDown(ev: PointerEvent): void {
    this.pointerDown = { x: ev.clientX, y: ev.clientY };
  }

  onCanvasClick(ev: MouseEvent): void {
    const dx = ev.clientX - this.pointerDown.x;
    const dy = ev.clientY - this.pointerDown.y;
    if (dx * dx + dy * dy > 36) return;
    this.ensureReady();
    const idx = this.carousel?.pick(ev.clientX, ev.clientY);
    if (idx == null) return;
    this.carousel?.selectIndex(idx, false);
    this.syncFromCarousel();
  }

  onCanvasDblClick(): void {
    return;
  }

  /** Le carrousel reste un aperçu. La chimère se compose uniquement avec les dés. */
  activateSelection(): void {
    return;
  }

  confirm(): void {
    this.activateSelection();
  }

  private confirmOrganism(item: CarouselNavItem): void {
    const o = item.organism || findOrganism(item.id);
    if (!o) {
      this.notice.set(
        'Avatar CoL générique — pas encore de moteur LIF. Validez une espèce du catalogue ou Random Pick.',
      );
      return;
    }
    if (o.status === 'locked') {
      this.notice.set(`${o.displayName} verrouillé — choisissez une autre espèce.`);
      return;
    }
    this.pickedOrganismId.set(o.id);
    this.store.setHybridComposition({
      organismId: o.id,
      organismLabel: o.scientificName,
      motifId: this.pickedMotifId(),
      brainAtlasId: this.pickedBrainId(),
    });
    const motif = findMotif(this.pickedMotifId());
    const brain = findBrain(this.pickedBrainId());
    this.notice.set(
      `Composition · ${o.scientificName} × ${motif?.name} (${motif?.sourceSpecies}) × ${brain?.name} (${brain?.sourceSpecies})`,
    );
    this.choisi.emit(o.id);
    this.ferme.emit();
  }

  /** Pousse le chevron dans son sens, assez court pour rester lisible. */
  playChevron(which: 'prev' | 'next'): void {
    this.chevronTap.set(null);
    window.clearTimeout(this.chevronTapTimer);
    window.setTimeout(() => {
      this.chevronTap.set(which);
      this.chevronTapTimer = window.setTimeout(() => {
        if (this.chevronTap() === which) this.chevronTap.set(null);
      }, 420);
    }, 20);
  }

  /** Petit saut du dé, assez court pour rester lisible. */
  playDie(which: 'taxon' | 'motif' | 'brain'): void {
    this.dieToss.set(null);
    window.clearTimeout(this.dieTossTimer);
    window.setTimeout(() => {
      this.dieToss.set(which);
      this.dieTossTimer = window.setTimeout(() => {
        if (this.dieToss() === which) this.dieToss.set(null);
      }, 560);
    }, 20);
  }

  /** Tire un autre item que celui déjà affiché, pour que le dé change vraiment de résultat. */
  private drawOther<T>(draw: () => T, currentKey: string, keyOf: (item: T) => string): T {
    let chosen = draw();
    for (let i = 0; i < 12 && keyOf(chosen) === currentKey; i++) chosen = draw();
    return chosen;
  }

  onGlobalSearch(part: 0 | 1 | 2, value: string): void {
    window.clearTimeout(this.searchCloseTimer);
    this.searchParts.update((parts) => {
      const next: [string, string, string] = [...parts];
      next[part] = value;
      return next;
    });
    this.activeSearchPart.set(part);
    this.searchHits.set(globalHits(value));
    this.suggestHighlight.set(0);
  }

  onSearchKey(part: 0 | 1 | 2, ev: KeyboardEvent): void {
    if (this.activeSearchPart() !== part) return;
    const list = this.searchHits();
    if (ev.key === 'ArrowDown' && list.length) {
      ev.preventDefault();
      this.suggestHighlight.set(Math.min(list.length - 1, this.suggestHighlight() + 1));
    } else if (ev.key === 'ArrowUp' && list.length) {
      ev.preventDefault();
      this.suggestHighlight.set(Math.max(0, this.suggestHighlight() - 1));
    } else if (ev.key === 'Enter' && list.length) {
      ev.preventDefault();
      this.pickGlobalHit(list[this.suggestHighlight()] || list[0]);
    } else if (ev.key === 'Escape') {
      this.searchHits.set([]);
    }
  }

  closeGlobalSearchSoon(): void {
    window.clearTimeout(this.searchCloseTimer);
    this.searchCloseTimer = window.setTimeout(() => {
      this.searchHits.set([]);
      this.activeSearchPart.set(null);
    }, 160);
  }

  pickGlobalHit(hit: GlobalHit): void {
    const part = this.activeSearchPart();
    if (hit.kind === 'taxon') {
      const org = findOrganism(hit.id);
      if (org) this.applyOrganism(org);
    } else if (hit.kind === 'motif') {
      const motif = findMotif(hit.id);
      if (motif) this.applyMotif(motif);
    } else {
      const brain = findBrain(hit.id);
      if (brain) this.applyBrain(brain);
    }
    if (part !== null) {
      this.searchParts.update((parts) => {
        const next: [string, string, string] = [...parts];
        next[part] = hit.label;
        return next;
      });
    }
    this.searchHits.set([]);
  }

  /** Remplit la chaîne taxonomie avec une autre espèce. Le cadenas n’apparaît qu’au clic Valider. */
  randomizeTaxonomyChain(): void {
    const org = this.drawOther(randomPickOrganism, this.pickedOrganismId(), (o) => o.id);
    this.applyOrganism(org);
  }

  /** Remplit tout le dossier du motif et met à jour seulement le circuit 3D. */
  randomizeMotifChain(): void {
    const active = this.drawOther(randomPickMotif, this.pickedMotifId(), (m) => m.id);
    this.applyMotif(active);
  }

  /** Remplit tout le dossier de l’atlas et met à jour seulement le nuage 4D. */
  randomizeBrainChain(): void {
    const active = this.drawOther(randomPickBrain, this.pickedBrainId(), (b) => b.key);
    this.applyBrain(active);
  }

  private applyOrganism(org: OvniOrganismChoice): void {
    const tax = org.taxonomy;
    this.filter.set({ ...tax });
    this.rankQueries.set({
      regne: tax.regne,
      embranchement: tax.embranchement,
      classe: tax.classe,
      ordre: tax.ordre,
      famille: tax.famille,
      genre: tax.genre,
      espece: tax.espece,
    });
    this.pickedOrganismId.set(org.id);
    this.searchRank.set('espece');
    this.axis.set('taxon');
    const source = createBrowseSource({ ...tax }, 'espece');
    let idx = 0;
    const limit = Math.min(source.total, 400);
    for (let i = 0; i < limit; i++) {
      const item = source.getItem(i);
      if (item.id === org.id || item.organism?.id === org.id) {
        idx = i;
        break;
      }
    }
    this.rebuildScene(idx);
    this.publishOrganism();
  }

  private motifFamille(active: RoiMotifChoice): string {
    return LIF_MOTIF_SLOTS.find((s) => s.itemIds.includes(active.id))?.label || active.name;
  }

  private brainFamille(active: BrainAtlasChoice): string {
    return BRAIN_ATLAS_SLOTS.find((s) => s.itemIds.includes(active.key))?.label || active.name;
  }

  private applyMotif(active: RoiMotifChoice): void {
    this.motifQueries.set({
      circuit: active.name,
      famille: this.motifFamille(active),
      identifiant: active.id,
      resume: active.subtitle,
      origine: active.sourceSpecies,
      neurones: `${active.neuronCount} LIF`,
      synapses: String(active.edgeCount),
      maille: active.mesh,
      statut: this.statusLabel(active.status),
    });
    this.searchMotifSlot.set('circuit');
    this.pickedMotifId.set(active.id);
    this.axis.set('motif');
    this.rebuildScene();
    this.publishMotif();
  }

  private applyBrain(active: BrainAtlasChoice): void {
    this.brainQueries.set({
      atlas: active.name,
      famille: this.brainFamille(active),
      identifiant: active.key,
      resume: active.subtitle,
      origine: active.sourceSpecies,
      effectif: active.proxyCount.toLocaleString('fr-FR'),
      maille: active.mesh,
      vnc: active.key === 'malecns_brain_vnc_2026' ? 'présente' : 'absente',
      statut: this.statusLabel(active.status),
    });
    this.searchBrainSlot.set('atlas');
    this.pickedBrainId.set(active.key);
    this.axis.set('brain');
    this.rebuildScene();
    this.publishBrain();
  }

  statusLabel(s: OrganismStatus): string {
    if (s === 'ready') return 'Prêt';
    if (s === 'preview') return 'Teaser';
    return 'CoL';
  }

  browsingRank(): TaxonRank {
    return nextRankAfter(this.filter());
  }

  private ensureReady(): void {
    if (!this.carousel || this.carousel.slotCount() === 0) this.bootCarousel();
  }

  private bootCarousel(): void {
    if (!this.show() || !this.stageEl) return;
    if (!this.carousel) this.carousel = new OrganismCarousel();
    this.carousel.mount(this.stageEl);
    this.rebuildScene();
    this.carousel.resize();
  }

  private teardownCarousel(): void {
    this.detachStageObserver();
    this.carousel?.dispose();
    this.carousel = null;
    this.source = null;
  }

  private rebuildScene(preferIndex?: number): void {
    if (!this.stageEl) return;
    if (!this.carousel) {
      this.carousel = new OrganismCarousel();
      this.carousel.mount(this.stageEl);
    } else {
      this.carousel.mount(this.stageEl);
    }

    const ax = this.axis();
    if (ax === 'motif') {
      this.source = null;
      const items = motifNavItems();
      const chainId = this.motifIdFromChain();
      let idx =
        preferIndex ??
        items.findIndex((i) => i.id === (chainId || this.pickedMotifId()));
      if (idx < 0) idx = 0;
      this.totalAtRank.set(items.length);
      this.carousel.setItems(items, items[idx]?.id);
      this.carousel.resize();
      this.syncFromCarousel();
      return;
    }

    if (ax === 'brain') {
      this.source = null;
      const items = brainNavItems();
      const chainId = this.brainIdFromChain();
      let idx =
        preferIndex ??
        items.findIndex((i) => i.id === (chainId || this.pickedBrainId()));
      if (idx < 0) idx = 0;
      this.totalAtRank.set(items.length);
      this.carousel.setItems(items, items[idx]?.id);
      this.carousel.resize();
      this.syncFromCarousel();
      return;
    }

    const f = this.filter();
    const browseRank = this.searchRank();
    this.activeRank.set(browseRank);
    this.source = createBrowseSource(f, browseRank);
    this.totalAtRank.set(this.source.total);
    const idx = preferIndex ?? defaultBrowseIndex(this.source);
    this.carousel.setSource(this.source, idx);
    this.carousel.resize();
    this.syncFromCarousel();
  }

  private syncFromCarousel(): void {
    const item = this.carousel?.getSelected() ?? null;
    this.selectedItem.set(item);
    this.selectedIndex.set(this.carousel?.getSelectedIndex() ?? 0);
    if (item) this.selectedId.set(item.id);
  }
}
