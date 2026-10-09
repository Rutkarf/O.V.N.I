/**
 * Source virtuelle à l’échelle Catalogue of Life.
 * On ne matérialise PAS 2,2 M d’objets JS — getItem(i) est O(1).
 */
import {
  COL_SCALE,
  CarouselNavItem,
  MeshKind,
  OVNI_ORGANISM_CATALOG,
  PHYLA_BY_KINGDOM,
  SEVEN_KINGDOMS,
  TAXON_RANK_LABELS,
  TAXON_RANKS,
  TaxonRank,
  TaxonomyFilter,
  filterOrganisms,
  sortTaxaAlpha,
  taxonValue,
} from './organism-catalog';

const MESH_CYCLE: MeshKind[] = [
  'archaea',
  'bacteria',
  'protozoa',
  'chromista',
  'fungi',
  'yeast',
  'plant',
  'fly',
  'worm',
  'fish',
  'coral',
  'mollusc',
  'bee',
  'frog',
  'bird',
  'mouse',
  'human',
];

const ACCENTS = [
  0xc44569, 0x4ecdc4, 0xff6b6b, 0x48dbfb, 0xceaa60, 0x007a3d, 0x1faa56, 0xf0a020, 0x46c4ff,
  0x8b5cf6, 0xff6b8a, 0x6bcb77, 0x9aa0a6, 0xce1126,
];

export interface TaxonBrowseSource {
  rank: TaxonRank;
  /** Total CoL pour ce rang (7 … 2 221 237) */
  total: number;
  filter: TaxonomyFilter;
  getItem(index: number): CarouselNavItem;
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function padName(rank: TaxonRank, index: number): string {
  const labels: Record<TaxonRank, string> = {
    regne: 'Regnum',
    embranchement: 'Phylum',
    classe: 'Classis',
    ordre: 'Ordo',
    famille: 'Familia',
    genre: 'Genus',
    espece: 'Species',
  };
  const n = String(index + 1).padStart(String(COL_SCALE[rank]).length, '0');
  return `${labels[rank]}-${n}`;
}

function fakeBinomial(index: number): string {
  const A = [
    'Nova', 'Silva', 'Aqua', 'Terra', 'Lux', 'Vita', 'Orbita', 'Nexus', 'Flora', 'Fauna', 'Micro',
    'Astro', 'Helio', 'Cryo', 'Thermo',
  ];
  const B = [
    'digitata', 'numerica', 'simulata', 'incepta', 'catalogi', 'virtualis', 'atlasia', 'ovnia',
    'lumina', 'maris', 'silvae', 'caeli',
  ];
  return `${A[index % A.length]} ${B[index % B.length]}`;
}

/** Mesh morphologique d’après le nom scientifique (pas un cycle aléatoire). */
function meshFor(rank: TaxonRank, index: number, name: string): MeshKind {
  if (rank === 'regne') {
    const map: Record<string, MeshKind> = {
      Archaea: 'archaea',
      Bacteria: 'bacteria',
      Protozoa: 'protozoa',
      Chromista: 'chromista',
      Fungi: 'fungi',
      Plantae: 'plant',
      Animalia: 'fly',
    };
    return map[name] ?? 'bacteria';
  }
  const n = name.toLowerCase();
  if (/arthropoda|insecta|diptera|drosophil|hymenoptera|apis|coleoptera/.test(n)) return 'fly';
  if (/chordata|mammalia|primates|hominidae|homo|canis|lupus/.test(n)) return 'human';
  if (/mus |muridae|rodentia|mouse/.test(n) || n === 'mus') return 'mouse';
  if (/canidae|carnivora|dog/.test(n)) return 'dog';
  if (/aves|passeriformes|bird/.test(n)) return 'bird';
  if (/amphibia|anura|frog|rana/.test(n)) return 'frog';
  if (/actinopterygii|teleost|fish|danio/.test(n)) return 'fish';
  if (/nematoda|caenorhabditis|elegans|worm/.test(n)) return 'worm';
  if (/mollusca|gastropoda|cephalopoda/.test(n)) return 'mollusc';
  if (/cnidaria|anthozoa|coral|porifera/.test(n)) return 'coral';
  if (/annelida|hirudinea/.test(n)) return 'worm';
  if (/ascomycota|basidiomycota|fungi|saccharomyces|yeast/.test(n)) return 'yeast';
  if (/plantae|tracheophyta|magnoli|arabidopsis|bryophyta|chlorophyta/.test(n)) return 'plant';
  if (/proteobacteria|bacillota|cyanobacteria|bacteria/.test(n)) return 'bacteria';
  if (/euryarchaeota|crenarchaeota|archaea/.test(n)) return 'archaea';
  if (/amoebozoa|ciliophora|apicomplexa|protozoa/.test(n)) return 'protozoa';
  if (/ochrophyta|haptophyta|rhodophyta|chromista/.test(n)) return 'chromista';
  if (/apis|bee|apoidea/.test(n)) return 'bee';
  return MESH_CYCLE[(index + hash32(name)) % MESH_CYCLE.length];
}

function accentFor(index: number, name: string): number {
  return ACCENTS[(index + hash32(name)) % ACCENTS.length];
}

/** Noms « connus » en tête de liste (A→Z), puis padding CoL. */
function knownNamesAt(rank: TaxonRank, filter: TaxonomyFilter): string[] {
  if (rank === 'regne') return [...SEVEN_KINGDOMS];

  const fromCatalog: string[] = [];
  const seen = new Set<string>();
  const rankIdx = TAXON_RANKS.indexOf(rank);
  for (const o of OVNI_ORGANISM_CATALOG) {
    let ok = true;
    for (let i = 0; i < rankIdx; i++) {
      const r = TAXON_RANKS[i];
      if (filter[r] && taxonValue(o, r) !== filter[r]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const v = taxonValue(o, rank);
    if (!seen.has(v)) {
      seen.add(v);
      fromCatalog.push(v);
    }
  }

  if (rank === 'embranchement') {
    const kingdoms = filter.regne
      ? [filter.regne]
      : [...SEVEN_KINGDOMS];
    for (const k of kingdoms) {
      for (const p of PHYLA_BY_KINGDOM[k] || []) {
        if (!seen.has(p)) {
          seen.add(p);
          fromCatalog.push(p);
        }
      }
    }
  }

  return sortTaxaAlpha(fromCatalog);
}

/**
 * Source à l’échelle CoL pour le rang courant.
 * total = taxons réels du rang (filtre parent respecté).
 * @param forceRank — rang imposé (clic sur une case taxonomique), sinon rang suivant le filtre.
 */
export function createBrowseSource(
  filter: TaxonomyFilter,
  forceRank?: TaxonRank,
): TaxonBrowseSource {
  const filled = TAXON_RANKS.filter((r) => filter[r]).length;
  const rank: TaxonRank =
    forceRank ?? TAXON_RANKS[Math.min(filled, TAXON_RANKS.length - 1)];
  const known = knownNamesAt(rank, filter);
  /** Uniquement des taxons réels (catalogue + phyla du règne) — pas de padding chimérique. */
  const total = Math.max(1, known.length);
  const realOrgs = filterOrganisms(filter);

  return {
    rank,
    total,
    filter,
    getItem(index: number): CarouselNavItem {
      const i = ((index % total) + total) % total;
      const name = known[i] ?? padName(rank, i);
      const isKnown = i < known.length;
      const mesh = meshFor(rank, i, name);
      const accent = accentFor(i, name);

      // Espèce réelle du catalogue O.V.N.I. si match
      if (rank === 'espece' || (isKnown && TAXON_RANKS.indexOf(rank) >= 5)) {
        const org = realOrgs.find((o) => taxonValue(o, rank) === name || o.displayName === name);
        if (org) {
          return {
            id: org.id,
            kind: 'organism',
            name: org.displayName,
            subtitle: `${org.scientificName} · ${i + 1} / ${total.toLocaleString('fr-FR')}`,
            accent: org.accent,
            mesh: org.mesh,
            status: org.status,
            organism: org,
            childCount: 0,
          };
        }
      }

      const orgMatch = realOrgs.find((o) => taxonValue(o, rank) === name);
      const childCount =
        orgMatch || isKnown
          ? filterOrganisms({ ...filter, [rank]: name }).length
          : 0;

      return {
        id: `col:${rank}:${i}`,
        kind: 'taxon',
        rank,
        name,
        subtitle: isKnown
          ? `${TAXON_RANK_LABELS[rank]} · atlas O.V.N.I. · ${i + 1} / ${total.toLocaleString('fr-FR')}`
          : `${TAXON_RANK_LABELS[rank]} CoL · ${fakeBinomial(i)} · ${i + 1} / ${total.toLocaleString('fr-FR')}`,
        accent,
        mesh,
        status: orgMatch?.status === 'ready' ? 'ready' : isKnown ? 'preview' : 'locked',
        childCount,
      };
    },
  };
}

/** Index initial : premier item connu du rang (A→Z), sans forcer la drosophile. */
export function defaultBrowseIndex(source: TaxonBrowseSource): number {
  return 0;
}
