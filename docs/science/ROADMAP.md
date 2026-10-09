# O.V.N.I. — feuille de route (état honnête)

> Instrument LIF + UI labo IBDML. Les cases ✅ ci-dessous = code livré.  
> Les ⚠️ = pipeline prêt, **données / intégrations externes encore à brancher**.

## Déjà solide

- Moteur intégration-décharge déterministe + `run_card`
- Charte preuve vs pédagogie
- Dorures CI : escape_feed, vision, goût, ROI MaleCNS/FlyWire (reconstruction)
- Exports Méthodes / spikes / figures
- UI FR + Passerelles + Protocole (lignée → essai → PiCsL)
- Charte couleurs IBDML (noir / blanc / vert / rouge)

## Bloquants publication — progression

| Item | État |
|---|---|
| Sous-graphe ROI MaleCNS/FlyWire versionné + empreinte | ✅ `export_neuprint` (CSV curaté + fetch API) |
| Remplacer PLACEHOLDER par export neuPrint/FlyWire | ✅ offline ; ⚠️ token API pour live Janelia |
| Adaptateurs = hypothèses jusqu’à validation imagerie | ✅ déclaré ; validation PiCsL dans workflow |
| Essais centralisés Postgres | ✅ table `science_runs` + persistance stimulate |
| Sessions partagées en base | ✅ `demo_sessions` JPA |
| Passerelles = ponts JSON (pas LIMS instrument) | ✅ / ⚠️ pas d’API PiCsL native |
| DOI Zenodo | ✅ `deposer_zenodo.py` (jeton `ZENODO_TOKEN`) |
| Roadmap honnête | ✅ (ce fichier) |

## Usage labo quotidien

| Item | État |
|---|---|
| Auth + rôles PI/COLLAB/VIEWER | ✅ code ; `security.enabled` encore `false` en démo |
| Motif ROI sérieux par défaut | ✅ `malecns_roi_fuite_lop_v1` |
| Mapping lignées + CRISPR 2 | ✅ workflow + carte génétique |
| Stats χ² + Bonferroni | ✅ `stats.py` |
| CI science Python | ✅ |
| CI Angular / Spring | ⚠️ workflow Actions partiel |
| Compose Postgres + worker | ✅ `infra/docker-compose.yml` |

## Souhaitable

- Scale 166k : magasin prêt, dump connectome absent
- Jobs async durables (Postgres + worker) : amorcé
- Suites dorées olfaction/cour/horloge : smoke seulement
- Intégration instrument LIMS / acquisition : hors repo

## Priorité suivante (humain + données)

1. Importer un vrai export ROI neuPrint → `claim_level=export_neuprint`  
2. Activer auth (`AUTH_ENABLED` + `security.enabled`) pour le labo  
3. Publier un instantané Zenodo avec jeton  
4. Brancher métadonnées PiCsL (processus labo, pas seulement JSON)
