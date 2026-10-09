#!/usr/bin/env python3
"""
Quickstart recherche O.V.N.I. — style notebook / script R.

Prérequis:
  1. Stack up (worker :8765, backend :8080, frontend :4200)
  2. pip install -e ../packages/fruitfly-sdk

Usage:
  python notebooks/01_luminy_quickstart.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "sdk" / "src"))

from fruitfly import FruitflyClient, FruitflyError  # noqa: E402


def main() -> None:
    ff = FruitflyClient("http://127.0.0.1:8080")
    email = "lab@luminy.local"
    password = "motdepasse12"

    try:
        ff.login(email, password)
        print("login ok")
    except FruitflyError:
        ff.register(email, password, "Luminy Lab")
        print("register ok")

    atlas = ff.atlas()
    print(f"atlas: {atlas['neuron_count']} neurons, {atlas['edge_count']} edges")
    print(f"adapters: {atlas['adapters_version']} hash={atlas['dataset_hash']}")

    # --- single trial -------------------------------------------------------
    run = ff.stimulate(looming=0.9, seed=7)
    print(f"looming→ {run['action']} @ {run['decision_ms']} ms  id={run['run_card']['run_id'][:8]}")

    # --- customize rules (policy knobs) for this session --------------------
    adapters = ff.adapters()
    adapters["policies"]["bitter_gate_threshold"] = 0.3
    adapters["parameters"]["duration_ms"] = 400
    saved = ff.save_adapters(adapters)
    print(f"adapters saved customized={saved['_meta']['customized']} hash={saved['_meta']['hash']}")

    # --- dose-response (courbe comme en R) ----------------------------------
    curve = ff.dose_response(
        channel="looming",
        levels=[0.0, 0.25, 0.5, 0.75, 1.0],
        repeats=5,
        base_seed=42,
    )
    print("\ndose-response looming:")
    for row in curve["curve"]:
        print(
            f"  level={row['level']:.2f}  "
            f"P(ESCAPE)={row['p_escape']:.2f}  "
            f"P(EAT)={row['p_eat']:.2f}  "
            f"P(IDLE)={row['p_idle']:.2f}"
        )

    # --- batch factorial ----------------------------------------------------
    trials = []
    for sugar in (0.0, 0.9):
        for bitter in (0.0, 0.8):
            trials.append({"sugar": sugar, "bitter": bitter, "hunger": 0.8, "looming": 0.0})
    batch = ff.batch(trials, base_seed=100)
    print("\nbatch sugar×bitter:", json.dumps(batch["action_counts"], sort_keys=True))

    # --- per-run override without saving adapters ---------------------------
    override = ff.stimulate(
        sugar=0.9,
        hunger=0.8,
        seed=3,
        policy_overrides={"bitter_suppresses_sugar": False},
        param_overrides={"syn_strength": 12.0},
    )
    print(f"override trial → {override['action']}")

    suite = ff.validate()
    print(f"\nCI suite: {'PASS' if suite['passed'] else 'FAIL'}")

    # restore defaults for other users of the instrument
    ff.reset_adapters()
    print("adapters reset to factory")


if __name__ == "__main__":
    main()
