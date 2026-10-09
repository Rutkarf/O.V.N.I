# O.V.N.I. — Organisme Vivant Numérique Intelligent

[![science-valider](https://img.shields.io/badge/science-dorures-2d6a4f)](./scripts/ci-science.sh)

> **O.V.N.I.** = **O**rganisme **V**ivant **N**umérique **I**ntelligent.  
> Individu *in silico* dont le cerveau opérationnel est un moteur **LIF** (Leaky Integrate-and-Fire) sur **motif ROI connectomique versionné** — instrument de laboratoire IBDML / Luminy.  
> Ce n’est **pas** un « ovni » au sens populaire ; ce n’est **pas** un LLM qui pilote un animal.

**Composition expérimentale :** `Taxonomie × Motif ROI LIF × Atlas cérébral` → un O.V.N.I. (chimère numérique autorisée et documentée).

---

## I. Thèse — Pourquoi un cerveau numérique de preuve

La neurobiologie computationnelle de *Drosophila* dispose désormais de connectomes à l’échelle du cerveau (FlyWire ~139 255 neurones ; SNC étendu ~166 000). Sans couche **protocole**, ces cartes restent des catalogues. L’hypothèse centrale d’O.V.N.I. est qu’un **sous-circuit ROI** (ex. `escape_feed_v1` : ~11 neurones LIF, ~15 arêtes ; voies LPLC2/LC4→DNp01, sucre→MN9) suffit pour :

1. **Rejouer** une hypothèse sensorimotrice avec **graine**, **empreintes** (`circuit_id`, `dataset_hash`, `adapters_hash`, `engine_version`, `motif_id`) et **export Methods** ;
2. **Contrôler** : silence neuronal, mélange d’arêtes, dose–réponse, A/B de politiques, optogénétique virtuelle déclarée ;
3. **Publier** sans confondre l’échelle du motif (preuve) et l’échelle de l’atlas (pédagogie 4D).

**Claim autorisé :** *« Sur le sous-graphe X (empreinte H), adaptateurs A, graine S, la lecture R est … »*

**Claim interdit :** *« O.V.N.I. simule le cerveau FlyWire entier en LIF 1:1. »*

La **preuve** vit dans `packages/science-engine` + `packages/science-datasets`. Le Labo Three.js, la génétique déclarée, le cycle de vie et la voix chimère (`/voix`) sont **hors preuve** — communication, enseignement, 3R — jamais dans les suites dorées ni les Méthodes (`docs/science/CHARTER.md`).

---

## II. Antithèse — Ce que l’instrument refuse d’être

| Tentation | Réponse O.V.N.I. |
|---|---|
| LLM = mécanisme neural | Non. Un modèle de langage peut **lire** un `run_card` ; il ne décide pas la biologie. |
| Nuage GPU = connectome LIF | Non. Proxies pédagogiques pilotés par `rates_hz` du motif. |
| Motif literature = cerveau entier | Non. Séparation stricte motif ROI / atlas FlyWire–MaleCNS–humain. |
| Latence logicielle = temps de réaction animal | Non. |
| Remplacer toute validation wet-lab | Non. Réduire (3R), pas abolir la calibration moléculaire / comportementale. |
| Chimère cachée | Non. Croisement `Taxon × Motif × Atlas` **documenté**, verrouillage Valider, disclaimer « Croisement observé ». |

L’antithèse n’est pas le scepticisme pour lui-même : c’est la condition de **falsifiabilité**. Sans elle, l’outil devient spectacle et la revue devient fraude.

---

## III. Synthèse — Instrument, composition, échelle

### Architecture

```
Angular :4200  →  Spring Boot :8080  →  Postgres :5432
                         │
                         └─→ Python worker :8765  (LIF / jobs)
```

```
fruitfly/                    ← chemin dépôt (marque UI = O.V.N.I.)
├── apps/frontend/           # Instrument Lab · drawer Choose Your O.V.N.I.
├── apps/backend/            # API · auth · jobs
├── packages/science-engine/ # LIF déterministe
├── packages/science-datasets/
├── packages/fruitfly-sdk/   # notebooks Python
├── worker/ · services/worker/
├── docs/ · tests/science/ · scripts/ · infra/
```

### Trois axes, un individu

| Axe | Rôle | Exemple |
|---|---|---|
| **Taxonomie** | Hôte Catalogue of Life (7 rangs) | *Drosophila melanogaster*, corail, xénope… |
| **Motif ROI LIF** | Preuve seedable | circuit, famille, id, résumé, origine, N LIF, synapses, maille, statut |
| **Atlas cérébral** | Visu 4D / échelle | FlyWire, MaleCNS, HCP, Yeo-7… + VNC |

Le chercheur compose case par case (autocomplete + annuler/OK) ou tire au dé (hybridation numérique autorisée). Trois cadenas → *Entrer dans le laboratoire*. Le labo affiche l’avatar taxonomique, la chaîne neuronale du motif choisi, le nuage atlas choisi — sans réécriture croisée des axes.

### Échelles (ne jamais fusionner)

| Couche | Ordre | Fonction |
|---|---|---|
| Motif LIF | ~8–20 neurones | Preuve / CI / Methods |
| FlyWire 2024 | ~139 255 | Atlas cerveau pédagogique |
| MaleCNS + VNC | ~166 000 | Vue SNC |
| Proxies GPU | ≪ atlas | Affichage 4D |

### Éthique opérationnelle

O.V.N.I. est un outil **3R** : formuler, enseigner et falsifier *in silico* avant de mutiler le vivant. La préface du produit le dit sans euphémisme. La science qui sauve le monde commence par ne pas mentir sur ce qu’elle simule.

---

## Prérequis & lancement

Node 20+ · Java 21 · Python 3 · Podman/Docker (Postgres)

```bash
cd infra && docker compose up -d
cd worker && python3 server.py
cd apps/backend && ./mvnw spring-boot:run
cd apps/frontend && npm start
# ou : ./scripts/dev.sh
```

| Endpoint | URL |
|---|---|
| UI | http://127.0.0.1:4200 |
| API health | http://127.0.0.1:8080/actuator/health |
| Worker | http://127.0.0.1:8765/health |

**Auth :** flag `AUTH_ENABLED` / `fruitfly.security.enabled` — démonstration ouverte par défaut ; seed historique `lab@luminy.local` / `motdepasse12` (PI) si JWT réactivé.

```bash
./scripts/ci-science.sh
python3 -m venv .venv && .venv/bin/pip install -e packages/fruitfly-sdk
.venv/bin/python notebooks/01_luminy_quickstart.py
```

---

## Corpus pour revue

| Document | Fonction |
|---|---|
| [`docs/science/CHARTER.md`](docs/science/CHARTER.md) | Preuve vs pédagogie — non négociable |
| [`docs/science/OVNI.md`](docs/science/OVNI.md) | Définition O.V.N.I. |
| [`docs/science/OVNI_DEMOCRATISATION.md`](docs/science/OVNI_DEMOCRATISATION.md) | Éthique · 3R · référence |
| [`docs/science/CONNECTOME_SCALE.md`](docs/science/CONNECTOME_SCALE.md) | Motif vs atlas |
| [`docs/science/VOIX_CHIMERE.md`](docs/science/VOIX_CHIMERE.md) | Terminal `/voix` (hors preuve) |
| [`docs/science/MAELSTROM_ARGON.md`](docs/science/MAELSTROM_ARGON.md) | Échelles Argon / Maelstrom |
| [`docs/publication/JOSS_PAPER.md`](docs/publication/JOSS_PAPER.md) | Draft software paper |
| [`docs/publication/PLOS_COMP_BIOL_PLAN.md`](docs/publication/PLOS_COMP_BIOL_PLAN.md) | Plan PLOS Comp Biol |
| [`docs/COMPTE_RENDU_ETAT_ET_ROADMAP_PUBLICATION.md`](docs/COMPTE_RENDU_ETAT_ET_ROADMAP_PUBLICATION.md) | État · roadmap publication |
| [`docs/SCIENTIFIC_ROADMAP.md`](docs/SCIENTIFIC_ROADMAP.md) | Index scientifique |

**Versioning d’essai :** `circuit_id` · `dataset_hash` · `adapters_hash` · `seed` · `engine_version` · `motif_id` · exports Argon / RO-Crate / Zenodo.

---

## Synthèse finale

**Thèse :** un motif LIF versionné sur ROI connectomique rend les hypothèses circuit **rejouables** et **exportables**.  
**Antithèse :** toute confusion avec un cerveau entier, un LLM, ou une scène 3D « preuve » détruit la crédibilité scientifique et l’éthique 3R.  
**Synthèse :** O.V.N.I. est l’instrument qui tient les deux — composition Taxonomie × Motif × Atlas, preuve bornée, pédagogie déclarée — pour que des équipes BAC+10 formulent, falsifient et publient **sans mutiler le vivant par défaut**.

!!! SAVE THE PLANET now !!!

@R4V3army by Rutkarf
