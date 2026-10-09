"""Chemins, E/S circuit/adaptateurs, atlas."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from fruitfly_science.magasin_graphe import atlas_page, synchroniser_circuit
from fruitfly_science.paths import (
    adapters_factory_path,
    circuit_factory_path,
    definir_motif,
    lister_motifs,
    motif_id_actif,
    runs_dir,
    uploads_dir,
)

ENGINE_VERSION = "0.4.0"


def _refresh_paths() -> tuple[Path, Path, Path, Path]:
    circuit = circuit_factory_path()
    adapters = adapters_factory_path()
    runs = runs_dir()
    uploads = uploads_dir()
    return circuit, adapters, runs, uploads


CIRCUIT_PATH, ADAPTERS_PATH, RUNS, UPLOADS = _refresh_paths()
ADAPTERS_ACTIVE = UPLOADS / "adapters_active.json"


def _reload_globals() -> None:
    global CIRCUIT_PATH, ADAPTERS_PATH, RUNS, UPLOADS, ADAPTERS_ACTIVE
    CIRCUIT_PATH, ADAPTERS_PATH, RUNS, UPLOADS = _refresh_paths()
    ADAPTERS_ACTIVE = UPLOADS / "adapters_active.json"


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _adapters_path() -> Path:
    _reload_globals()
    return ADAPTERS_ACTIVE if ADAPTERS_ACTIVE.exists() else ADAPTERS_PATH


def _load_adapters() -> dict:
    return _load_json(_adapters_path())


def _circuit_path() -> Path:
    _reload_globals()
    custom = UPLOADS / "circuit_active.json"
    return custom if custom.exists() else CIRCUIT_PATH


def load_circuit() -> dict:
    return _load_json(_circuit_path())


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()[:16]


def get_adapters() -> dict:
    data = _load_adapters()
    data["_meta"] = {
        "active_path": str(_adapters_path().name),
        "customized": ADAPTERS_ACTIVE.exists(),
        "hash": file_hash(_adapters_path()),
        "motif_id": motif_id_actif(),
    }
    return data


def save_adapters(body: dict) -> dict:
    required = ("inputs", "readouts", "priority", "parameters")
    for key in required:
        if key not in body:
            raise ValueError(f"adaptateurs manquants : {key}")
    clean = {k: v for k, v in body.items() if not k.startswith("_")}
    if "version" not in clean:
        clean["version"] = "personnalise"
    if "policies" not in clean:
        clean["policies"] = _load_json(ADAPTERS_PATH).get("policies", {})
    ADAPTERS_ACTIVE.write_text(json.dumps(clean, indent=2, ensure_ascii=False), encoding="utf-8")
    return get_adapters()


def reset_adapters() -> dict:
    if ADAPTERS_ACTIVE.exists():
        ADAPTERS_ACTIVE.unlink()
    return get_adapters()


def selectionner_motif(motif_id: str) -> dict:
    path = circuit_factory_path(motif_id)
    if not path.exists():
        raise ValueError(f"motif inconnu : {motif_id}")
    definir_motif(motif_id)
    _reload_globals()
    # reset circuit upload when switching motif
    custom = UPLOADS / "circuit_active.json"
    if custom.exists():
        custom.unlink()
    if ADAPTERS_ACTIVE.exists():
        ADAPTERS_ACTIVE.unlink()
    circuit = load_circuit()
    synchroniser_circuit(circuit)
    return {
        "ok": True,
        "motif_id": motif_id,
        "circuit_id": circuit["id"],
        "neuron_count": len(circuit["neurons"]),
        "motifs": lister_motifs(),
    }


def motifs() -> dict:
    return {"motif_actif": motif_id_actif(), "motifs": lister_motifs()}


def atlas(
    *,
    page: int | None = None,
    taille: int = 50,
    roi: str | None = None,
    classe: str | None = None,
) -> dict:
    circuit = load_circuit()
    adapters = _load_adapters()
    synchroniser_circuit(circuit)
    base = {
        "circuit_id": circuit["id"],
        "circuit_version": circuit["version"],
        "provenance": circuit["provenance"],
        "adapters_version": adapters["version"],
        "dataset_hash": file_hash(_circuit_path()),
        "citations": circuit["provenance"].get("citations", []),
        "motif_id": motif_id_actif(),
        "magasin": "sqlite",
    }
    if page is not None:
        paged = atlas_page(
            circuit["id"], page=page, taille=taille, roi=roi, classe=classe
        )
        return {**base, **paged, "edges": []}
    neurons = circuit["neurons"]
    edges = circuit["edges"]
    if roi:
        neurons = [n for n in neurons if n.get("roi") == roi]
    if classe:
        neurons = [n for n in neurons if n.get("class") == classe]
    return {
        **base,
        "neuron_count": len(circuit["neurons"]),
        "edge_count": len(edges),
        "neurons": neurons,
        "edges": edges if not (roi or classe) else [
            e for e in edges
            if any(n["id"] == e["pre"] for n in neurons)
            and any(n["id"] == e["post"] for n in neurons)
        ],
        "rois": sorted({n.get("roi", "?") for n in circuit["neurons"]}),
        "classes": sorted({n.get("class", "?") for n in circuit["neurons"]}),
    }
