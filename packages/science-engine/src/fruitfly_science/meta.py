"""Métadonnées atlas / claim level."""

from __future__ import annotations

from fruitfly_science.paths import motif_id_actif
from fruitfly_science.store import ENGINE_VERSION, atlas, file_hash, load_circuit
from fruitfly_science.paths import circuit_factory_path


def atlas_claim_status() -> dict:
    circuit = load_circuit()
    neurons = circuit.get("neurons") or []
    placeholders = 0
    resolved = 0
    for n in neurons:
        blob = f"{n.get('malecns_body_id', '')}{n.get('flywire_root_id', '')}"
        if "PLACEHOLDER" in blob or not blob.strip():
            placeholders += 1
        else:
            resolved += 1
    prov = circuit.get("provenance") or {}
    claim = prov.get("claim_level") or "literature_reconstruction"
    return {
        "format": "fruitfly.atlas_status.v1",
        "motif_id": motif_id_actif(),
        "circuit_id": circuit.get("id"),
        "engine_version": ENGINE_VERSION,
        "dataset_hash": atlas().get("dataset_hash"),
        "circuit_file_hash": file_hash(circuit_factory_path()),
        "neuron_count": len(neurons),
        "claim_level": claim,
        "placeholders": placeholders,
        "body_ids_resolus": resolved,
        "pret_publication_connectome": placeholders == 0 and claim.startswith("export_"),
        "import": "scripts/importer_roi_connectome.py",
    }
