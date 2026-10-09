"""Ingestion circuit (CSV / ROI MaleCNS / contrôle FlyWire)."""

from __future__ import annotations

import csv
import io
import json

from fruitfly_science.magasin_graphe import synchroniser_circuit
from fruitfly_science.paths import circuit_factory_path
from fruitfly_science.store import UPLOADS, _load_json, _reload_globals


def upload_edges_csv(text: str, *, mode: str = "motif", roi: str | None = None) -> dict:
    """Remplace les arêtes actives depuis un CSV.

    Modes :
      - motif : neurones déjà dans le motif actif
      - malecns : nouveaux IDs (import ROI)
      - flywire : même pipeline, provenance FlyWire déclarée
    Colonnes : pre,post,weight,sign[,synapses][,roi]
    """
    _reload_globals()
    base = _load_json(circuit_factory_path())
    cleaned_lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        cleaned_lines.append(line)
    reader = csv.DictReader(io.StringIO("\n".join(cleaned_lines)))
    if not reader.fieldnames or "pre" not in reader.fieldnames or "post" not in reader.fieldnames:
        raise ValueError("CSV requires headers: pre,post,weight,sign")
    edges = []
    rois_seen: set[str] = set()
    for row in reader:
        if not row.get("pre") or not row.get("post"):
            continue
        row_roi = (row.get("roi") or row.get("ROI") or "").strip()
        if roi and row_roi and row_roi.upper() != roi.upper():
            continue
        if row_roi:
            rois_seen.add(row_roi)
        edges.append(
            {
                "pre": row["pre"].strip(),
                "post": row["post"].strip(),
                "weight": float(row.get("weight") or 1.0),
                "sign": int(float(row.get("sign") or "1")),
                "synapses": int(float(row.get("synapses") or "1")),
                "roi": row_roi or None,
            }
        )
    if not edges:
        raise ValueError("aucune arête analysée (vérifier CSV / filtre ROI)")

    neurons = list(base["neurons"])
    neuron_ids = {n["id"] for n in neurons}
    unknown = set()
    for e in edges:
        for nid in (e["pre"], e["post"]):
            if nid not in neuron_ids:
                unknown.add(nid)

    if mode == "motif":
        if unknown:
            raise ValueError(
                "neurone(s) inconnu(s) en mode motif : "
                + ", ".join(sorted(unknown)[:12])
                + " — utilisez mode=malecns ou flywire"
            )
        circuit_id = f"{base.get('id', 'motif')}_personnalise"
        provenance_type = "televersement_utilisateur"
        disclaimer = "Arêtes téléversées sur neurones du motif. Pas MaleCNS sauf source explicite."
    else:
        tag = "flywire_roi" if mode == "flywire" else "malecns_roi"
        for nid in sorted(unknown):
            neurons.append(
                {
                    "id": nid,
                    "type": "importe",
                    "class": "connectome_ou_perso",
                    "hemisphere": "inconnu",
                    "roi": (roi or next(iter(rois_seen), "importe")),
                    "sex": "iso",
                    "tags": ["importe", tag],
                }
            )
            neuron_ids.add(nid)
        circuit_id = "flywire_roi_upload" if mode == "flywire" else "malecns_roi_upload"
        provenance_type = circuit_id
        disclaimer = (
            "Import ROI style connectome. Vérifier les IDs sur les sources officielles "
            "avant toute claim de publication. Les adaptateurs restent sur les noms motif "
            "sauf retargeting."
        )

    clean_edges = [
        {k: v for k, v in e.items() if k != "roi" or v}
        for e in edges
    ]
    # strip None roi keys for cleaner JSON
    clean_edges = []
    for e in edges:
        item = {
            "pre": e["pre"],
            "post": e["post"],
            "weight": e["weight"],
            "sign": e["sign"],
            "synapses": e["synapses"],
        }
        clean_edges.append(item)

    circuit = dict(base)
    circuit["neurons"] = neurons
    circuit["edges"] = clean_edges
    circuit["id"] = circuit_id
    circuit["version"] = "upload"
    circuit["provenance"] = {
        **base.get("provenance", {}),
        "type": provenance_type,
        "disclaimer": disclaimer,
        "upload_mode": mode,
        "roi_filter": roi,
        "new_neuron_count": len(unknown),
    }
    out = UPLOADS / "circuit_active.json"
    out.write_text(json.dumps(circuit, indent=2, ensure_ascii=False), encoding="utf-8")
    sync = synchroniser_circuit(circuit)
    return {
        "ok": True,
        "edge_count": len(clean_edges),
        "circuit_id": circuit["id"],
        "mode": mode,
        "new_neurons": sorted(unknown),
        "neuron_count": len(neurons),
        "rois": sorted(rois_seen),
        "magasin": sync,
    }


def reset_circuit() -> dict:
    path = UPLOADS / "circuit_active.json"
    if path.exists():
        path.unlink()
    from fruitfly_science.paths import motif_id_actif
    from fruitfly_science.store import load_circuit

    mid = motif_id_actif()
    synchroniser_circuit(load_circuit())
    return {"ok": True, "circuit_id": mid}
