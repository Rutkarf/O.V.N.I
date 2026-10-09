/** Taxonomie navigable + catalogue O.V.N.I. — échelle Catalogue of Life / Ruggiero 2015. */

export type TaxonRank =
  | 'regne'
  | 'embranchement'
  | 'classe'
  | 'ordre'
  | 'famille'
  | 'genre'
  | 'espece';

export const TAXON_RANK_LABELS: Record<TaxonRank, string> = {
  regne: 'Règne',
  embranchement: 'Embranchement',
  classe: 'Classe',
  ordre: 'Ordre',
  famille: 'Famille',
  genre: 'Genre',
  espece: 'Espèce',
};

export const TAXON_RANKS: TaxonRank[] = [
  'regne',
  'embranchement',
  'classe',
  'ordre',
  'famille',
  'genre',
  'espece',
];

/**
 * Maximums reconnus (ordres de grandeur) — Catalogue of Life 2025 +
 * consensus PLoS One (Ruggiero et al., 2015). Pédagogie / navigation, pas un dump CoL.
 */
export const COL_SCALE = {
  regne: 7,
  embranchement: 96,
  classe: 351,
  ordre: 1_467,
  famille: 14_914,
  genre: 217_931,
  espece: 2_221_237,
  source: 'Catalogue of Life 2025 · Ruggiero et al. 2015 (PLoS One)',
  note:
    'Estimations totales du vivant (non décrites) : ~8–20 M d’espèces. Ici : taxons décrits/validés.',
} as const;

/** Les 7 règnes du consensus Ruggiero — ordre alphabétique. */
export const SEVEN_KINGDOMS = [
  'Animalia',
  'Archaea',
  'Bacteria',
  'Chromista',
  'Fungi',
  'Plantae',
  'Protozoa',
] as const;

/** Embranchements publiés par règne — jamais croisés (pas de chimère taxonomique). */
export const PHYLA_BY_KINGDOM: Record<string, readonly string[]> = {
  Animalia: [
    'Annelida', 'Arthropoda', 'Brachiopoda', 'Bryozoa', 'Chordata', 'Cnidaria',
    'Echinodermata', 'Mollusca', 'Nematoda', 'Onychophora', 'Platyhelminthes',
    'Porifera', 'Priapulida', 'Rotifera', 'Tardigrada',
  ],
  Plantae: ['Bryophyta', 'Chlorophyta', 'Rhodophyta', 'Tracheophyta'],
  Fungi: ['Ascomycota', 'Basidiomycota', 'Chytridiomycota', 'Mucoromycota'],
  Bacteria: ['Actinomycetota', 'Bacillota', 'Bacteroidota', 'Cyanobacteria', 'Pseudomonadota'],
  Archaea: ['Crenarchaeota', 'Euryarchaeota'],
  Protozoa: ['Amoebozoa', 'Apicomplexa', 'Ciliophora'],
  Chromista: ['Haptophyta', 'Ochrophyta'],
};

/** Tri alphabétique stable (locale fr, insensible à la casse). */
export function sortTaxaAlpha(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

export type OrganismStatus = 'ready' | 'preview' | 'locked';

export type MeshKind =
  | 'fly'
  | 'worm'
  | 'mouse'
  | 'fish'
  | 'plant'
  | 'yeast'
  | 'fungi'
  | 'human'
  | 'bee'
  | 'microbe'
  | 'archaea'
  | 'bacteria'
  | 'protozoa'
  | 'chromista'
  | 'bird'
  | 'frog'
  | 'coral'
  | 'mollusc'
  | 'dog';

export interface OrganismTaxonomy {
  regne: string;
  embranchement: string;
  classe: string;
  ordre: string;
  famille: string;
  genre: string;
  espece: string;
}

export interface OvniOrganismChoice {
  id: string;
  displayName: string;
  scientificName: string;
  taxonomy: OrganismTaxonomy;
  status: OrganismStatus;
  tagline: string;
  accent: number;
  mesh: MeshKind;
  featured?: boolean;
}

/** Item carrousel 3D : taxon / organisme / motif ROI / atlas cérébral. */
export interface CarouselNavItem {
  id: string;
  kind: 'taxon' | 'organism' | 'motif' | 'brain';
  rank?: TaxonRank;
  name: string;
  subtitle: string;
  accent: number;
  mesh: MeshKind;
  status: OrganismStatus;
  organism?: OvniOrganismChoice;
  /** Motif ROI LIF (axe composition hybride). */
  motif?: import('./hybrid-composition').RoiMotifChoice;
  /** Atlas FlyWire / MaleCNS / proxy (axe composition hybride). */
  brain?: import('./hybrid-composition').BrainAtlasChoice;
  /** Sous-taxons / espèces accessibles sous ce nœud (dans le catalogue). */
  childCount: number;
}

const M = (hex: number) => hex;

/** Catalogue représentatif — Drosophila en tête ; couvre les 7 règnes. */
export const OVNI_ORGANISM_CATALOG: OvniOrganismChoice[] = [
  {
    id: 'drosophila_melanogaster',
    displayName: 'Drosophile',
    scientificName: 'Drosophila melanogaster',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Arthropoda',
      classe: 'Insecta',
      ordre: 'Diptera',
      famille: 'Drosophilidae',
      genre: 'Drosophila',
      espece: 'melanogaster',
    },
    status: 'ready',
    tagline: 'O.V.N.I. principal · LIF + connectome IBDML',
    accent: M(0x1faa56),
    mesh: 'fly',
    featured: true,
  },
  {
    id: 'apis_mellifera',
    displayName: 'Abeille',
    scientificName: 'Apis mellifera',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Arthropoda',
      classe: 'Insecta',
      ordre: 'Hymenoptera',
      famille: 'Apidae',
      genre: 'Apis',
      espece: 'mellifera',
    },
    status: 'preview',
    tagline: 'Insecte social · teaser',
    accent: M(0xf0a020),
    mesh: 'bee',
  },
  {
    id: 'caenorhabditis_elegans',
    displayName: 'C. elegans',
    scientificName: 'Caenorhabditis elegans',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Nematoda',
      classe: 'Chromadorea',
      ordre: 'Rhabditida',
      famille: 'Rhabditidae',
      genre: 'Caenorhabditis',
      espece: 'elegans',
    },
    status: 'preview',
    tagline: '302 neurones · teaser connectome',
    accent: M(0xe8c04a),
    mesh: 'worm',
  },
  {
    id: 'octopus_vulgaris',
    displayName: 'Poulpe',
    scientificName: 'Octopus vulgaris',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Mollusca',
      classe: 'Cephalopoda',
      ordre: 'Octopoda',
      famille: 'Octopodidae',
      genre: 'Octopus',
      espece: 'vulgaris',
    },
    status: 'preview',
    tagline: 'Céphalopode · cognition',
    accent: M(0x8b5cf6),
    mesh: 'mollusc',
  },
  {
    id: 'acropora_millepora',
    displayName: 'Corail',
    scientificName: 'Acropora millepora',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Cnidaria',
      classe: 'Anthozoa',
      ordre: 'Scleractinia',
      famille: 'Acroporidae',
      genre: 'Acropora',
      espece: 'millepora',
    },
    status: 'preview',
    tagline: 'Récif · symbiose',
    accent: M(0xff6b8a),
    mesh: 'coral',
  },
  {
    id: 'danio_rerio',
    displayName: 'Poisson-zèbre',
    scientificName: 'Danio rerio',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Chordata',
      classe: 'Actinopterygii',
      ordre: 'Cypriniformes',
      famille: 'Cyprinidae',
      genre: 'Danio',
      espece: 'rerio',
    },
    status: 'preview',
    tagline: 'Vertébré transparent · teaser',
    accent: M(0x46c4ff),
    mesh: 'fish',
  },
  {
    id: 'xenopus_laevis',
    displayName: 'Xénope',
    scientificName: 'Xenopus laevis',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Chordata',
      classe: 'Amphibia',
      ordre: 'Anura',
      famille: 'Pipidae',
      genre: 'Xenopus',
      espece: 'laevis',
    },
    status: 'preview',
    tagline: 'Amphibien · développement',
    accent: M(0x6bcb77),
    mesh: 'frog',
  },
  {
    id: 'gallus_gallus',
    displayName: 'Poule',
    scientificName: 'Gallus gallus',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Chordata',
      classe: 'Aves',
      ordre: 'Galliformes',
      famille: 'Phasianidae',
      genre: 'Gallus',
      espece: 'gallus',
    },
    status: 'locked',
    tagline: 'Oiseau modèle · verrouillé',
    accent: M(0xffb347),
    mesh: 'bird',
  },
  {
    id: 'mus_musculus',
    displayName: 'Souris',
    scientificName: 'Mus musculus',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Chordata',
      classe: 'Mammalia',
      ordre: 'Rodentia',
      famille: 'Muridae',
      genre: 'Mus',
      espece: 'musculus',
    },
    status: 'locked',
    tagline: 'Mammifère modèle · verrouillé',
    accent: M(0x9aa0a6),
    mesh: 'mouse',
  },
  {
    id: 'canis_lupus_familiaris',
    displayName: 'Chien',
    scientificName: 'Canis lupus familiaris',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Chordata',
      classe: 'Mammalia',
      ordre: 'Carnivora',
      famille: 'Canidae',
      genre: 'Canis',
      espece: 'lupus familiaris',
    },
    status: 'locked',
    tagline: 'Compagnon · claim séparé',
    accent: M(0xc4a574),
    mesh: 'dog',
  },
  {
    id: 'homo_sapiens',
    displayName: 'Humain',
    scientificName: 'Homo sapiens',
    taxonomy: {
      regne: 'Animalia',
      embranchement: 'Chordata',
      classe: 'Mammalia',
      ordre: 'Primates',
      famille: 'Hominidae',
      genre: 'Homo',
      espece: 'sapiens',
    },
    status: 'locked',
    tagline: 'Atlas ROI clinique · claim séparé',
    accent: M(0xce1126),
    mesh: 'human',
  },
  {
    id: 'arabidopsis_thaliana',
    displayName: 'Arabidopsis',
    scientificName: 'Arabidopsis thaliana',
    taxonomy: {
      regne: 'Plantae',
      embranchement: 'Tracheophyta',
      classe: 'Magnoliopsida',
      ordre: 'Brassicales',
      famille: 'Brassicaceae',
      genre: 'Arabidopsis',
      espece: 'thaliana',
    },
    status: 'preview',
    tagline: 'Plante modèle · métabolisme',
    accent: M(0x007a3d),
    mesh: 'plant',
  },
  {
    id: 'oryza_sativa',
    displayName: 'Riz',
    scientificName: 'Oryza sativa',
    taxonomy: {
      regne: 'Plantae',
      embranchement: 'Tracheophyta',
      classe: 'Liliopsida',
      ordre: 'Poales',
      famille: 'Poaceae',
      genre: 'Oryza',
      espece: 'sativa',
    },
    status: 'preview',
    tagline: 'Céréale · agronomie',
    accent: M(0x8fbc5a),
    mesh: 'plant',
  },
  {
    id: 'saccharomyces_cerevisiae',
    displayName: 'Levure',
    scientificName: 'Saccharomyces cerevisiae',
    taxonomy: {
      regne: 'Fungi',
      embranchement: 'Ascomycota',
      classe: 'Saccharomycetes',
      ordre: 'Saccharomycetales',
      famille: 'Saccharomycetaceae',
      genre: 'Saccharomyces',
      espece: 'cerevisiae',
    },
    status: 'preview',
    tagline: 'Champignon · réseaux métaboliques',
    accent: M(0xceaa60),
    mesh: 'yeast',
  },
  {
    id: 'neurospora_crassa',
    displayName: 'Neurospora',
    scientificName: 'Neurospora crassa',
    taxonomy: {
      regne: 'Fungi',
      embranchement: 'Ascomycota',
      classe: 'Sordariomycetes',
      ordre: 'Sordariales',
      famille: 'Sordariaceae',
      genre: 'Neurospora',
      espece: 'crassa',
    },
    status: 'preview',
    tagline: 'Moissisure modèle · génétique',
    accent: M(0xd4a017),
    mesh: 'yeast',
  },
  {
    id: 'escherichia_coli',
    displayName: 'E. coli',
    scientificName: 'Escherichia coli',
    taxonomy: {
      regne: 'Bacteria',
      embranchement: 'Pseudomonadota',
      classe: 'Gammaproteobacteria',
      ordre: 'Enterobacterales',
      famille: 'Enterobacteriaceae',
      genre: 'Escherichia',
      espece: 'coli',
    },
    status: 'preview',
    tagline: 'Bactérie modèle · teaser',
    accent: M(0x4ecdc4),
    mesh: 'bacteria',
  },
  {
    id: 'bacillus_subtilis',
    displayName: 'B. subtilis',
    scientificName: 'Bacillus subtilis',
    taxonomy: {
      regne: 'Bacteria',
      embranchement: 'Bacillota',
      classe: 'Bacilli',
      ordre: 'Bacillales',
      famille: 'Bacillaceae',
      genre: 'Bacillus',
      espece: 'subtilis',
    },
    status: 'preview',
    tagline: 'Gram+ · sporulation',
    accent: M(0x45b7d1),
    mesh: 'bacteria',
  },
  {
    id: 'halobacterium_salinarum',
    displayName: 'Halobacterium',
    scientificName: 'Halobacterium salinarum',
    taxonomy: {
      regne: 'Archaea',
      embranchement: 'Euryarchaeota',
      classe: 'Halobacteria',
      ordre: 'Halobacteriales',
      famille: 'Halobacteriaceae',
      genre: 'Halobacterium',
      espece: 'salinarum',
    },
    status: 'preview',
    tagline: 'Archée extrêmophile',
    accent: M(0xc44569),
    mesh: 'archaea',
  },
  {
    id: 'dictyostelium_discoideum',
    displayName: 'Dictyostelium',
    scientificName: 'Dictyostelium discoideum',
    taxonomy: {
      regne: 'Protozoa',
      embranchement: 'Amoebozoa',
      classe: 'Dictyostelia',
      ordre: 'Dictyosteliida',
      famille: 'Dictyosteliidae',
      genre: 'Dictyostelium',
      espece: 'discoideum',
    },
    status: 'preview',
    tagline: 'Amoebozoaire · développement',
    accent: M(0xff6b6b),
    mesh: 'protozoa',
  },
  {
    id: 'emiliania_huxleyi',
    displayName: 'Emiliania',
    scientificName: 'Emiliania huxleyi',
    taxonomy: {
      regne: 'Chromista',
      embranchement: 'Haptophyta',
      classe: 'Coccolithophyceae',
      ordre: 'Isochrysidales',
      famille: 'Noelaerhabdaceae',
      genre: 'Emiliania',
      espece: 'huxleyi',
    },
    status: 'preview',
    tagline: 'Coccolithophore · océan',
    accent: M(0x48dbfb),
    mesh: 'chromista',
  },
];

export type TaxonomyFilter = Partial<Record<TaxonRank, string>>;

export function taxonValue(o: OvniOrganismChoice, rank: TaxonRank): string {
  return o.taxonomy[rank];
}

export function optionsAtRank(rank: TaxonRank, filter: TaxonomyFilter): string[] {
  const rankIdx = TAXON_RANKS.indexOf(rank);
  const seen = new Set<string>();
  const out: string[] = [];
  // Au rang règne : toujours les 7 du consensus (déjà A→Z)
  if (rank === 'regne' && Object.keys(filter).length === 0) {
    return [...SEVEN_KINGDOMS];
  }
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
      out.push(v);
    }
  }
  if (rank === 'regne') {
    for (const k of SEVEN_KINGDOMS) {
      if (!seen.has(k)) out.push(k);
    }
  }
  if (rank === 'embranchement') {
    const kingdoms = filter.regne ? [filter.regne] : [...SEVEN_KINGDOMS];
    for (const k of kingdoms) {
      for (const p of PHYLA_BY_KINGDOM[k] || []) {
        if (!seen.has(p)) out.push(p);
      }
    }
  }
  return sortTaxaAlpha(out);
}

/** Organisme catalogue compatible avec un rang + filtre parent (lignée réelle). */
export function sampleOrganismFor(
  rank: TaxonRank,
  value: string,
  filter: TaxonomyFilter,
): OvniOrganismChoice | undefined {
  const idx = TAXON_RANKS.indexOf(rank);
  return OVNI_ORGANISM_CATALOG.find((o) => {
    if (taxonValue(o, rank) !== value) return false;
    for (let i = 0; i < idx; i++) {
      const r = TAXON_RANKS[i];
      if (filter[r] && taxonValue(o, r) !== filter[r]) return false;
    }
    return true;
  });
}

export function filterOrganisms(filter: TaxonomyFilter): OvniOrganismChoice[] {
  return OVNI_ORGANISM_CATALOG.filter((o) =>
    TAXON_RANKS.every((r) => !filter[r] || taxonValue(o, r) === filter[r]),
  );
}

export function findOrganism(id: string): OvniOrganismChoice | undefined {
  return OVNI_ORGANISM_CATALOG.find((o) => o.id === id);
}

export const DEFAULT_ORGANISM_ID = 'drosophila_melanogaster';

const KINGDOM_MESH: Record<string, MeshKind> = {
  Archaea: 'archaea',
  Bacteria: 'bacteria',
  Protozoa: 'protozoa',
  Chromista: 'chromista',
  Fungi: 'fungi',
  Plantae: 'plant',
  Animalia: 'fly',
};

const KINGDOM_ACCENT: Record<string, number> = {
  Archaea: 0xc44569,
  Bacteria: 0x4ecdc4,
  Protozoa: 0xff6b6b,
  Chromista: 0x48dbfb,
  Fungi: 0xceaa60,
  Plantae: 0x007a3d,
  Animalia: 0x1faa56,
};

function accentForTaxon(rank: TaxonRank, name: string, sample?: OvniOrganismChoice): number {
  if (rank === 'regne') return KINGDOM_ACCENT[name] ?? 0x888880;
  return sample?.accent ?? 0x1faa56;
}

function meshForTaxon(rank: TaxonRank, name: string, sample?: OvniOrganismChoice): MeshKind {
  if (rank === 'regne') return KINGDOM_MESH[name] ?? 'microbe';
  return sample?.mesh ?? 'microbe';
}

/**
 * Construit les items du carrousel 3D selon le filtre.
 * - Si le rang « espece » est rempli ou qu’on est au bout : liste d’organismes
 * - Sinon : nœuds taxonomiques du prochain rang à explorer
 */
export function buildCarouselItems(filter: TaxonomyFilter): CarouselNavItem[] {
  const filled = TAXON_RANKS.filter((r) => filter[r]);
  const nextRank: TaxonRank =
    filled.length === 0
      ? 'regne'
      : TAXON_RANKS[Math.min(filled.length, TAXON_RANKS.length - 1)];

  // Si genre sélectionné → montrer les espèces (organismes)
  if (filter['genre'] || filter['espece'] || nextRank === 'espece') {
    const orgs = filterOrganisms(filter).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }),
    );
    return orgs.map((o) => ({
      id: o.id,
      kind: 'organism' as const,
      name: o.displayName,
      subtitle: o.scientificName,
      accent: o.accent,
      mesh: o.mesh,
      status: o.status,
      organism: o,
      childCount: 0,
    }));
  }

  const options = optionsAtRank(nextRank, filter);
  return options.map((name) => {
    const childFilter: TaxonomyFilter = { ...filter, [nextRank]: name };
    const children = filterOrganisms(childFilter);
    const sample = children[0];
    const colMax = COL_SCALE[nextRank];
    return {
      id: `taxon:${nextRank}:${name}`,
      kind: 'taxon' as const,
      rank: nextRank,
      name,
      subtitle: `${TAXON_RANK_LABELS[nextRank]} · ${children.length} dans l’atlas O.V.N.I. (CoL ~${colMax.toLocaleString('fr-FR')})`,
      accent: accentForTaxon(nextRank, name, sample),
      mesh: meshForTaxon(nextRank, name, sample),
      status: children.some((c) => c.status === 'ready')
        ? 'ready'
        : children.length
          ? 'preview'
          : 'locked',
      childCount: children.length,
    };
  });
}

export function nextRankAfter(filter: TaxonomyFilter): TaxonRank {
  const n = TAXON_RANKS.filter((r) => filter[r]).length;
  return TAXON_RANKS[Math.min(n, TAXON_RANKS.length - 1)];
}
