"""Export RO-Crate 1.1 pour un essai / snapshot Argon (FAIR)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from fruitfly_science.passerelles import export_argon_manifest
from fruitfly_science.paths import datasets_root, runtime_root
from fruitfly_science.store import ENGINE_VERSION, atlas, file_hash, load_circuit
from fruitfly_science.paths import circuit_factory_path


def build_rocrate(run_id: str | None = None, out_dir: Path | None = None) -> dict:
    """Produit un RO-Crate minimal (ro-crate-metadata.json)."""
    circuit = load_circuit()
    a = atlas()
    argon = export_argon_manifest(run_id)
    now = datetime.now(timezone.utc).isoformat()
    crate_id = "./"
    meta = {
        "@context": "https://w3id.org/ro/crate/1.1/context",
        "@graph": [
            {
                "@id": crate_id,
                "@type": "Dataset",
                "name": f"fruitfly LIF snapshot — {circuit.get('id')}",
                "description": (
                    "Instantané reproductible fruitfly (circuit, adaptateurs, run_card). "
                    "Preuve = motif LIF + empreintes ; UI 3D hors crate Methods."
                ),
                "datePublished": now,
                "license": "https://creativecommons.org/licenses/by/4.0/",
                "hasPart": [
                    {"@id": "circuit.json"},
                    {"@id": "argon_manifest.json"},
                    {"@id": "MANIFESTE.json"},
                ],
                "conformsTo": {"@id": "https://w3id.org/ro/crate/1.1"},
            },
            {
                "@id": "ro-crate-metadata.json",
                "@type": "CreativeWork",
                "about": {"@id": crate_id},
                "conformsTo": {"@id": "https://w3id.org/ro/crate/1.1"},
            },
            {
                "@id": "circuit.json",
                "@type": "File",
                "name": "circuit.json",
                "encodingFormat": "application/json",
                "sha256": file_hash(circuit_factory_path()),
            },
            {
                "@id": "argon_manifest.json",
                "@type": "File",
                "name": "argon_manifest.json",
                "encodingFormat": "application/json",
            },
            {
                "@id": "#engine",
                "@type": "SoftwareApplication",
                "name": "fruitfly-lif",
                "version": ENGINE_VERSION,
            },
            {
                "@id": "#dataset",
                "@type": "Dataset",
                "name": str(circuit.get("id")),
                "identifier": a.get("dataset_hash"),
                "additionalProperty": [
                    {
                        "@type": "PropertyValue",
                        "name": "claim_level",
                        "value": (circuit.get("provenance") or {}).get("claim_level"),
                    }
                ],
            },
        ],
    }

    target = out_dir or (runtime_root() / "rocrate")
    target.mkdir(parents=True, exist_ok=True)
    (target / "ro-crate-metadata.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (target / "argon_manifest.json").write_text(
        json.dumps(argon, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    # copie légère circuit
    (target / "circuit.json").write_text(
        json.dumps(circuit, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    manifeste = {
        "format": "fruitfly.rocrate.v1",
        "path": str(target),
        "run_id": run_id,
        "doi_hint": argon.get("doi") or argon.get("doi_pending"),
        "datasets_root": str(datasets_root()),
    }
    (target / "MANIFESTE.json").write_text(
        json.dumps(manifeste, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return {"format": "fruitfly.rocrate.bundle.v1", "crate": meta, "path": str(target), **manifeste}
