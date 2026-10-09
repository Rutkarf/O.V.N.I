"""DOI / dépôt Argon — manifeste + lien Zenodo / DOI local pending."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fruitfly_science.passerelles import export_argon_manifest, export_zenodo_instantane
from fruitfly_science.rocrate import build_rocrate
from fruitfly_science.paths import runtime_root


def argon_with_doi(run_id: str | None = None, doi: str | None = None) -> dict:
    """Enrichit le manifeste Argon avec DOI (env FRUITFLY_DOI / ZENODO)."""
    man = export_argon_manifest(run_id)
    resolved = (
        doi
        or os.environ.get("FRUITFLY_DOI")
        or os.environ.get("ARGON_DOI")
        or man.get("doi")
    )
    pending = None
    if not resolved:
        pending = f"10.5281/zenodo.PENDING-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    man["doi"] = resolved
    man["doi_pending"] = pending
    man["zenodo"] = export_zenodo_instantane()
    man["rocrate"] = {"endpoint": "/api/science/rocrate", "run_id": run_id}
    man["publication"] = {
        "joss": "docs/publication/JOSS_PAPER.md",
        "plos": "docs/publication/PLOS_COMP_BIOL_PLAN.md",
        "claim": "Preuve = motif LIF + empreintes ; DOI ancre le snapshot Argon.",
    }
    man["format"] = "fruitfly.argon.doi.v1"
    out = runtime_root() / "argon"
    out.mkdir(parents=True, exist_ok=True)
    (out / "manifest_doi.json").write_text(
        json.dumps(man, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return man


def publish_bundle(run_id: str | None = None) -> dict:
    """RO-Crate + Argon DOI + hints Zenodo (dépôt réel = scripts/deposer_zenodo.py)."""
    argon = argon_with_doi(run_id)
    crate = build_rocrate(run_id)
    return {
        "format": "fruitfly.publication.bundle.v1",
        "argon": argon,
        "rocrate_path": crate.get("path"),
        "next": [
            "export ZENODO_TOKEN=… && python3 scripts/deposer_zenodo.py",
            "export NEUPRINT_TOKEN=… && python3 scripts/fetch_neuprint_roi.py",
            "Alimenter PiCsL réel dans /validation",
        ],
    }
