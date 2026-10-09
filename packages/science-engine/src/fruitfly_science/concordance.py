"""Concordance MaleCNS / FlyWire ↔ identifiants motif."""

from __future__ import annotations

import json
from pathlib import Path

from fruitfly_science.paths import datasets_root


def charger_concordance() -> dict:
    path = datasets_root() / "mappings" / "concordance_malecns_flywire.json"
    if not path.exists():
        return {"version": "0", "entries": []}
    return json.loads(path.read_text(encoding="utf-8"))


def table_concordance() -> dict:
    data = charger_concordance()
    return {
        "version": data.get("version"),
        "notes": data.get("notes"),
        "n": len(data.get("entries") or []),
        "entrees": data.get("entries") or [],
    }


def rapport_flywire(circuit: dict) -> dict:
    """Contrôle de concordance : neurones motif présents dans la table FlyWire/MaleCNS."""
    data = charger_concordance()
    by_motif = {e["motif_id"]: e for e in data.get("entries") or []}
    presents = []
    manquants = []
    hypotheses = []
    for n in circuit.get("neurons") or []:
        nid = n["id"]
        if nid in by_motif:
            e = by_motif[nid]
            row = {"id": nid, "malecns": e.get("malecns_type"), "flywire": e.get("flywire_type"), "roi": e.get("roi")}
            if e.get("claim") in ("hypothese", "lecture_seule"):
                hypotheses.append(row)
            else:
                presents.append(row)
        else:
            manquants.append(nid)
    return {
        "circuit_id": circuit.get("id"),
        "couverts": presents,
        "hypotheses": hypotheses,
        "manquants_table": manquants,
        "taux_couverture": round(
            len(presents) / max(1, len(circuit.get("neurons") or [])), 3
        ),
        "avertissement": (
            "Les correspondances sont documentaires ; vérifier sur male-cns.janelia.org "
            "et FlyWire avant publication."
        ),
    }
