"""Environnement LIF + rejeu d’essai."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ENGINE_SRC = REPO / "packages" / "science-engine" / "src"
sys.path.insert(0, str(ENGINE_SRC))
os.environ["FRUITFLY_DATASETS"] = str(REPO / "packages" / "science-datasets")
os.environ["FRUITFLY_RUNTIME"] = tempfile.mkdtemp(prefix="fruitfly-env-")

from fruitfly_science.environnement import modulateurs  # noqa: E402
from fruitfly_science.stimulate import replay_stimulate, stimulate  # noqa: E402


def test_modulateurs_nuit():
    m = modulateurs("night", 25.0)
    assert m["circadian"] == "night"
    assert m["sugar_drive_scale"] < 1.0


def test_temperature_froid():
    m = modulateurs("day", 16.0)
    assert m["temp_factor"] < 1.0


def test_stimulate_enregistre_environnement():
    r = stimulate({"sugar": 0.8, "bitter": 0, "looming": 0, "hunger": 0.5, "seed": 3, "circadian": "night", "temperature_c": 18})
    inp = r["run_card"]["inputs"]
    assert inp["circadian"] == "night"
    assert inp["temperature_c"] == 18.0
    assert "environnement" in inp


def test_replay_match():
    r1 = stimulate({"looming": 0.95, "seed": 11, "duration_ms": 500})
    rid = r1["run_card"]["run_id"]
    r2 = replay_stimulate({"run_id": rid})
    assert r2["replay_of"] == rid
    assert r2["replay_match"] is True
    assert r2["action"] == r1["action"]


if __name__ == "__main__":
    test_modulateurs_nuit()
    test_temperature_froid()
    test_stimulate_enregistre_environnement()
    test_replay_match()
    print("ok environnement_replay")
