# PLOS Computational Biology — plan 6–12 mois

## Question (research-brief)

Sur un ROI escape×feed MaleCNS (`export_neuprint`), dans quelle mesure la structure du graphe (vs adaptateurs) est nécessaire pour préserver ESCAPE/EAT face à silence / rewire ?

## Prérequis données (P0 fait côté code)

| Item | Action labo |
|------|-------------|
| ROI neuPrint | Remplacer CSV curaté par export token `NEUPRINT_TOKEN` |
| Observation PiCsL | Remplacer `picsl_observation_fuite_v1.json` par essai réel n≥48 |
| DOI | Zenodo production + `FRUITFLY_DOI` |
| Auth | Déjà on — comptes institutionnels / OIDC |

## Expériences

1. Dose-réponse looming (GPU sweep agrégé, LIF CPU exact)  
2. Ablation LPLC2/LC4 vs contrôle shuffle  
3. Optogénétique virtuelle calibrée (intensité→Hz) × split-GAL4 LPLC2  
4. Concordance sim↔PiCsL (χ² + Bonferroni)  
5. Replay + RO-Crate deposit  

## Claims autorisés

« Sur le sous-graphe X (empreinte H), adaptateurs A, graine S, … »  
Interdit : UI 3D / OVNI comme preuve ; cerveau entier.

## Livrables

- Methods + Supplementary (UI pedagogy)  
- Zenodo bundle Argon+RO-Crate  
- Figures dose-réponse + validation imagerie  
