# Génétique · Argon · CRISPR · Kepler · GAL4/UAS (pédagogie)

## Rôle

- **Croisements** mendéliens (mono/dihybride, test, rétrocroisement, réciproque, fratrie) via `POST /api/v1/science/genetics/cross`.
  Réponse : `selectable[]` (descendants F1/F2 avec génotype + phénotype) pour choix dans l’UI.
- **Éditeur d’allèles** : loci du catalogue (`w`, `y`, `b`, `Tb`, `s`) sur lignée de travail / parent A / parent B.
- **CRISPR 1 (Cas9)** : knock-out — `POST …/genetics/edit` · `tool: crispr1_cas9`.
- **CRISPR 2 (Cas12a)** : knock-in tag — `tool: crispr2_cas12a`.
- **Ciseaux Kepler** : multiplex — `POST …/genetics/kepler`.
- **GAL4 × UAS** : `POST …/genetics/drivers` — expression pédagogique (glow neural / reporter / optogénétique).
- **Argon (taille)** : locus `Tb` → `argon_scale` — `POST …/genetics/argon-ready`.

Catalogue : `packages/science-datasets/genetics_loci.json` (loci + drivers).

## UI

Onglet **Génétique** du labo : éditeur allèles, liste descendants, drivers, CRISPR/Kepler. Three.js : taille, yeux, ailes, glow reporter, arc Kepler.

## Claim

Rendu 3D et génotypes simulés **≠** génotypage wet-lab. Validation PiCsL avant publication.
