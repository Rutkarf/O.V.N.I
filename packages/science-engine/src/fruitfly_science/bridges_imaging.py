"""Ponts napari / Fiji / PiCsL — manifests d’échange (pas de LIMS natif)."""

from __future__ import annotations

import json
from pathlib import Path

from fruitfly_science.export import get_run
from fruitfly_science.paths import runtime_root
from fruitfly_science.passerelles import pont_imagerie


def export_fiji_macro(run_id: str | None = None) -> dict:
    """Génère un .ijm stub + JSON métadonnées pour Fiji/ImageJ."""
    pont = pont_imagerie(run_id)
    out = runtime_root() / "bridges" / "fiji"
    out.mkdir(parents=True, exist_ok=True)
    macro = f"""// fruitfly → Fiji bridge (pédagogie / métadonnées)
// run_id: {run_id or 'none'}
print("fruitfly PiCsL bridge — ouvrir stack comportement");
// run("Open...", "open=[/path/to/behavior.tif]");
// Annoter events ESCAPE/EAT puis File>Save As>JSON pour validation_imagerie
"""
    (out / "fruitfly_picsl_bridge.ijm").write_text(macro, encoding="utf-8")
    meta = {
        "format": "fruitfly.bridge.fiji.v1",
        "macro": str(out / "fruitfly_picsl_bridge.ijm"),
        "pont": pont,
        "expected_observation_schema": "fruitfly.picsl.observation.v1",
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


def export_napari_manifest(run_id: str | None = None) -> dict:
    """Manifeste napari (layers + metadata) pour revue imagerie."""
    essai = get_run(run_id) if run_id else None
    card = (essai or {}).get("run_card") or {}
    out = runtime_root() / "bridges" / "napari"
    out.mkdir(parents=True, exist_ok=True)
    manifest = {
        "format": "fruitfly.bridge.napari.v1",
        "viewer": "napari>=0.4",
        "layers": [
            {
                "name": "behavior_video",
                "type": "image",
                "path": "${PICSL_STACK}",
                "metadata": {"run_id": run_id, "stimulus": card.get("inputs")},
            },
            {
                "name": "escape_events",
                "type": "points",
                "path": "${PICSL_EVENTS_CSV}",
                "metadata": {"action": "ESCAPE"},
            },
        ],
        "plugin_hint": "fruitfly-napari (roadmap) — charger meta.json",
        "validation_endpoint": "/api/science/validation/imagerie",
    }
    (out / "napari_manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    # script Python minimal
    py = '''"""Ouvrir un essai fruitfly dans napari (si installé)."""
import json
from pathlib import Path
try:
    import napari
except ImportError:
    raise SystemExit("pip install napari")
meta = json.loads(Path(__file__).with_name("napari_manifest.json").read_text())
print(meta["format"], "— renseigner PICSL_STACK puis viewer.add_image(...)")
'''
    (out / "open_in_napari.py").write_text(py, encoding="utf-8")
    return manifest


def load_picsl_observation(path: str | Path | None = None) -> dict:
    """Charge un JSON d’observation PiCsL (échantillon ou chemin labo)."""
    from fruitfly_science.paths import datasets_root

    p = Path(path) if path else datasets_root() / "samples" / "picsl_observation_fuite_v1.json"
    if not p.exists():
        return {"format": "fruitfly.picsl.observation.v1", "error": f"absent: {p}", "n": 0}
    return json.loads(p.read_text(encoding="utf-8"))
