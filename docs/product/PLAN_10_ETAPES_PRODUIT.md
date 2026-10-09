# Plan d’action — 10 étapes (état d’implémentation)

| # | Étape | Statut code | Où |
|---|--------|-------------|-----|
| 1 | Gouvernance des claims | ✅ | `ClaimBanner`, bandeaux lab/atlas/expérience, `CHARTER.md` |
| 2 | Identité & accessibilité | ✅ | Roboto/Orbitron/Inter, skip-link, `:focus-visible` |
| 3 | Données de référence | ⚠️ | `GET /atlas/status`, `importer_roi_connectome.py`, sample CSV — **IDs réels = import humain** |
| 4 | LIF reproductible | ✅ | `run_card` signé, `POST /replay`, page Essais « Rejouer », Postgres `science_runs` |
| 5 | Auth & rôles | ⚠️ | Code PI/COLLAB/VIEWER + `application-prod.yml.example` — **activer en prod** |
| 6 | Protocole bout-en-bout | ✅ | `/workflow`, CRISPR 2 viz, Zenodo meta, PiCsL |
| 7 | Passerelles Maelstrom/Argon | ✅ | `export_maelstrom`, `export_argon_manifest`, Passerelles UI |
| 8 | Validation expérimentale | ✅ | `/validation`, χ² + Bonferroni, pont PiCsL |
| 9 | Scène 3D liée au modèle | ✅ | `circadian`, `temperature_c`, `fly_cohort` → LIF + Three.js |
| 10 | Multi-organismes | ⚠️ | `organisms_registry.json`, easter egg, page Organismes — **moteurs hors drosophile = roadmap** |

### Extension pédagogie (hors preuve)

| # | Étape | Statut | Où |
|---|--------|--------|-----|
| V1 | Voix chimère Taxonomie × ROI × Atlas | ✅ | `/voix`, `voix.py`, double vérif gabarit↔run_card |

## Prochaines étapes humaines / infra

1. Importer neuPrint avec `scripts/importer_roi_connectome.py` + sample `packages/science-datasets/samples/neuprint_roi_mini.csv`
2. `AUTH_ENABLED=true` + `fruitfly.security.enabled=true`
3. `ZENODO_TOKEN` → `scripts/deposer_zenodo.py`
4. Validation PiCsL réelle alimentant `/validation`
5. Revue direction IBDML sur claims et passerelles LIMS

Voir aussi [`science/MAELSTROM_ARGON.md`](../science/MAELSTROM_ARGON.md).
