# Ce que les experts IBDML attendent encore

Ce document répond au feedback « fragile / mal fait » : distinction nette entre **déjà sérieux** et **encore insuffisant pour claims**.

## Déjà défendable devant un expert

| Attendu | Où |
|---|---|
| Moteur LIF déterministe + graine | `packages/science-engine` |
| Empreintes circuit / adaptateurs | `run_card` |
| Charte preuve vs pédagogie | `docs/science/CHARTER.md` |
| Suites dorées CI | `scripts/ci-science.sh` |
| ROI MaleCNS/FlyWire versionné (pipeline) | `malecns_roi_fuite_lop_v1` + importer |
| Essais persistés Postgres | `science_runs` |
| Workflow lignée → PiCsL | `/workflow` |
| UI labo 3D lisible (charte IBDML) | `/lab` |

## Encore insuffisant pour « outil de recherche mature »

1. **Export neuPrint réel** — remplacer les `PLACEHOLDER` body IDs  
2. **Auth activée** en labo (`AUTH_ENABLED` + `security.enabled`)  
3. **Validation imagerie documentée** par essai (pas seulement JSON pont)  
4. **Stats / n / plan expérimental** validés avec un biostat  
5. **Revue UI par utilisateurs PiCsL** (métadonnées acquisition)  
6. **DOI Zenodo** avec jeton institutionnel  

## Message à tenir devant la direction

> O.V.N.I. est un **instrument de protocole LIF** avec scène pédagogique.  
> Les claims connectome ne sont autorisés **qu’après** import d’un ROI officiel.  
> La 3D et le Labo servent à **piloter et expliquer**, jamais à prouver le câblage.
