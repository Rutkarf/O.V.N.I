# Tutoriel — parler à la chimère

## Prérequis

1. Postgres + worker + backend + frontend (voir `README.md`)
2. Un croisement validé dans le tiroir Organisme (Taxonomie × Motif × Atlas)
3. Optionnel : Ollama + modèle `fruitfly` pour le mode `llm`

## En 5 minutes

1. Ouvrir **Labo 3D**, composer la chimère.
2. Le terminal Kali est **en bas à gauche** de la scène 3D (repliable via ▾).
3. Cliquer **last** (lie le dernier essai) ou **stimulate**.
4. Taper `ask Qui es-tu ?` puis `ask Quel neurone est le plus actif ?`
5. Lire la ligne `double_verif PASS` sous chaque réponse.

Page plein écran toujours dispo : menu **Voix** (`/voix`).

## Commandes du terminal

```
help
whoami
status
lexique
gabarit
bind <run_id>
last
ask Quel neurone est le plus actif ?
stimulate sugar=0.2 looming=0.95 seed=7
replay
verify
journal
export
mode gabarit
mode llm
clear
```

Toute phrase libre (sans verbe de commande) est traitée comme `ask …`.

## Scénario chercheur

| Étape | Action | Attendu |
|---|---|---|
| A | `stimulate looming=0.95 seed=11` | `run_id` + action LIF |
| B | `ask Quelle est ton action ?` | cite ESCAPE/EAT + run_id |
| C | `verify` | PASS |
| D | `replay` | MATCH |
| E | `ask Quel neurone est le plus actif ?` | id + Hz du rates_hz |
| F | `mode llm` puis re-ask | même faits, style reformulé ou fallback |

## Si ça casse

| Symptôme | Cause probable | Remède |
|---|---|---|
| `aucun essai` | pas de run lié | `stimulate` ou `bind` |
| LLM rejeté | invention Hz / neurone | reste en `gabarit` |
| Ollama timeout | modèle lent / absent | mode gabarit (défaut) |
| Fiche incomplète | croisement non validé | tiroir Organisme |

## Export pour le cahier de labo

`export` télécharge `voix-journal.md` — annexe pédagogique, **pas** une section Méthodes de preuve.
