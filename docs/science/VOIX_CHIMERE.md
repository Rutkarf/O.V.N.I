# Fiche technique — Voix de la chimère O.V.N.I.

| Champ | Valeur |
|---|---|
| Format API | `fruitfly.voix.v1` |
| Claim | **pédagogie** (hors preuve) |
| Cerveau | moteur LIF + `run_card` |
| Parole | gabarit déterministe (± reformulation Ollama) |
| UI | `/voix` — terminal style Kali |
| Engine | `packages/science-engine/.../voix.py` |

## Principe

Le croisement **Taxonomie × Motif ROI LIF × Atlas** produit une fiche d’identité.
Chaque essai LIF produit un `run_card` (vérité mesurable).
La voix **lit** ces deux sources. Elle ne modifie jamais un poids, une arête ou une action.

```
[Taxon] × [Motif ROI] × [Atlas]
            │
            ▼
        fiche_chimere
            │
   stimulate / replay
            ▼
         run_card  ──► gabarit_phrases ──► dialoguer (± LLM)
                              │                  │
                              └──── double_verif ┘
```

## Endpoints

| Méthode | Chemin Spring | Rôle |
|---|---|---|
| GET | `/api/v1/science/voix/aide` | aide commandes |
| POST | `/api/v1/science/voix/fiche` | fiche croisement |
| POST | `/api/v1/science/voix/lexique` | neurones / canaux autorisés |
| POST | `/api/v1/science/voix/gabarit` | phrases de vérité |
| POST | `/api/v1/science/voix/dialoguer` | question → réponse + vérif |
| POST | `/api/v1/science/voix/verify` | double vérification |
| POST | `/api/v1/science/voix/stimulate` | essai LIF + gabarit |
| POST | `/api/v1/science/voix/replay` | rejeu + gabarit |
| GET | `/api/v1/science/voix/journal` | historique JSON |
| GET | `/api/v1/science/voix/journal.md` | export markdown |

Worker miroir : `/api/science/voix/*`.

## Corps `fiche` (POST)

```json
{
  "organism_id": "dmel",
  "organism_label": "Drosophila melanogaster",
  "motif_id": "escape_feed_v1",
  "motif_label": "escape_feed_v1",
  "atlas_id": "flywire_brain_2024",
  "atlas_label": "FlyWire 2024",
  "neuron_count_lif": 11,
  "proxy_count_atlas": 139255,
  "run_id": "uuid-optionnel",
  "mode": "gabarit"
}
```

## Modes

| Mode | Comportement |
|---|---|
| `gabarit` | Phrases compilées depuis le `run_card` — **toujours disponible** |
| `llm` | Reformulation Ollama locale (`fruitfly`) ; si invente ou indisponible → fallback gabarit |

## Interdits (CHARTER)

- Présenter la voix / Ollama comme mécanisme neural
- Publier une réponse LLM dans les Méthodes comme preuve
- Inventer un neurone, un Hz ou une action absents du `run_card`

## Fichiers

- Engine : `packages/science-engine/src/fruitfly_science/voix.py`
- UI : `apps/frontend/src/app/science/voix-terminal/`
- Tests : `tests/science/test_voix_chimere.py`
- Docs sœurs : `VOIX_TUTORIEL.md`, `VOIX_HYPOTHESE.md`, `VOIX_DOUBLE_VERIF.md`
