from __future__ import annotations

import json

from fruitfly_science.paths import datasets_root


def registre_organismes() -> dict:
    path = datasets_root() / "organisms_registry.json"
    if not path.exists():
        return {"version": "0", "organismes": []}
    return json.loads(path.read_text(encoding="utf-8"))
