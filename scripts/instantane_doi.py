#!/usr/bin/env python3
"""Prépare un instantané publication (empreintes + carnet) pour dépôt type Zenodo / DOI."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main() -> int:
    out = ROOT / "dist" / "instantane_publication"
    out.mkdir(parents=True, exist_ok=True)
    circuit = ROOT / "packages/science-datasets/circuits/escape_feed_v1/circuit.json"
    adapters = ROOT / "packages/science-datasets/circuits/escape_feed_v1/adapters.json"
    meta = {
        "cree_at": datetime.now(timezone.utc).isoformat(),
        "moteur": "fruitfly-science",
        "version_moteur": "0.4.0",
        "circuit_empreinte": sha_file(circuit)[:16] if circuit.exists() else None,
        "adaptateurs_empreinte": sha_file(adapters)[:16] if adapters.exists() else None,
        "carnet": "notebooks/01_luminy_quickstart.py",
        "charte": "docs/science/CHARTER.md",
        "note": (
            "Déposer ce dossier sur Zenodo (ou équivalent) pour obtenir un DOI. "
            "Ne pas inclure de secrets ni de runs locaux."
        ),
        "fichiers": [],
    }
    for rel in [
        "packages/science-datasets/circuits/escape_feed_v1/circuit.json",
        "packages/science-datasets/circuits/escape_feed_v1/adapters.json",
        "packages/science-datasets/motifs.json",
        "docs/science/CHARTER.md",
        "notebooks/01_luminy_quickstart.py",
    ]:
        src = ROOT / rel
        if not src.exists():
            continue
        dest = out / Path(rel).name
        dest.write_bytes(src.read_bytes())
        meta["fichiers"].append({"nom": dest.name, "empreinte": sha_file(src)[:16]})
    (out / "MANIFESTE.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(out)
    print(json.dumps(meta, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
