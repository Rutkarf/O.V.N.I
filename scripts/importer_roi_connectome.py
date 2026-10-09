#!/usr/bin/env python3
"""Importe un export ROI neuPrint / FlyWire (CSV) vers un circuit versionné claimable.

CSV attendu : pre,post,weight,sign,synapses,roi[,pre_body_id,post_body_id]
Après import, claim_level passe à export_neuprint ou export_flywire.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DS = ROOT / "packages" / "science-datasets"


def main() -> int:
    p = argparse.ArgumentParser(description="Importer ROI connectome → circuit fruitfly")
    p.add_argument("csv_path", type=Path)
    p.add_argument("--motif-id", required=True, help="ex. malecns_roi_fuite_lop_v1")
    p.add_argument("--source", choices=("neuprint", "flywire"), default="neuprint")
    p.add_argument("--roi", default="")
    args = p.parse_args()

    out_dir = DS / "circuits" / args.motif_id
    out_dir.mkdir(parents=True, exist_ok=True)
    base_path = out_dir / "circuit.json"
    base = (
        json.loads(base_path.read_text(encoding="utf-8"))
        if base_path.exists()
        else {"id": args.motif_id, "neurons": [], "edges": [], "provenance": {}}
    )

    neurons = {n["id"]: n for n in base.get("neurons") or []}
    edges = []
    with args.csv_path.open(encoding="utf-8") as f:
        rows = csv.DictReader(
            (line for line in f if line.strip() and not line.lstrip().startswith("#"))
        )
        for row in rows:
            pre, post = row["pre"].strip(), row["post"].strip()
            if args.roi and (row.get("roi") or "").strip() and row["roi"].strip() != args.roi:
                continue
            for nid, body_key in ((pre, "pre_body_id"), (post, "post_body_id")):
                if nid not in neurons:
                    neurons[nid] = {
                        "id": nid,
                        "type": "importe",
                        "class": "connectome",
                        "roi": (row.get("roi") or args.roi or "importe"),
                        "sex": "male" if args.source == "neuprint" else "female",
                        "malecns_body_id": row.get(body_key) or None,
                        "provenance_cellule": f"export_{args.source}",
                    }
                elif row.get(body_key):
                    neurons[nid]["malecns_body_id" if args.source == "neuprint" else "flywire_root_id"] = (
                        row[body_key]
                    )
            edges.append(
                {
                    "pre": pre,
                    "post": post,
                    "weight": float(row.get("weight") or 1),
                    "sign": int(float(row.get("sign") or 1)),
                    "synapses": int(float(row.get("synapses") or 1)),
                    "source": f"export_{args.source}",
                    "citation": f"Import {args.csv_path.name}",
                    "claim_level": f"export_{args.source}",
                    "roi": (row.get("roi") or args.roi or None),
                }
            )

    if not edges:
        print("aucune arête", file=sys.stderr)
        return 1

    # Retirer les neurones orphelins encore PLACEHOLDER (non touchés par l’export)
    used = {e["pre"] for e in edges} | {e["post"] for e in edges}
    cleaned = []
    for n in neurons.values():
        if n["id"] not in used:
            continue
        blob = f"{n.get('malecns_body_id', '')}{n.get('flywire_root_id', '')}"
        if "PLACEHOLDER" in blob:
            # ne pas publier de placeholder sur un export claimable
            n = {**n, "malecns_body_id": n.get("malecns_body_id") if "PLACEHOLDER" not in str(n.get("malecns_body_id", "")) else None}
            n["flywire_root_id"] = (
                n.get("flywire_root_id")
                if "PLACEHOLDER" not in str(n.get("flywire_root_id", ""))
                else None
            )
        cleaned.append(n)

    claim = f"export_{args.source}"
    circuit = {
        "id": args.motif_id,
        "name": base.get("name") or args.motif_id,
        "version": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
        "provenance": {
            **(base.get("provenance") or {}),
            "type": "roi_connectome_export",
            "claim_level": claim,
            "not_full_connectome": True,
            "imported_at": datetime.now(timezone.utc).isoformat(),
            "source_file": str(args.csv_path.name),
            "disclaimer": (
                f"Arêtes importées depuis export {args.source}. "
                "Vérifier les body IDs avant publication."
            ),
        },
        "neurons": cleaned,
        "edges": edges,
    }
    raw = json.dumps(circuit, sort_keys=True, ensure_ascii=False).encode()
    h = hashlib.sha256(raw).hexdigest()[:16]
    (out_dir / "circuit.json").write_text(
        json.dumps(circuit, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (out_dir / "dataset.yaml").write_text(
        f"id: {args.motif_id}\nversion: \"{circuit['version']}\"\n"
        f"empreinte_sha256_16: {h}\nniveau_preuve: {claim}\n",
        encoding="utf-8",
    )
    # adapters: keep existing or copy from escape
    ap = out_dir / "adapters.json"
    if not ap.exists():
        src = DS / "circuits" / "escape_feed_v1" / "adapters.json"
        ap.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
    print(json.dumps({"ok": True, "motif_id": args.motif_id, "empreinte": h, "edges": len(edges)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
