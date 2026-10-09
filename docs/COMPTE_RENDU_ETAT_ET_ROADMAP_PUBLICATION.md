# O.V.N.I. — Compte-rendu d’état & roadmap publication

**Date** : 2026-10-09 (mise à jour P0/P1 livrée)  
**Périmètre** : audit + implémentation publication  
**Objectif** : photographier l’existant et lister ce qu’il faut pour être **à la pointe** et **publiable**.

---

## 1. Verdict en une phrase

O.V.N.I. a désormais le **socle P0 publication** (ROI `export_neuprint`, PiCsL sample, Argon/DOI/RO-Crate, auth on, Methods-only, OpenAPI, opto calibrée, split-GAL4, GPU sweeps, ponts napari/Fiji) ; le **papier biologie** reste conditionné aux jetons labo (`NEUPRINT_TOKEN`, `ZENODO_TOKEN`, observations PiCsL réelles).

---

## 2. Architecture actuelle

```
Angular :4200  →  Spring Boot :8080  →  Postgres
                         │
                         └─→ Python worker :8765  (science-engine + sim lab)
```

| Couche | Emplacement | Rôle |
|--------|-------------|------|
| UI instrument | `apps/frontend` (Angular) | Lab 3D, atlas, batch, règles, validation, workflow, génétique |
| API / auth / persistance | `apps/backend` (Spring Boot, Java 21) | JWT, organismes, jobs, `science_runs`, proxy science |
| Moteur preuve | `packages/science-engine` (~23 modules) | LIF, stimulate, stats, exports, genetics, passerelles |
| Données | `packages/science-datasets` | circuits, motifs, schemas, genetics, organisms |
| SDK notebooks | `packages/fruitfly-sdk` | client Python recherche |
| Worker HTTP | `worker/` (+ `services/worker` lien) | façade `/api/science/*` + sim Ollama |
| CI | `scripts/ci-science.sh`, `.github/workflows/` | dorures LIF |

**Charte non négociable** (`docs/science/CHARTER.md`) :  
**Preuve** = motif LIF + empreintes ; **3D / CRISPR viz / OVNI / Ollama** = pédagogie.

---

## 3. Features livrées (état code)

### 3.1 Preuve / science (cœur publication)

| Feature | État | Notes |
|---------|------|--------|
| LIF déterministe + `run_card` (seed, hashes, engine) | ✅ | `stimulate.py`, `lif.py` |
| Replay bit-identique | ✅ | `POST /replay` |
| Dose-réponse, batch, A/B politiques | ✅ | |
| Adaptateurs déclarés (sensor → neurone) | ✅ | hypothèses jusqu’à validation |
| Exports Méthodes / spikes CSV / figures SVG | ✅ | |
| Stats χ² + Bonferroni (validation imagerie) | ✅ | `stats.py`, `/validation` |
| Atlas + claim status | ✅ | placeholders body_id possibles |
| Motif ROI MaleCNS / FlyWire (structure) | ⚠️ | import réel via script encore humain |
| Persistance essais Postgres | ✅ | `science_runs` |
| Concordance FlyWire (rapport) | ✅ | |
| Dorures CI escape_feed | ✅ | `ci-science.sh` |
| Magasin graphe / scale atlas | ⚠️ | structure prête, dump 166k absent |
| Jobs async dose/lot | ⚠️ | amorcé |

### 3.2 Instrument labo (UI)

| Feature | État |
|---------|------|
| Cockpit Lab 3D (Three.js) morphologie drosophile | ✅ |
| Stimuli sucre / amer / looming / faim | ✅ |
| Jour/nuit, température, essaim multi-mouches | ✅ |
| Comparaison A/B, courbes dose | ✅ |
| Autonomie 3D 1 clic + O.V.N.I. (cerveau LIF autonome) | ✅ |
| Atlas neurones, Experiment, Rules, Batch, Runs, Data | ✅ |
| Workflow lignée → CRISPR 2 → PiCsL | ✅ |
| Passerelles Maelstrom / Argon / pont imagerie / CLEM | ✅ |
| Guide FR + claim banners | ✅ |
| Auth PI/COLLAB/VIEWER | ⚠️ code OK, **désactivée en démo** |
| Multi-organismes (registre + easter egg) | ⚠️ hors drosophile = roadmap |

### 3.3 Génétique pédagogique (labo 3D)

| Feature | État |
|---------|------|
| Croisements mendéliens (6 types) + liste F1/F2 sélectionnable | ✅ |
| Éditeur d’allèles (travail / parents A·B) | ✅ |
| CRISPR 1 Cas9 / CRISPR 2 Cas12a / Ciseaux Kepler | ✅ |
| GAL4 × UAS (elav, GMR, OK107 × GFP/ChR2/Kir) | ✅ |
| Phénotype → mesh (taille Argon `Tb`, yeux, ailes, glow) | ✅ |
| Manifeste Argon reproductibilité | ✅ |
| Lien génétique → décision LIF (wet-lab) | ❌ pédagogique seulement |

### 3.4 Infra & docs

| Feature | État |
|---------|------|
| Docker Compose Postgres | ✅ |
| Scripts Zenodo / import ROI | ✅ scripts, jeton / données = humain |
| Docs CHARTER, ROADMAP, GENETIQUE, OVNI, Maelstrom | ✅ |
| CI Angular + Spring complète | ⚠️ partielle |
| Couverture tests genetics / drivers | ⚠️ faible |

---

## 4. Gaps critiques avant revue

Ces points bloquent un papier **biologie / connectome** (pas un software paper).

1. **Connectome sourcé** — remplacer `PLACEHOLDER` par export neuPrint/FlyWire versionné (`claim_level=export_neuprint`).
2. **Validation imagerie réelle** — jeux de données PiCsL / comportement avec n, plan, effect sizes revue.
3. **Auth activée** en labo partagé + audit trail essais.
4. **DOI Zenodo** institutionnel du snapshot moteur + datasets.
5. **Stats & preregistration** — plan expérimental validé biostat (puissance, corrections multiples).
6. **Séparation nette papier** — Methods = LIF ; Supplementary = UI 3D/génétique (jamais confondus).
7. **CI verte end-to-end** — science + frontend + backend sur chaque PR.
8. **Reproductibilité container** — image Argon publiée (tag digest) + `environment.yml` / lockfiles.

---

## 5. Roadmap « pointe techno + publication »

Priorité P0 = bloquant papier · P1 = compétitivité · P2 = vision long terme.

### 5.1 Pour publier (cibles revues)

| Cible revue | Type de papier | Minimum |
|-------------|----------------|---------|
| **JOSS** / *eLife Tools* | Software / instrument | DOI, tests, docs, charte claims, demo notebook |
| **PLOS Comp Biol** / *eNeuro* | Méthodes + résultats motif | ROI MaleCNS réel + contrôles + stats |
| **Nature Methods** (ambitieux) | Instrument + validation | Imagerie + comportement + benchmark open |

### 5.2 Features futures — Science & preuve (P0–P1)

| # | Feature | Pourquoi | Priorité |
|---|---------|----------|----------|
| S1 | Import neuPrint automatisé + fingerprint SHA | Claim connectome défendable | P0 |
| S2 | Benchmark public escape/feed vs littérature | Comparabilité / review | P0 |
| S3 | Modèles conductance / HH optionnels (hors LIF défaut) | Sensibilité modèle | P1 |
| S4 | Plasticité courte durée / adaptation documentée | Dynamique réaliste | P1 |
| S5 | Optogénétique virtuelle calibrée (intensité → Hz) | Lien GAL4/UAS ↔ LIF | P1 |
| S6 | Silence / ablation / rewire avec rapport stats | Question research-brief | P0 |
| S7 | Parallelisme GPU pour balayages (hors preuve bit-exact) | Scale 10⁴–10⁶ essais | P1 |
| S8 | Provenance W3C / RO-Crate par essai | FAIR / dépôt | P1 |
| S9 | Suite dorée olfaction / cour / horloge (pas smoke) | Couverture biologie | P1 |
| S10 | Alignement FlyWire + MaleCNS multi-atlas | Concordance publication | P1 |

### 5.3 Features futures — Instrument & UX (P1)

| # | Feature | Priorité |
|---|---------|----------|
| U1 | Éditeur circuit graphe interactif (upload + viz) | P1 |
| U2 | Timeline essai synchronisée spikes ↔ 3D | P1 |
| U3 | Mode « Methods only » (masque pédagogie) | P0 publication |
| U4 | Partage session collab temps réel (CRDT / WS) | P2 |
| U5 | Accessibilité WCAG 2.2 AA audit | P1 |
| U6 | i18n EN (paper-ready) + FR source | P1 |
| U7 | Export figure journal-ready (vector, DPI) | P1 |

### 5.4 Features futures — Génétique & CRISPR (P1–P2)

| # | Feature | Priorité |
|---|---------|----------|
| G1 | Balancer chromosomes / stock Bloomington IDs | P1 |
| G2 | Cartes de liaison + recombination rates | P1 |
| G3 | Drivers split-GAL4 / LexA / QF2 | P1 |
| G4 | CRISPR base/prime editing pédagogique | P2 |
| G5 | Lien génotype → adaptateurs LIF (hypothèse déclarée) | P1 |
| G6 | Export FlyBase / GenBank stub | P2 |

### 5.5 Features futures — Infra & ML frontier (P1–P2)

| # | Feature | Priorité |
|---|---------|----------|
| I1 | Conteneur Argon signé + SBOM | P0 |
| I2 | Auth OIDC institutionnel (Luminy / CNRS) | P1 |
| I3 | Queue jobs Redis/RQ + retry | P1 |
| I4 | Observabilité (OpenTelemetry, Sentry) | P1 |
| I5 | Emulateur connectome large (approx. sparsifiée) | P2 |
| I6 | Empreinte différentielle circuit (diff motif) | P1 |
| I7 | Plugin Fiji / napari pour pont PiCsL | P1 |
| I8 | API OpenAPI 3.1 générée + client typed | P1 |
| I9 | Datasets HuggingFace / Zenodo versionnés | P0 |
| I10 | LLM **hors preuve** : assistant Methods / checklist seulement | P2 |

### 5.6 Features futures — Validation expérimentale (P0)

| # | Feature | Priorité |
|---|---------|----------|
| V1 | Pipeline raw → ROI → LIF → comparaison comportement | P0 |
| V2 | Blind analysis / split train-holdout lab | P1 |
| V3 | Checklist ARRIVE / MDAR dans export Methods | P1 |
| V4 | Inter-lab round-robin (2 sites) | P2 |

---

## 6. Plan de publication recommandé (12–18 mois)

### Phase A — Software paper (3–6 mois)

1. Activer auth + mode Methods-only.  
2. Zenodo DOI + image Argon.  
3. Notebook reproductible + JOSS review.  
4. CI full (science + Angular + Spring).  
5. Couverture tests genetics / replay / validation.

**Livrable** : « O.V.N.I.: a reproducible LIF instrument for Drosophila circuit protocols ».

### Phase B — Methods + biology (6–12 mois)

1. Import ROI MaleCNS réel.  
2. Ablation/rewire + dose-réponse vs données lab.  
3. Validation PiCsL documentée.  
4. Stats preregistrées.

**Livrable** : PLOS Comp Biol / eNeuro — motif escape×feed.

### Phase C — Instrument platform (12–18 mois)

1. Pont LIMS / napari.  
2. Scale atlas + jobs GPU.  
3. Split-GAL4 × LIF optogénétique virtuelle calibrée.

---

## 7. Risques & discipline des claims

| Risque | Mitigation |
|--------|------------|
| Confondre 3D/OVNI/CRISPR UI avec preuve | CHARTER + bandeaux + mode Methods-only |
| Motif literature ≠ cerveau entier | Claim level explicite dans `run_card` |
| Latence UI ≠ latence biologique | Interdire dans Methods |
| Génétique pédagogique prise pour wet-lab | Disclaimer GENETIQUE_ARGON.md |
| Auth ouverte en prod | checklist déploiement |

---

## 8. Nettoyage contenu (2026-10-09)

- Charte visuelle renommée **charte IBDML** (noir / blanc / vert / rouge) — libellés politiques retirés des sources et docs.  
- Classe UI décorative → `.brand-bar`.  
- Aucune occurrence politique restante dans le code source du dépôt (hors dépendances tierces éventuelles dans `.venv`, non versionnées).

---

## 9. Prochaines actions concrètes (ordre)

1. `scripts/importer_roi_connectome.py` + CSV neuPrint réel.  
2. `AUTH_ENABLED=true` + `fruitfly.security.enabled=true`.  
3. `ZENODO_TOKEN` → DOI.  
4. Mode Methods-only dans le Lab.  
5. Tests unitaires `genetics.py` + fix CI si script post-dorures casse.  
6. Draft JOSS paper + figure architecture.  
7. Session biostat + plan expérimental Phase B.

---

## 10. Références internes

| Doc | Rôle |
|-----|------|
| [`science/CHARTER.md`](science/CHARTER.md) | Preuve vs pédagogie |
| [`science/ROADMAP.md`](science/ROADMAP.md) | Phases A–H honnêtes |
| [`science/research-brief.md`](science/research-brief.md) | Question de recherche |
| [`product/PLAN_10_ETAPES_PRODUIT.md`](product/PLAN_10_ETAPES_PRODUIT.md) | Plan produit |
| [`product/QUALITE_EXPERTS.md`](product/QUALITE_EXPERTS.md) | Attentes IBDML |
| [`science/GENETIQUE_ARGON.md`](science/GENETIQUE_ARGON.md) | Génétique / Kepler / drivers |
| [`architecture/TARGET_STRUCTURE.md`](architecture/TARGET_STRUCTURE.md) | Monorepo |
