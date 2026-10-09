# Passerelles IBDML / PiCsL

O.V.N.I. ne remplace pas les plateformes Luminy : il **se connecte** et **aide** à documenter le travail commun.

## Catalogue

Source : `packages/science-datasets/plateformes_ibdml.json`  
UI : route `/passerelles`  
API : `/api/v1/science/plateformes` et `/api/v1/science/passerelles/*`

## Ponts disponibles

| Pont | Usage |
|---|---|
| `pont_imagerie` | Métadonnées pour PiCsL / Fiji / confocal / spinning disk |
| `export_clem` | Corrélation lumière–électron (service EM IBDML) |
| `export_pipeline` | Paquet cluster / bioinfo / omique |
| `carte_genetique` | GAL4/UAS, CRISPR ↔ neurones motif |
| `journal_colonie` | Conditions d’élevage + session |
| `fiche_protocole` | Protocole lié à un instrument listé |

## Flux type

1. Lancer un essai (Expérience / Labo) → noter l’identifiant  
2. Ouvrir **Passerelles** → choisir l’outil (ex. PiCsL, Tecnai, Bloomington)  
3. Générer le pont → copier / télécharger le JSON  
4. Joindre aux notes d’acquisition, au registre labo ou au dépôt Méthodes  

## Charte visuelle

Couleurs charte IBDML : noir `#0a0a0a`, blanc `#f4f4f2`, vert `#007a3d`, rouge `#ce1126` (`styles.css`).
