# O.V.N.I. — devenir la référence (sans tuer des drosophiles)

## Intention

O.V.N.I. vise un **Organisme Vivant Numérique Intelligent** : un individu numérique dont le **cerveau = LIF sur connectome versionné**, la **morphologie = scène 3D**, la **génétique = éditions déclarées**, le **cycle de vie = œuf → larve → nymphe → adulte → sénescence → mort**.

Objectif éthique : **réduire** (idéalement remplacer une part croissante de) l’expérimentation létale sur organismes vivants pour les protocoles d’hypothèse, d’enseignement et de pré-screening — **sans prétendre** que le numérique abolit toute validation wet-lab (imagerie, comportement, génétique moléculaire).

## Ce qui manque encore pour être « la » référence

| Pilier | État actuel | Manque critique |
|--------|-------------|-----------------|
| **Connectome sourcé** | ROI `export_neuprint` | Atlas plein (~166k) + multi-ROI + updates MaleCNS/FlyWire |
| **Validation croisée** | χ² PiCsL sample | Banques d’observations multi-lab ouvertes (benchmark public) |
| **Cycle de vie** | Adulte autonome | Développement physiologique calibré (durée, métabolisme, mortalité) |
| **Génétique → phénotype → cerveau** | GAL4/UAS/CRISPR pédagogiques | Mapping lignées Bloomington → adaptateurs LIF déclarés + evidence |
| **Échelles Argon ↔ Maelstrom** | Manifestes export | Continuum mesure (voir § Échelles) opéré bout-en-bout |
| **Crédibilité éthique** | Charte claims | Comité éthique / 3R documenté ; DOI ; revue |
| **Accessibilité** | Auth + UI FR | Cloud public, notebooks, i18n EN, cours ouverts |
| **Communauté** | IBDML | Plugins napari/Fiji, API stable, contributions externes |

## Échelles Argon et Maelstrom (dans O.V.N.I.)

Ce ne sont **pas** l’atome d’argon ni le maelström océanique au sens physique naïf. Dans l’instrument :

| Échelle | Sens O.V.N.I. | Usage |
|---------|---------------|--------|
| **Argon** | Plus **fine** unité opératoire : pas de temps LIF (`dt_ms`), empreinte bit-exacte, échelle morphologique (`argon_scale`), manifeste reproductible / DOI | Travailler « à l’Argon près » = rejouer le même OVNI au même tick |
| **Maelstrom** | Plus **vaste** unité opératoire : cohorte, population, omics / CRISPR carte, balayages GPU, essaims | Travailler « au Maelstrom » = statistiques sur des milliers d’OVNI / lignées |

API : `GET/POST …/echelles`, exports historique `passerelles/argon` et `passerelles/maelstrom`.

## Naissance & cycle de vie

1. Choisir génotype / CRISPR / drivers  
2. **Naître** un OVNI (œuf) avec ce génome  
3. Développer : larve → nymphe → adulte → sénescence → mort  
4. À chaque stade : morphologie 3D + modulateurs LIF (mobilité, faim, menace)

Claim : le cycle est **pédagogique / hypothèse** jusqu’à calibration PiCsL des durées et mortalités.

## Démocratisation — critères de succès

1. Un étudiant peut naître un OVNI, le croiser, le valider contre un jeu public **sans animal tué**.  
2. Un labo publie un ROI + Methods avec DOI Argon en &lt; 1 jour.  
3. Une méta-analyse Maelstrom compare 10 labs sur le même motif.  
4. Les revues citent O.V.N.I. comme **instrument de protocole** (JOSS → PLOS).

## Limite honnête

Un OVNI **ne souffre pas** ; il ne remplace pas non plus la biologie moléculaire complète. La référence se gagne par **reproductibilité + validation ouverte + éthique 3R**, pas par slogan.
