# Research brief — O.V.N.I. × Luminy

## Question de recherche (draft à valider ensemble)

> Sur un motif escape×feed inspiré des voies LPLC2/LC4→DNp01 et sugar→MN9, dans quelle mesure la structure du graphe (vs paramètres d’adapters) est nécessaire pour préserver les readouts ESCAPE / EAT face à une ablation / rewire ?

## Circuit pilote

- Motif logiciel : `escape_feed_v1` (**11 neurones**, 15 arêtes) — sous-graphe ROI simulé en LIF
- Échelles atlas (visu / magasin, **pas** LIF 1:1) : FlyWire 2024 ≈ **139 255** (cerveau) ; SNC étendu ≈ **166 000** ; isotropic ≈ 199 000
- Cible dataset publication : **MaleCNS v1.0** (sous-graphe escape + feeding)
- Contrôle : drop aléatoire d’arêtes / silence de readouts

## Ce que l’instrument fait déjà

- LIF déterministe seedable
- Adapters déclarés (`adapters.json`)
- Run cards + export `spikes.csv` + `methods.md`
- Suite CI locale (`/api/v1/science/validate`)
- Upload CSV d’arêtes pour hypothèses de câblage
- Nuage 4D pédagogique cerveau / SNC (proxies GPU pilotés par ratesHz du motif)

## Ce qui reste hors-scope jusqu’à MaleCNS

- Affirmer que le motif = cerveau entier
- Affirmer que le nuage 4D = simulation LIF de 140k neurones
- Utiliser le LLM comme preuve biologique

## Rôles proposés

| Personne | Rôle |
|---|---|
| Chercheuse Luminy | question, circuits, Methods, validation neuro |
| Soft | engine, UI instrument, repro, infra |

## Revue cible (à trancher)

PLOS Computational Biology / eLife Tools / JOSS (software paper) puis claim circuit plus fort.
