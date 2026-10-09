# Maelstrom & Argon dans O.V.N.I.

## Deux lectures (compatibles)

### 1. Exports historiques (pipelines)

| Nom | Rôle |
|-----|------|
| **Maelstrom** (`export_maelstrom`) | Bundle omics / carte CRISPR 2 + motif → pipelines DE |
| **Argon** (`export_argon_manifest`) | Manifeste reproductibilité + DOI + RO-Crate |

API : `GET …/passerelles/maelstrom|argon`, `POST …/argon/doi`

### 2. Échelles de mesure OVNI (continuum)

| Échelle | Sens | Usage |
|---------|------|--------|
| **Argon** | Plus **fine** unité opératoire | `dt_ms` fin, 1 individu, empreinte bit-exacte, morph `argon_scale` |
| **Essai** | Unité intermédiaire | 1 `run_card` typique |
| **Maelstrom** | Plus **vaste** unité | Cohortes, essaims, balayages GPU, populations pédagogiques |

API : `GET /api/v1/science/echelles`, `POST …/echelles/resolve`  
UI Labo → onglet **Vie** : boutons Argon / Essai / Maelstrom.

> Ce ne sont pas l’atome d’argon ni un maelström océanique au sens SI.  
> « Travailler à l’Argon près » = rejouer le même OVNI au même tick.  
> « Travailler au Maelstrom » = statistiques sur des lignées / cohortes.

## Zenodo

`GET /api/v1/science/zenodo` — dépôt via `ZENODO_TOKEN` + `scripts/deposer_zenodo.py`.
