/**
 * Composition expérimentale O.V.N.I. :
 * Taxon (organisme) × Motif ROI LIF × Atlas cérébral (FlyWire / MaleCNS / proxies).
 * Les trois axes sont indépendants — un motif canin peut être croisé avec un atlas Drosophila.
 */
import {
  CarouselNavItem,
  MeshKind,
  OVNI_ORGANISM_CATALOG,
  OrganismStatus,
  OvniOrganismChoice,
} from './organism-catalog';

export type CompositionAxis = 'taxon' | 'motif' | 'brain';

export interface RoiMotifChoice {
  id: string;
  name: string;
  subtitle: string;
  /** Espèce d’origine du motif (peut différer du taxon choisi). */
  sourceSpecies: string;
  neuronCount: number;
  edgeCount: number;
  status: OrganismStatus;
  accent: number;
  mesh: MeshKind;
  tagline: string;
}

export interface BrainAtlasChoice {
  key: string;
  name: string;
  subtitle: string;
  sourceSpecies: string;
  proxyCount: number;
  status: OrganismStatus;
  accent: number;
  mesh: MeshKind;
  tagline: string;
}

/** Motifs ROI versionnés — LIF tourne ici (preuve), pas sur l’atlas visu. */
const ROI_MOTIF_RAW: RoiMotifChoice[] = [
  {
    id: 'escape_feed_v1',
    name: 'escape_feed_v1',
    subtitle: 'Fuite × alimentation · LPLC2/LC4→DNp01 · sucre→MN9',
    sourceSpecies: 'Drosophila melanogaster',
    neuronCount: 11,
    edgeCount: 15,
    status: 'ready',
    accent: 0x1faa56,
    mesh: 'fly',
    tagline: 'Motif ROI principal · Methods-ready',
  },
  {
    id: 'vision_menace_v1',
    name: 'vision_menace_v1',
    subtitle: 'Voie visuelle menace · lobula plate',
    sourceSpecies: 'Drosophila melanogaster',
    neuronCount: 9,
    edgeCount: 12,
    status: 'ready',
    accent: 0x46c4ff,
    mesh: 'fly',
    tagline: 'ROI vision · LIF',
  },
  {
    id: 'gout_alimentation_v1',
    name: 'gout_alimentation_v1',
    subtitle: 'Goût / alimentation · sugar→MN9',
    sourceSpecies: 'Drosophila melanogaster',
    neuronCount: 8,
    edgeCount: 10,
    status: 'preview',
    accent: 0xf0a020,
    mesh: 'fly',
    tagline: 'ROI gustatif',
  },
  {
    id: 'olfaction_champignon_v1',
    name: 'olfaction_champignon_v1',
    subtitle: 'Olfaction · corps pédonculés',
    sourceSpecies: 'Drosophila melanogaster',
    neuronCount: 10,
    edgeCount: 14,
    status: 'preview',
    accent: 0x8b5cf6,
    mesh: 'fly',
    tagline: 'ROI olfactif',
  },
  {
    id: 'canis_olfaction_roi_v0',
    name: 'canis_olfaction_roi_v0',
    subtitle: 'Proxy olfactif canin · bulbe olfactif simplifié',
    sourceSpecies: 'Canis lupus familiaris',
    neuronCount: 14,
    edgeCount: 18,
    status: 'preview',
    accent: 0xceaa60,
    mesh: 'dog',
    tagline: 'Motif ROI canin (teaser) — croisable avec atlas Drosophila',
  },
  {
    id: 'mus_hippocampus_roi_v0',
    name: 'mus_hippocampus_roi_v0',
    subtitle: 'Proxy hippocampe murin · circuit trisynaptique',
    sourceSpecies: 'Mus musculus',
    neuronCount: 12,
    edgeCount: 16,
    status: 'preview',
    accent: 0xff6b8a,
    mesh: 'mouse',
    tagline: 'Motif ROI murin (teaser)',
  },
  {
    id: 'courtship_p1_v0',
    name: 'courtship_p1_v0',
    subtitle: 'Cour · neurones P1 / FruM · ~20 / hémibrain',
    sourceSpecies: 'Drosophila melanogaster',
    neuronCount: 20,
    edgeCount: 28,
    status: 'preview',
    accent: 0xff6b8a,
    mesh: 'fly',
    tagline: 'Motif ROI cour (Yamamoto / Dickson)',
  },
  {
    id: 'sleep_p1_pc1_v0',
    name: 'sleep_p1_pc1_v0',
    subtitle: 'Sommeil · pC1 / homéostasie vs cour',
    sourceSpecies: 'Drosophila melanogaster',
    neuronCount: 14,
    edgeCount: 18,
    status: 'preview',
    accent: 0x6bcb77,
    mesh: 'fly',
    tagline: 'Motif ROI sommeil',
  },
  {
    id: 'navigation_cx_v0',
    name: 'navigation_cx_v0',
    subtitle: 'Navigation · complexus central (EB / PB / FB)',
    sourceSpecies: 'Drosophila melanogaster',
    neuronCount: 18,
    edgeCount: 24,
    status: 'preview',
    accent: 0x48dbfb,
    mesh: 'fly',
    tagline: 'Motif ROI navigation CX',
  },
  {
    id: 'homo_motor_roi_v0',
    name: 'homo_motor_roi_v0',
    subtitle: 'Proxy cortico-spinal simplifié',
    sourceSpecies: 'Homo sapiens',
    neuronCount: 16,
    edgeCount: 22,
    status: 'locked',
    accent: 0x9aa0a6,
    mesh: 'human',
    tagline: 'Motif ROI humain (verrouillé)',
  },
];

/** Ordre pédagogique aligné sur LIF_MOTIF_SLOTS. */
export const ROI_MOTIF_CATALOG: RoiMotifChoice[] = [...ROI_MOTIF_RAW];

/** Cases grille Motif ROI — LIF (Leaky Integrate-and-Fire), cartographie scientifique. */
export interface SelectorSlot {
  id: string;
  label: string;
  count: string;
  placeholder: string;
  /** Ids catalogue associés (recherche / focus). */
  itemIds: string[];
}

/** Cases = circuits documentés (LIF = modèle, pas une taxonomie à 7). */
export const LIF_MOTIF_SLOTS: SelectorSlot[] = [
  { id: 'escape_feed', label: 'Fuite GF', count: '11 LIF', placeholder: 'escape_feed', itemIds: ['escape_feed_v1'] },
  { id: 'vision', label: 'Vision', count: '9 LIF', placeholder: 'LPLC2', itemIds: ['vision_menace_v1'] },
  { id: 'gout', label: 'Gustation', count: '8 LIF', placeholder: 'sugar→MN9', itemIds: ['gout_alimentation_v1'] },
  { id: 'olfaction', label: 'Olfaction', count: '10 LIF', placeholder: 'mushroom body', itemIds: ['olfaction_champignon_v1'] },
  { id: 'courtship', label: 'Cour P1', count: '20 LIF', placeholder: 'P1 FruM', itemIds: ['courtship_p1_v0'] },
  { id: 'sleep', label: 'Sommeil', count: '14 LIF', placeholder: 'pC1', itemIds: ['sleep_p1_pc1_v0'] },
  { id: 'navigation', label: 'Navigation', count: '18 LIF', placeholder: 'complexus central', itemIds: ['navigation_cx_v0'] },
  { id: 'canis', label: 'Canis ROI', count: '14 LIF', placeholder: 'bulbe olfactif', itemIds: ['canis_olfaction_roi_v0'] },
  { id: 'mus', label: 'Mus ROI', count: '12 LIF', placeholder: 'hippocampe', itemIds: ['mus_hippocampus_roi_v0'] },
  { id: 'homo', label: 'Homo ROI', count: '16 LIF', placeholder: 'cortico-spinal', itemIds: ['homo_motor_roi_v0'] },
];

/** Atlas de visualisation connectome (proxies GPU — pas LIF 1:1). */
const BRAIN_ATLAS_RAW: BrainAtlasChoice[] = [
  {
    key: 'brodmann_anatomique',
    name: 'Atlas de Brodmann',
    subtitle: 'Anatomique classique · ~52 aires corticales historiques',
    sourceSpecies: 'Homo sapiens',
    proxyCount: 52,
    status: 'preview',
    accent: 0xceaa60,
    mesh: 'human',
    tagline: 'Atlas anatomique classique',
  },
  {
    key: 'aal_116',
    name: 'AAL',
    subtitle: 'Macro-anatomique IRM · 116 ROI (Tzourio-Mazoyer)',
    sourceSpecies: 'Homo sapiens',
    proxyCount: 116,
    status: 'preview',
    accent: 0x6bcb77,
    mesh: 'human',
    tagline: 'Atlas anatomique IRM',
  },
  {
    key: 'hcp_cortical_360',
    name: 'Human Connectome Project',
    subtitle: 'Cortical moderne · 180 aires / hémisphère = 360 aires (Glasser)',
    sourceSpecies: 'Homo sapiens',
    proxyCount: 360,
    status: 'preview',
    accent: 0x48dbfb,
    mesh: 'human',
    tagline: 'Atlas corticaux modernes',
  },
  {
    key: 'julich_brain',
    name: 'Julich-Brain',
    subtitle: 'Cytoarchitectonique probabiliste · ~103 aires',
    sourceSpecies: 'Homo sapiens',
    proxyCount: 103,
    status: 'preview',
    accent: 0xceaa60,
    mesh: 'human',
    tagline: 'Atlas cytoarchitectonique',
  },
  {
    key: 'yeo_7_networks',
    name: 'Yeo 7 réseaux',
    subtitle: 'Fonctionnel repos · 7 réseaux (Yeo et al. 2011)',
    sourceSpecies: 'Homo sapiens',
    proxyCount: 7,
    status: 'preview',
    accent: 0xff6b8a,
    mesh: 'human',
    tagline: 'Atlas réseaux fonctionnels',
  },
  {
    key: 'brainnetome_246',
    name: 'Brainnetome Atlas',
    subtitle: 'Connectivité · 246 sous-régions (210 corticales + 36 sous-corticales)',
    sourceSpecies: 'Homo sapiens',
    proxyCount: 246,
    status: 'preview',
    accent: 0x8b5cf6,
    mesh: 'human',
    tagline: 'Atlas de connectivité',
  },
  {
    key: 'human_cell_types_3313',
    name: 'Atlas cellulaire humain',
    subtitle: 'Cellulaire · 3 313 types cellulaires caractérisés',
    sourceSpecies: 'Homo sapiens',
    proxyCount: 3_313,
    status: 'preview',
    accent: 0xff6b8a,
    mesh: 'human',
    tagline: 'Atlas cellulaires',
  },
  {
    key: 'functional_wm_500',
    name: 'Atlas fonctionnel substance blanche',
    subtitle: 'Fonctionnel · >500 fonctions cérébrales cartographiées',
    sourceSpecies: 'Homo sapiens',
    proxyCount: 500,
    status: 'preview',
    accent: 0xf0a020,
    mesh: 'human',
    tagline: 'Atlas fonctionnels',
  },
  {
    key: 'flywire_brain_2024',
    name: 'FlyWire brain 2024',
    subtitle: '~139 255 neurones · cerveau Drosophila',
    sourceSpecies: 'Drosophila melanogaster',
    proxyCount: 139_255,
    status: 'ready',
    accent: 0x1faa56,
    mesh: 'fly',
    tagline: 'Atlas visu Drosophila · pédagogie 4D',
  },
  {
    key: 'malecns_brain_vnc_2026',
    name: 'MaleCNS brain + VNC',
    subtitle: '~166 000 · cerveau + chaîne nerveuse ventrale',
    sourceSpecies: 'Drosophila melanogaster',
    proxyCount: 166_000,
    status: 'ready',
    accent: 0x46c4ff,
    mesh: 'fly',
    tagline: 'Échelle SNC Drosophila',
  },
];

/** Ordre scientifique (aligné sur BRAIN_ATLAS_SLOTS) — pas A→Z. */
export const BRAIN_ATLAS_CATALOG: BrainAtlasChoice[] = [...BRAIN_ATLAS_RAW];

/** Cases = familles d’atlas publiées (il en existe des dizaines ; ici les types de référence). */
export const BRAIN_ATLAS_SLOTS: SelectorSlot[] = [
  { id: 'anatomique', label: 'Brodmann', count: '~52', placeholder: 'aires corticales', itemIds: ['brodmann_anatomique'] },
  { id: 'aal', label: 'AAL', count: '116', placeholder: 'Tzourio-Mazoyer', itemIds: ['aal_116'] },
  { id: 'cortical', label: 'HCP Glasser', count: '360', placeholder: '180×2', itemIds: ['hcp_cortical_360'] },
  { id: 'connectivite', label: 'Brainnetome', count: '246', placeholder: '210+36', itemIds: ['brainnetome_246'] },
  { id: 'julich', label: 'Julich', count: '~103', placeholder: 'cytoarchitectonie', itemIds: ['julich_brain'] },
  { id: 'cellulaire', label: 'Cellulaire', count: '3 313', placeholder: 'cell types', itemIds: ['human_cell_types_3313'] },
  { id: 'yeo', label: 'Yeo-7', count: '7', placeholder: 'réseaux repos', itemIds: ['yeo_7_networks'] },
  { id: 'fonctionnel', label: 'Fonctionnel', count: '500+', placeholder: 'substance blanche', itemIds: ['functional_wm_500'] },
  { id: 'flywire', label: 'FlyWire', count: '~139k', placeholder: 'Drosophila', itemIds: ['flywire_brain_2024'] },
  { id: 'malecns', label: 'MaleCNS', count: '~166k', placeholder: 'cerveau+VNC', itemIds: ['malecns_brain_vnc_2026'] },
];

export const DEFAULT_MOTIF_ID = 'escape_feed_v1';
export const DEFAULT_BRAIN_ID = 'flywire_brain_2024';

export function findMotif(id: string): RoiMotifChoice | undefined {
  return ROI_MOTIF_CATALOG.find((m) => m.id === id);
}

export function findBrain(id: string): BrainAtlasChoice | undefined {
  return BRAIN_ATLAS_CATALOG.find((b) => b.key === id);
}

export function motifToNavItem(m: RoiMotifChoice): CarouselNavItem {
  return {
    id: m.id,
    kind: 'motif',
    name: m.name,
    subtitle: `${m.subtitle} · ${m.neuronCount} LIF · ${m.sourceSpecies}`,
    accent: m.accent,
    mesh: m.mesh,
    status: m.status,
    childCount: 0,
    motif: m,
  };
}

export function brainToNavItem(b: BrainAtlasChoice): CarouselNavItem {
  return {
    id: b.key,
    kind: 'brain',
    name: b.name,
    subtitle: `${b.subtitle} · ${b.sourceSpecies}`,
    accent: b.accent,
    mesh: b.mesh,
    status: b.status,
    childCount: 0,
    brain: b,
  };
}

export function motifNavItems(): CarouselNavItem[] {
  return ROI_MOTIF_CATALOG.map(motifToNavItem);
}

export function brainNavItems(): CarouselNavItem[] {
  return BRAIN_ATLAS_CATALOG.map(brainToNavItem);
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomPickOrganism(): OvniOrganismChoice {
  const pool = OVNI_ORGANISM_CATALOG.filter((o) => o.status !== 'locked');
  return pickOne(pool.length ? pool : OVNI_ORGANISM_CATALOG);
}

export function randomPickMotif(): RoiMotifChoice {
  const pool = ROI_MOTIF_CATALOG.filter((m) => m.status !== 'locked');
  return pickOne(pool.length ? pool : ROI_MOTIF_CATALOG);
}

export function randomPickBrain(): BrainAtlasChoice {
  const pool = BRAIN_ATLAS_CATALOG.filter((b) => b.status !== 'locked');
  return pickOne(pool.length ? pool : BRAIN_ATLAS_CATALOG);
}

export function randomPickComposition(): {
  organismId: string;
  motifId: string;
  brainId: string;
} {
  return {
    organismId: randomPickOrganism().id,
    motifId: randomPickMotif().id,
    brainId: randomPickBrain().key,
  };
}
