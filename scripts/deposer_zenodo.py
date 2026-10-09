#!/usr/bin/env python3
"""Dépôt Zenodo réel si ZENODO_TOKEN est défini ; sinon prépare l’instantané local.

Usage:
  export ZENODO_TOKEN=...   # jeton dépôt Zenodo (sandbox: ZENODO_SANDBOX=1)
  python3 scripts/deposer_zenodo.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def prepare_bundle() -> Path:
    import subprocess

    subprocess.check_call([sys.executable, str(ROOT / "scripts" / "instantane_doi.py")])
    return ROOT / "dist" / "instantane_publication"


def zenodo_api(path: str, token: str, data: bytes | None = None, method: str = "GET") -> dict:
    base = (
        "https://sandbox.zenodo.org/api"
        if os.environ.get("ZENODO_SANDBOX")
        else "https://zenodo.org/api"
    )
    req = urllib.request.Request(
        f"{base}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    bundle = prepare_bundle()
    token = os.environ.get("ZENODO_TOKEN")
    meta_path = bundle / "MANIFESTE.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    if not token:
        print(
            json.dumps(
                {
                    "ok": True,
                    "mode": "local",
                    "message": "ZENODO_TOKEN absent — instantané local seulement",
                    "chemin": str(bundle),
                    "manifeste": meta,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    try:
        deposition = zenodo_api(
            "/deposit/depositions",
            token,
            data=json.dumps(
                {
                    "metadata": {
                        "title": "fruitfly — instantané instrument LIF IBDML",
                        "upload_type": "software",
                        "description": (
                            "Empreintes circuit/adaptateurs + charte + carnet. "
                            "Voir MANIFESTE.json."
                        ),
                        "creators": [{"name": "fruitfly / IBDML"}],
                    }
                }
            ).encode(),
            method="POST",
        )
        print(
            json.dumps(
                {
                    "ok": True,
                    "mode": "zenodo",
                    "deposition_id": deposition.get("id"),
                    "links": deposition.get("links"),
                    "note": "Joindre les fichiers du dossier dist/instantane_publication via l’API fichiers puis publier.",
                    "chemin_local": str(bundle),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    except urllib.error.HTTPError as ex:
        print(ex.read().decode(), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
