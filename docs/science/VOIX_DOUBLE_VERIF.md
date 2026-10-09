# Double vérification — protocole

## Objectif

Garantir qu’**aucune phrase affichée** ne contienne une mesure absente du `run_card`
ou un identifiant hors lexique du motif actif.

## Pipeline

```
question
   │
   ▼
gabarit (vérité) ──► [option] reformulation LLM
   │                         │
   └──────────┬──────────────┘
              ▼
        double_verif
              │
     ┌────────┴────────┐
     PASS              FAIL
     │                  │
  afficher         si LLM → rollback gabarit
                   sinon → marquer FAIL
```

## Checks effectués (`voix.double_verif`)

| Champ | Règle |
|---|---|
| `run_id` | cité ou présent dans `champs_cites` = essai lié |
| `action` | code ou libellé FR ∈ texte aligné sur `run_card.action` |
| `top_neurone` | id ∈ `rates_hz` et ∈ lexique |
| `top_hz` | cohérence avec `rates_hz` |
| `neurones_inventes` | aucun token « neuronish » hors lexique |
| sans essai | réponse doit `refused=true` si elle évoque des mesures |

## Commandes UI

- Après chaque `ask` : ligne automatique `double_verif PASS|FAIL`
- `verify` : rejoue le contrôle sur la dernière sortie / une question
- `replay` : contrôle indépendant LIF (preuve) — orthogonal à la voix

## Critères d’acceptation labo

| Niveau | Condition |
|---|---|
| Smoke | `stimulate` + `ask action` → PASS |
| Suite | 6 questions tutoriel → 6 PASS (gabarit) |
| LLM | 0 invention acceptée ; tout FAIL LLM → rollback |

## Journal

Chaque échange écrit un JSON sous le runtime `runs/voix_journal/`.
`export` produit un markdown horodaté pour le cahier (annexe pédagogique).

## Ce que ce n’est pas

- Pas un test statistique PiCsL
- Pas une validation connectome
- Pas une preuve que « la mouche parle »
