# CRISPR 2 dans O.V.N.I. — bonne idée ?

**Oui, avec le bon périmètre.**

## Ce que CRISPR 2 apporte ici

« CRISPR 2 » (Cas12a, éditeurs de bases, prime editing) est un **outil génétique** pour perturber ou étiqueter des neurones / voies. Dans O.V.N.I., ça se branche naturellement sur :

- la **carte génétique** (lignée → driver → cibles motif)
- les **perturbations** LIF (`silence[]`, opto virtuelle, baisse de poids)
- le **protocole** PiCsL (valider la lignée en imagerie avant de claimer)

## Ce que ce n’est pas

- Pas une preuve de **câblage** MaleCNS/FlyWire  
- Pas un module de design de guides ARN / PCR wet-lab  
- Pas un substitut à Bloomington / TRiP / CRISPR in vivo

## Recommandation IBDML

| Inclure | Éviter |
|---|---|
| Mapping CRISPR2 → neurones motif + validation PiCsL | Simuler la biologie moléculaire CRISPR comme readout papier |
| Documenter Cas12a / base / prime dans le workflow | Confondre knock-out et arête connectome |

Implémenté : option **CRISPR 2 / Cas12a** dans `/workflow` et `carte_genetique` (`famille: CRISPR2`).
