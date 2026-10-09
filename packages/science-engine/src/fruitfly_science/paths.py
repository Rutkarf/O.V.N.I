"""Résolution des racines jeux de données et répertoires d'exécution."""

from __future__ import annotations

import json
import os
from pathlib import Path

_ENGINE_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT = _ENGINE_ROOT.parents[1]


def datasets_root() -> Path:
    env = os.environ.get("FRUITFLY_DATASETS")
    if env:
        return Path(env)
    return _REPO_ROOT / "packages" / "science-datasets"


def runtime_root() -> Path:
    env = os.environ.get("FRUITFLY_RUNTIME")
    if env:
        path = Path(env)
    else:
        path = _REPO_ROOT / "worker" / "science" / "data"
    path.mkdir(parents=True, exist_ok=True)
    (path / "runs").mkdir(exist_ok=True)
    (path / "uploads").mkdir(exist_ok=True)
    return path


def runs_dir() -> Path:
    return runtime_root() / "runs"


def uploads_dir() -> Path:
    return runtime_root() / "uploads"


def motif_actif_path() -> Path:
    return uploads_dir() / "motif_actif.json"


def motif_id_actif(defaut: str = "escape_feed_v1") -> str:
    path = motif_actif_path()
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8")).get("motif_id", defaut)
        except Exception:
            return defaut
    return os.environ.get("FRUITFLY_MOTIF", defaut)


def definir_motif(motif_id: str) -> str:
    motif_actif_path().write_text(
        json.dumps({"motif_id": motif_id}, ensure_ascii=False), encoding="utf-8"
    )
    return motif_id


def motif_dir(motif_id: str | None = None) -> Path:
    mid = motif_id or motif_id_actif()
    return datasets_root() / "circuits" / mid


def circuit_factory_path(motif_id: str | None = None) -> Path:
    return motif_dir(motif_id) / "circuit.json"


def adapters_factory_path(motif_id: str | None = None) -> Path:
    return motif_dir(motif_id) / "adapters.json"


def lister_motifs() -> list[dict]:
    index = datasets_root() / "motifs.json"
    if index.exists():
        return json.loads(index.read_text(encoding="utf-8")).get("motifs") or []
    out = []
    for d in sorted((datasets_root() / "circuits").glob("*")):
        if (d / "circuit.json").exists():
            out.append({"id": d.name, "nom": d.name, "niveau": "?"})
    return out
