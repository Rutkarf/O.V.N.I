# Hypothèse — voix comme sonde de mécanisme

## Énoncé

> Si la chimère O.V.N.I. est définie par le croisement Taxonomie × Motif ROI LIF × Atlas,
> alors une interface de dialogue **ancrée exclusivement** dans le `run_card`
> permet à un chercheur d’interroger le mécanisme (rates, action, stimuli)
> sans confondre pédagogie et preuve biologique.

## Prédictions testables

1. **Identité** : `ask Qui es-tu ?` cite taxon, `motif_id`, atlas de la fiche.
2. **Fidélité rates** : le neurone / Hz cités ∈ `rates_hz` de l’essai lié.
3. **Refus honnête** : sans essai, toute question de mesure est refusée.
4. **Double vérif** : une réponse qui invente un neurone hors lexique → `FAIL`.
5. **Rejeu** : même graine → même action ; la voix re-cite les mêmes faits.
6. **LLM non décisionnel** : mode `llm` ne change jamais `action` du `run_card`.

## Contre-hypothèses (à garder visibles)

- La voix pourrait être prise pour le cerveau → **mitigation** : bandeau claim + CHARTER.
- Le LLM pourrait halluciner → **mitigation** : double vérif + fallback gabarit.
- L’atlas visu pourrait être confondu avec le LIF → **mitigation** : gabarit explicite « proxies ≠ LIF 1:1 ».

## Design expérimental minimal

1. Motif fixe `escape_feed_v1`, seed `11`, looming `0.95`.
2. Jeu de 6 questions du tutoriel.
3. Critère de succès : 6/6 `double_verif PASS` en mode gabarit.
4. Critère LLM : si Ollama présent, reformulation acceptée **seulement** si PASS ; sinon fallback.

## Lien publication

Cette couche reste **hors Méthodes de preuve** (voir `CHARTER.md`, item I10 du compte-rendu).
Elle peut figurer en *Supplementary — pedagogical probe* si un relecteur le demande.
