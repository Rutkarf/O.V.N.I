"""Suites de validation dorées par motif."""

from __future__ import annotations

from fruitfly_science.paths import motif_id_actif
from fruitfly_science.stimulate import stimulate
from fruitfly_science.store import ENGINE_VERSION, selectionner_motif


def validate_suite(motif_id: str | None = None) -> dict:
    """Suite CI minimale pour le motif actif (ou demandé)."""
    mid = motif_id or motif_id_actif()
    if motif_id:
        selectionner_motif(motif_id)

    cases = []

    def trial(name: str, body: dict, expect: str) -> None:
        result = stimulate({**body, "seed": body.get("seed", 1)})
        ok = result["action"] == expect
        cases.append(
            {
                "name": name,
                "expected": expect,
                "got": result["action"],
                "pass": ok,
                "run_id": result["run_card"]["run_id"],
            }
        )

    if mid == "escape_feed_v1":
        trial("fuite_menace", {"looming": 0.9, "sugar": 0, "bitter": 0, "hunger": 0, "seed": 7}, "ESCAPE")
        trial("alimentation_sucre", {"looming": 0, "sugar": 0.9, "bitter": 0, "hunger": 0.8, "seed": 11}, "EAT")
        trial("amer_bloque", {"looming": 0, "sugar": 0.9, "bitter": 0.8, "hunger": 0.8, "seed": 13}, "IDLE")
        broken = 0
        for s in range(20, 30):
            r = stimulate({"looming": 0.9, "seed": s, "shuffle_edges": True})
            if r["action"] != "ESCAPE":
                broken += 1
        cases.append(
            {
                "name": "melange_reduit_fuite",
                "expected": "baisse_fuite",
                "got": f"non_fuite={broken}/10",
                "pass": broken >= 3,
                "run_id": None,
            }
        )
    elif mid == "vision_menace_v1":
        trial("fuite_menace", {"looming": 0.9, "seed": 7}, "ESCAPE")
        trial("repos_faible", {"looming": 0.0, "seed": 3}, "IDLE")
    elif mid == "gout_alimentation_v1":
        trial("alimentation", {"sugar": 0.9, "hunger": 0.8, "bitter": 0, "seed": 11}, "EAT")
        trial("amer", {"sugar": 0.9, "hunger": 0.8, "bitter": 0.8, "seed": 13}, "IDLE")
    elif mid in ("malecns_roi_fuite_lop_v1", "flywire_roi_fuite_lop_v1"):
        trial("fuite_menace", {"looming": 0.9, "sugar": 0, "bitter": 0, "hunger": 0, "seed": 7}, "ESCAPE")
        trial("alimentation_sucre", {"looming": 0, "sugar": 0.9, "bitter": 0, "hunger": 0.8, "seed": 11}, "EAT")
        trial("amer_bloque", {"looming": 0, "sugar": 0.9, "bitter": 0.8, "hunger": 0.8, "seed": 13}, "IDLE")
    else:
        # Motifs hypothèse / lecture : smoke stimulate sans assertion d'action
        r = stimulate({"sugar": 0.5, "looming": 0.5, "seed": 1})
        cases.append(
            {
                "name": "smoke_stimulate",
                "expected": "any",
                "got": r["action"],
                "pass": r["action"] in ("ESCAPE", "EAT", "IDLE"),
                "run_id": r["run_card"]["run_id"],
            }
        )

    # restaurer escape pour ne pas casser d'autres tests si motif forcé
    if motif_id and motif_id != "escape_feed_v1":
        try:
            selectionner_motif("escape_feed_v1")
        except Exception:
            pass

    return {
        "passed": all(c["pass"] for c in cases),
        "cases": cases,
        "engine_version": ENGINE_VERSION,
        "motif_id": mid,
    }
