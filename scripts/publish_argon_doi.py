#!/usr/bin/env python3
"""Publie le bundle Argon + RO-Crate (+ Zenodo si ZENODO_TOKEN)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "science-engine" / "src"))
os.environ.setdefault("FRUITFLY_DATASETS", str(ROOT / "packages" / "science-datasets"))


def main() -> int:
    from fruitfly_science.doi_argon import publish_bundle
    from fruitfly_science.store import selectionner_motif

    selectionner_motif("malecns_roi_fuite_lop_v1")
    bundle = publish_bundle(os.environ.get("FRUITFLY_RUN_ID"))
    print(json.dumps(bundle, indent=2, ensure_ascii=False))
    if os.environ.get("ZENODO_TOKEN"):
        return subprocess.call([sys.executable, str(ROOT / "scripts" / "deposer_zenodo.py")])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
