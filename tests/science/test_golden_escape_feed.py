"""Essais dorés : graine → action pour escape_feed_v1 (sans HTTP)."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ENGINE_SRC = REPO / "packages" / "science-engine" / "src"
sys.path.insert(0, str(ENGINE_SRC))

os.environ["FRUITFLY_DATASETS"] = str(REPO / "packages" / "science-datasets")
_tmp = tempfile.mkdtemp(prefix="fruitfly-dore-")
os.environ["FRUITFLY_RUNTIME"] = _tmp

from fruitfly_science.service import (  # noqa: E402
    concordance,
    flywire_controle,
    selectionner_motif,
    stimulate,
    validate_suite,
)


def test_fuite_menace():
    selectionner_motif("escape_feed_v1")
    r = stimulate({"looming": 0.9, "sugar": 0, "bitter": 0, "hunger": 0, "seed": 7})
    assert r["action"] == "ESCAPE"


def test_alimentation_sucre():
    r = stimulate({"looming": 0, "sugar": 0.9, "bitter": 0, "hunger": 0.8, "seed": 11})
    assert r["action"] == "EAT"


def test_amer_bloque():
    r = stimulate({"looming": 0, "sugar": 0.9, "bitter": 0.8, "hunger": 0.8, "seed": 13})
    assert r["action"] == "IDLE"


def test_validate_suite_passe():
    report = validate_suite("escape_feed_v1")
    assert report["passed"] is True, report
    names = {c["name"] for c in report["cases"]}
    assert {"fuite_menace", "alimentation_sucre", "amer_bloque", "melange_reduit_fuite"} <= names


def test_vision_et_gout():
    assert validate_suite("vision_menace_v1")["passed"]
    assert validate_suite("gout_alimentation_v1")["passed"]
    selectionner_motif("escape_feed_v1")


def test_roi_malecns_flywire():
    assert validate_suite("malecns_roi_fuite_lop_v1")["passed"]
    assert validate_suite("flywire_roi_fuite_lop_v1")["passed"]
    selectionner_motif("malecns_roi_fuite_lop_v1")


def test_concordance_et_flywire():
    selectionner_motif("escape_feed_v1")
    c = concordance()
    assert c["n"] >= 5
    f = flywire_controle()
    assert "taux_couverture" in f


def test_crispr2_carte():
    from fruitfly_science.passerelles import carte_genetique

    c = carte_genetique({"outil": "CRISPR 2 / Cas12a", "ligne": "BDSC"})
    assert c["famille"] == "CRISPR2"


if __name__ == "__main__":
    test_fuite_menace()
    test_alimentation_sucre()
    test_amer_bloque()
    test_validate_suite_passe()
    test_vision_et_gout()
    test_roi_malecns_flywire()
    test_concordance_et_flywire()
    test_crispr2_carte()
    print("dorures ok")
