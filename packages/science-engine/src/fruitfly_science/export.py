"""Liste d'essais et exports papier."""

from __future__ import annotations

import csv
import io
import json

from fruitfly_science.figures import figure_essai_svg
from fruitfly_science.stats import checklist_papier
from fruitfly_science.store import RUNS, _load_json


def list_runs(limit: int = 50) -> list[dict]:
    files = sorted(RUNS.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    out = []
    for path in files[:limit]:
        data = _load_json(path)
        card = data.get("run_card", {})
        out.append(
            {
                "run_id": card.get("run_id", path.stem),
                "created_at": card.get("created_at"),
                "action": card.get("action"),
                "seed": card.get("seed"),
                "inputs": card.get("inputs"),
                "circuit_id": card.get("circuit_id"),
                "motif_id": card.get("motif_id"),
            }
        )
    return out


def get_run(run_id: str) -> dict | None:
    path = RUNS / f"{run_id}.json"
    if not path.exists():
        return None
    return _load_json(path)


def export_spikes_csv(run_id: str) -> str | None:
    data = get_run(run_id)
    if not data:
        return None
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["neurone", "temps_spike_ms"])
    for nid, times in data.get("spikes", {}).items():
        for t in times:
            w.writerow([nid, f"{t:.3f}"])
    return buf.getvalue()


def export_methods(run_id: str) -> str | None:
    """Bloc Méthodes prêt pour papier (français source)."""
    data = get_run(run_id)
    if not data:
        return None
    card = data["run_card"]
    params = card.get("params") or {}
    policies = card.get("policies") or {}
    inputs = card.get("inputs") or {}
    adapters_hash = card.get("adapters_hash", "n/a")
    decision = card.get("decision_ms")
    decision_txt = (
        f"{decision:.2f} ms après début du stimulus"
        if decision is not None
        else "non atteinte dans la fenêtre de simulation"
    )
    check = checklist_papier(card)

    lines = [
        "# Méthodes — instrument LIF fruitfly (auto-généré)",
        "",
        "> À coller dans une sous-section Méthodes. Ajuster le langage d’hypothèse au niveau de claim.",
        "",
        "## Français (source labo / manuscrit)",
        "",
        (
            f"Nous avons simulé un réseau à intégration-et-décharge à fuite (LIF) sur le circuit "
            f"`{card['circuit_id']}` v`{card.get('circuit_version')}` "
            f"(empreinte jeu `{card['dataset_hash']}`) avec le moteur fruitfly "
            f"v{card.get('engine_version', '?')} (essai `{card['run_id']}`), "
            f"motif `{card.get('motif_id', '?')}`."
        ),
        "",
        (
            f"Intégration dt = {params.get('dt_ms')} ms pendant {params.get('duration_ms')} ms, "
            f"V_repos = {params.get('v_rest')} mV, V_remise = {params.get('v_reset')} mV, "
            f"V_seuil = {params.get('v_thresh')} mV, τ = {params.get('tau_ms')} ms, "
            f"R = {params.get('r_mohm')} MΩ, réfractaire = {params.get('refractory_ms')} ms, "
            f"force synaptique = {params.get('syn_strength', policies.get('syn_strength'))}, "
            f"τ synaptique = {params.get('syn_tau_ms', policies.get('syn_tau_ms'))} ms. "
            f"Graine aléatoire = {card['seed']}. Modèle = {card.get('modele', 'lif_mono')}."
        ),
        "",
        (
            f"Adaptateurs sensoriels version `{card.get('adapters_version')}` "
            f"(empreinte `{adapters_hash}`) ont mappé les canaux sucre / amer / menace "
            "vers des neurones nommés. Ces mappings sont des hypothèses tant que des arêtes "
            "connectome ne les remplacent pas."
        ),
        "",
        "### Politiques",
        f"```json\n{json.dumps(policies, indent=2, sort_keys=True, ensure_ascii=False)}\n```",
        "",
        "### Entrées stimulus",
        f"```json\n{json.dumps(inputs, indent=2, sort_keys=True, ensure_ascii=False)}\n```",
        "",
        (
            f"Lecture comportementale : action **{card['action']}** ({decision_txt}). "
            "Silence, mélange d’arêtes, optogénétique virtuelle et recâblage sont enregistrés "
            "dans la fiche d’essai."
        ),
        "",
        "### Provenance / limites",
        card.get("provenance", {}).get("disclaimer", ""),
        "",
        "Citations :",
    ]
    for c in card.get("provenance", {}).get("citations", []) or []:
        lines.append(f"- {c}")
    lines += [
        "",
        "La latence logicielle n’est pas un temps de réaction biologique et n’a pas été "
        "utilisée comme critère scientifique.",
        "",
        "### Liste de contrôle (type CONSORT soft)",
    ]
    for item in check:
        mark = "oui" if item["ok"] else "non"
        lines.append(f"- [{mark}] {item['critere']}")
    lines.append("")
    return "\n".join(lines)


def export_figure_svg(run_id: str, dose: dict | None = None) -> str | None:
    data = get_run(run_id)
    if not data:
        return None
    courbe = (dose or {}).get("curve")
    return figure_essai_svg(data, courbe)
