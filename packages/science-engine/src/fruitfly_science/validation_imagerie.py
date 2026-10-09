"""Pont simulation ↔ observation PiCsL (χ² sur proportions d’actions)."""

from __future__ import annotations

from fruitfly_science.bridges_imaging import load_picsl_observation
from fruitfly_science.export import get_run
from fruitfly_science.passerelles import pont_imagerie
from fruitfly_science.stats import bonferroni, chi2_deux_proportions, checklist_papier


def rapport_validation(body: dict | None = None) -> dict:
    body = body or {}
    run_id = body.get("run_id")
    sim = get_run(str(run_id)) if run_id else None
    card = (sim or {}).get("run_card") or {}
    obs = body.get("observe") or body.get("observation") or {}
    # Charger observation PiCsL réelle / échantillon si demandé
    if body.get("picsl_sample") or body.get("use_picsl_sample") or body.get("picsl_path"):
        loaded = load_picsl_observation(body.get("picsl_path"))
        if not loaded.get("error"):
            obs = {**loaded, **obs}
    # observe: { escape: k, eat: k, idle: k, n: N } ou counts dict
    n_obs = int(obs.get("n") or 0)
    k_esc_obs = int(obs.get("escape") or (obs.get("action_counts") or {}).get("ESCAPE") or 0)
    n_sim = int(body.get("n_sim") or body.get("repeats") or 0)
    k_esc_sim = int(body.get("escape_sim") or 0)
    if sim and not n_sim:
        act = card.get("action")
        n_sim = 1
        k_esc_sim = 1 if act == "ESCAPE" else 0
    if body.get("batch_run_ids"):
        ids = list(body.get("batch_run_ids") or [])[:200]
        n_sim = len(ids)
        k_esc_sim = 0
        for rid in ids:
            d = get_run(str(rid))
            if d and d.get("run_card", {}).get("action") == "ESCAPE":
                k_esc_sim += 1
    chi2 = (
        chi2_deux_proportions(k_esc_sim, n_sim, k_esc_obs, n_obs)
        if n_obs > 0 and n_sim > 0
        else {"ok": False, "note": "n_sim ou n_obs manquant"}
    )
    p_vals = [float(chi2.get("p_approx") or 1.0)] if chi2.get("ok") else []
    bonf = bonferroni(p_vals) if p_vals else []
    pret = bool(
        chi2.get("ok")
        and n_obs >= 20
        and n_sim >= 8
        and obs.get("protocol_id")
    )
    return {
        "format": "fruitfly.validation_imagerie.v1",
        "pont_picsl": pont_imagerie(run_id),
        "simulation": {
            "run_id": run_id,
            "action": card.get("action"),
            "n": n_sim,
            "k_fuite": k_esc_sim,
            "checklist_papier": checklist_papier(card) if card else [],
        },
        "observation": {
            "n": n_obs,
            "k_fuite": k_esc_obs,
            "source": obs.get("source") or "PiCsL / comportement",
            "protocol_id": obs.get("protocol_id"),
            "acquisition": obs.get("acquisition"),
            "format": obs.get("format"),
        },
        "concordance_fuite": chi2,
        "bonferroni": bonf,
        "pret_publication_picsl": pret,
        "bridges": {
            "fiji": "/api/science/bridges/fiji",
            "napari": "/api/science/bridges/napari",
        },
        "interpretation": (
            "p_approx < 0.05 suggère un écart sim↔obs sur la proportion de fuite — "
            "revoir adaptateurs ou protocole avant claim."
            if chi2.get("ok") and float(chi2.get("p_approx") or 1) < 0.05
            else "Écart non flaggé au seuil nominal — documenter quand même dans Méthodes."
        ),
    }
