# Échelles connectome — motif LIF vs atlas

## Pourquoi ~11 neurones dans le LIF ?

Le moteur d’intégration-décharge (LIF) tourne sur un **motif ROI versionné** (ex. `escape_feed_v1` : 11 neurones, 15 arêtes) inspiré des voies LPLC2/LC4→DNp01 et sucre→MN9.  
C’est le périmètre de **preuve** (graine, empreinte, Methods, CI).

## Pourquoi ~140k / ~166k dans la scène 3D ?

| Source | Neurones | Périmètre |
|---|---|---|
| FlyWire 2024 | 139 255 | Cerveau adulte complet |
| Isotropic fractionator 2021 | ~199 000 | Cerveau entier adulte |
| Connectome étendu 2026 | ~166 000 | Cerveau + chaîne nerveuse centrale |
| Estimations anciennes | ~100 000 | SNC (ordre de grandeur) |

Le Lab affiche un **nuage 4D** (points GPU + activité temporelle) à l’échelle cerveau / SNC, **piloté** par les `rates_hz` du motif LIF et les gains d’influence (onglet **Cerveau**).  
Ce n’est **pas** une simulation LIF de 140 000 neurones en temps réel.

## Labo interactif (clic / hyperfocus)

- Clic sur un proxy cerveau ou VNC → hyperfocus caméra + étude régionale  
- Clic sur un neurone du motif ROI (~11) → sélection LIF (Hz / silence / relance)  
- Molette = zoom · glisser = orbite · Esc = dézoomer  
- Objectif éthique : hypothèses et enseignement **in silico** pour réduire la dissection d’organismes vivants (3R) — sans confondre pédagogie 3D et preuve Methods

## Claim autorisé

- « Le motif ROI a N neurones ; la visu montre l’échelle FlyWire / SNC. »
- Interdit : « O.V.N.I. simule le cerveau FlyWire entier en LIF. »

Voir aussi [`CHARTER.md`](CHARTER.md), [`OVNI.md`](OVNI.md), onglet Lab → **Cerveau**.
