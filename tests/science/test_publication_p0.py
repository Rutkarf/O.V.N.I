#!/usr/bin/env python3
"""Smoke P0/P1 publication : neuPrint claim, PiCsL, Argon DOI, RO-Crate, opto, GPU sweep."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
os.environ.setdefault("FRUITFLY_DATASETS", str(ROOT / "packages" / "science-datasets"))
os.environ.setdefault("FRUITFLY_RUNTIME", str(Path(os.environ.get("TMPDIR", "/tmp")) / "fruitfly-p0-test"))
sys.path.insert(0, str(ROOT / "packages" / "science-engine" / "src"))

from fruitfly_science.doi_argon import argon_with_doi  # noqa: E402
from fruitfly_science.genetics import apply_drivers  # noqa: E402
from fruitfly_science.gpu_sweeps import sweep_levels  # noqa: E402
from fruitfly_science.meta import atlas_claim_status  # noqa: E402
from fruitfly_science.opto import intensity_to_hz  # noqa: E402
from fruitfly_science.rocrate import build_rocrate  # noqa: E402
from fruitfly_science.store import selectionner_motif  # noqa: E402
from fruitfly_science.validation_imagerie import rapport_validation  # noqa: E402


def main() -> None:
    selectionner_motif("malecns_roi_fuite_lop_v1")
    st = atlas_claim_status()
    assert st["claim_level"] == "export_neuprint", st
    assert st["placeholders"] == 0, st
    assert st["pret_publication_connectome"] is True, st

    v = rapport_validation({"use_picsl_sample": True, "n_sim": 48, "escape_sim": 28})
    assert v["observation"]["n"] == 48, v
    assert "concordance_fuite" in v

    a = argon_with_doi(None)
    assert a["format"].startswith("fruitfly.argon"), a
    crate = build_rocrate(None)
    assert Path(crate["path"]).joinpath("ro-crate-metadata.json").exists()

    assert intensity_to_hz(0) == 0
    assert intensity_to_hz(1) > 50

    d = apply_drivers({"gal4": "SS00311", "uas": "UAS-ChR2"})
    assert d["drivers"]["active"] is True, d

    sw = sweep_levels([0, 0.5, 1.0], repeats=2, seed=3, use_gpu=False)
    assert "gpu_agg" in sw

    print("ok publication_p0")


if __name__ == "__main__":
    main()
