#!/usr/bin/env python3
"""Fetch / matérialise un ROI neuPrint → CSV → circuit claimable.

Sans NEUPRINT_TOKEN : utilise le CSV curaté (body IDs numériques) et importe.
Avec token : interroge l’API neuPrint (cypher) puis importe.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "packages" / "science-datasets" / "samples" / "neuprint_roi_fuite_lop_v1.csv"
IMPORTER = ROOT / "scripts" / "importer_roi_connectome.py"


def fetch_neuprint_cypher(token: str, dataset: str, server: str, cypher: str) -> dict:
    url = f"{server.rstrip('/')}/api/custom/custom-query"
    body = json.dumps({"cypher": cypher, "dataset": dataset}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def rows_from_neuprint(data: dict) -> list[dict]:
    """Attend colonnes pre, post, weight, synapses, pre_body_id, post_body_id."""
    cols = data.get("columns") or []
    rows_out = []
    for row in data.get("data") or []:
        d = dict(zip(cols, row))
        rows_out.append(
            {
                "pre": str(d.get("pre") or d.get("a_type") or ""),
                "post": str(d.get("post") or d.get("b_type") or ""),
                "weight": float(d.get("weight") or d.get("roiInfo") or 1),
                "sign": 1,
                "synapses": int(d.get("synapses") or d.get("weight") or 1),
                "roi": str(d.get("roi") or "LOP"),
                "pre_body_id": str(d.get("pre_body_id") or d.get("a_id") or ""),
                "post_body_id": str(d.get("post_body_id") or d.get("b_id") or ""),
            }
        )
    return [r for r in rows_out if r["pre"] and r["post"]]


def write_csv(path: Path, rows: list[dict]) -> None:
    fields = ["pre", "post", "weight", "sign", "synapses", "roi", "pre_body_id", "post_body_id"]
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def main() -> int:
    p = argparse.ArgumentParser(description="ROI neuPrint → circuit fruitfly")
    p.add_argument("--motif-id", default="malecns_roi_fuite_lop_v1")
    p.add_argument("--dataset", default=os.environ.get("NEUPRINT_DATASET", "hemibrain:v1.2.1"))
    p.add_argument(
        "--server",
        default=os.environ.get("NEUPRINT_SERVER", "https://neuprint.janelia.org"),
    )
    p.add_argument("--csv-out", type=Path, default=None)
    p.add_argument("--offline", action="store_true", help="Forcer CSV curaté local")
    args = p.parse_args()

    token = os.environ.get("NEUPRINT_TOKEN", "").strip()
    csv_path = args.csv_out or (
        ROOT / "packages" / "science-datasets" / "samples" / f"neuprint_fetch_{args.motif_id}.csv"
    )

    if token and not args.offline:
        cypher = """
        MATCH (a:Neuron)-[c:ConnectsTo]->(b:Neuron)
        WHERE a.type IN ['LPLC2','LC4','LPLC1'] AND b.type STARTS WITH 'DNp01'
        RETURN a.type AS pre, b.type AS post, c.weight AS weight, c.weight AS synapses,
               a.bodyId AS pre_body_id, b.bodyId AS post_body_id, 'LOP' AS roi
        LIMIT 200
        """
        try:
            data = fetch_neuprint_cypher(token, args.dataset, args.server, cypher)
            rows = rows_from_neuprint(data)
            if not rows:
                print("neuPrint: 0 arêtes — fallback CSV curaté", file=sys.stderr)
                csv_path = SAMPLE
            else:
                write_csv(csv_path, rows)
                print(f"neuPrint: {len(rows)} arêtes → {csv_path}")
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
            print(f"neuPrint API indisponible ({exc}) — fallback CSV curaté", file=sys.stderr)
            csv_path = SAMPLE
    else:
        csv_path = SAMPLE
        print(f"mode offline / sans token → {csv_path}")

    cmd = [
        sys.executable,
        str(IMPORTER),
        str(csv_path),
        "--motif-id",
        args.motif_id,
        "--source",
        "neuprint",
    ]
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
