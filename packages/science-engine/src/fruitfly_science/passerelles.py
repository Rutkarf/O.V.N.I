"""Passerelles IBDML / PiCsL — exports pour travailler en commun avec les plateformes."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from fruitfly_science.export import get_run
from fruitfly_science.paths import datasets_root, motif_id_actif
from fruitfly_science.store import ENGINE_VERSION, atlas, file_hash, load_circuit
from fruitfly_science.paths import circuit_factory_path


def catalogue_plateformes() -> dict:
    path = datasets_root() / "plateformes_ibdml.json"
    if not path.exists():
        return {"version": "0", "categories": []}
    return json.loads(path.read_text(encoding="utf-8"))


def pont_imagerie(run_id: str | None = None) -> dict:
    """Métadonnées pour PiCsL / Fiji / confocal — lier essai ↔ session d’imagerie."""
    circuit = load_circuit()
    a = atlas()
    essai = get_run(run_id) if run_id else None
    return {
        "format": "fruitfly.pont_imagerie.v1",
        "cree_at": datetime.now(timezone.utc).isoformat(),
        "plateforme_cible": "PiCsL / France-BioImaging",
        "logiciels": ["Fiji", "ImageJ", "ZEN", "LAS X", "Imaris"],
        "motif_id": motif_id_actif(),
        "circuit_id": circuit.get("id"),
        "empreinte_jeu": a.get("dataset_hash"),
        "moteur": ENGINE_VERSION,
        "essai": (essai or {}).get("run_card") if essai else None,
        "conseil": (
            "Coller ces champs dans les métadonnées d’acquisition (nom de série, notes). "
            "Ne pas confondre latence logicielle et temps biologique."
        ),
    }


def export_clem(run_id: str | None = None) -> dict:
    """Fiche CLEM (corrélation lumière / électron) pour le service EM IBDML."""
    base = pont_imagerie(run_id)
    return {
        **base,
        "format": "fruitfly.clem.v1",
        "plateforme_cible": "Microscopie électronique IBDML",
        "instruments": [
            "FEI Tecnai G2 200 kV",
            "FEI Morgagni 120 kV",
            "FEI Teneo VS (Serial Block-Face)",
            "Leica EMPact 2 / AFS 2 / AMW / UC7",
        ],
        "techniques": [
            "coloration négative",
            "inclusion plastique",
            "immunomarquage",
            "cryo-ultramicrotomie",
            "tomographie électronique",
            "STEM",
            "Serial Block-Face",
            "CLEM",
        ],
        "etapes": [
            "1. Imagerie optique PiCsL avec métadonnées pont_imagerie",
            "2. Préparation EM (congélation haute pression / substitution)",
            "3. Corrélation ROI / neurones motif (concordance MaleCNS)",
            "4. Archiver empreinte circuit + graine dans le registre labo",
        ],
    }


def export_pipeline(run_id: str | None = None) -> dict:
    """Paquet pour plateforme bioinfo / cluster."""
    circuit = load_circuit()
    a = atlas()
    essai = get_run(run_id) if run_id else None
    return {
        "format": "fruitfly.pipeline.v1",
        "cree_at": datetime.now(timezone.utc).isoformat(),
        "cible": "Plateforme bioinformatique IBDML / cluster",
        "motif_id": motif_id_actif(),
        "circuit": {
            "id": circuit.get("id"),
            "version": circuit.get("version"),
            "empreinte": file_hash(circuit_factory_path()),
            "n_neurones": a.get("neuron_count"),
            "n_aretes": a.get("edge_count"),
        },
        "essai": (essai or {}).get("run_card") if essai else None,
        "fichiers_suggeres": [
            "spikes.csv",
            "methodes.md",
            "figure.svg",
            "MANIFESTE.json (instantane_doi)",
        ],
        "moteur": ENGINE_VERSION,
    }


def carte_genetique(body: dict | None = None) -> dict:
    """Carte lignée / driver ↔ neurones motif (GAL4, CRISPR/Cas9, CRISPR 2 / Cas12a…)."""
    body = body or {}
    circuit = load_circuit()
    outil = str(body.get("outil") or "CRISPR/Cas9")
    # CRISPR 2 = génération d’éditeurs (Cas12a / base / prime) — couche génétique, pas preuve connectome
    CRISPR2 = outil.upper().replace(" ", "") in (
        "CRISPR2",
        "CRISPR2.0",
        "CAS12A",
        "CRISPR/CAS12A",
        "BASE_EDITOR",
        "PRIME_EDITOR",
    ) or "cas12" in outil.lower() or "crispr 2" in outil.lower() or "crispr2" in outil.lower()
    return {
        "format": "fruitfly.carte_genetique.v1",
        "motif_id": motif_id_actif(),
        "circuit_id": circuit.get("id"),
        "ligne": body.get("ligne") or body.get("stock") or "",
        "driver": body.get("driver") or "GAL4/UAS",
        "outil": outil,
        "famille": "CRISPR2" if CRISPR2 else ("CRISPR/Cas9" if "crispr" in outil.lower() else "binaire"),
        "cibles_neurones": body.get("neurones") or [],
        "validation_imagerie": {
            "statut": body.get("validation_imagerie") or "a_faire",
            "plateforme": body.get("plateforme_imagerie") or "PiCsL",
            "note": "Mapper lignée → neurones motif seulement après validation fluorescence / comportement.",
        },
        "perturbation_fruitfly": {
            "silence": body.get("silence") or [],
            "opto": body.get("opto") or {},
            "equivalent_crispr2": (
                "knock-out / knock-down Cas12a → silence[] ou baisse poids synaptique"
                if CRISPR2
                else None
            ),
        },
        "stocks": ["Bloomington", "TRiP"],
        "note": (
            "CRISPR 2 (Cas12a / éditeurs) est pertinent ici comme couche génétique "
            "hypothétique liée aux perturbations LIF — jamais comme preuve de câblage."
        ),
    }


def journal_colonie(body: dict | None = None) -> dict:
    body = body or {}
    return {
        "format": "fruitfly.journal_colonie.v1",
        "cree_at": datetime.now(timezone.utc).isoformat(),
        "temperature_c": body.get("temperature_c"),
        "humidite_pct": body.get("humidite_pct"),
        "cycle_jour_nuit": body.get("cycle_jour_nuit") or "12:12",
        "notes": body.get("notes") or "",
        "motif_id": motif_id_actif(),
        "session_id": body.get("session_id"),
    }


def export_maelstrom(run_id: str | None = None, carte: dict | None = None) -> dict:
    """Bundle omics / génomique fonctionnelle (CRISPR 2, différentiel, enrichissement)."""
    base = export_pipeline(run_id)
    cg = carte or {}
    return {
        **base,
        "format": "fruitfly.maelstrom.v1",
        "cible": "Maelstrom — pipelines omics IBDML",
        "entrees": {
            "carte_genetique": cg or None,
            "motif_neurones": (load_circuit().get("neurons") or [])[:50],
            "crispr2": cg.get("famille") == "CRISPR2" if cg else None,
        },
        "pipeline_suggere": [
            "normalisation counts / TPM",
            "DEseq2 ou edgeR (design lignée × perturbation)",
            "enrichissement GO / KEGG",
            "croisement gènes cibles CRISPR ↔ neurones motif",
        ],
        "fichiers": ["counts_matrix.csv", "sample_sheet.tsv", "carte_genetique.json"],
    }


def export_argon_manifest(run_id: str | None = None) -> dict:
    """Manifeste reproductibilité (conteneur / snapshot moteur + graine + empreintes)."""
    import os

    circuit = load_circuit()
    a = atlas()
    essai = get_run(run_id) if run_id else None
    card = (essai or {}).get("run_card") or {}
    doi = os.environ.get("FRUITFLY_DOI") or os.environ.get("ARGON_DOI")
    return {
        "format": "fruitfly.argon.v1",
        "cible": "Argon — environnement reproductible",
        "doi": doi,
        "doi_pending": None if doi else "assign via /api/science/argon/doi or ZENODO_TOKEN",
        "moteur": {
            "name": "fruitfly-lif",
            "version": ENGINE_VERSION,
            "python": ">=3.11",
        },
        "empreintes": {
            "circuit": file_hash(circuit_factory_path()),
            "adapters": card.get("adapters_hash"),
            "dataset": a.get("dataset_hash"),
        },
        "claim_level": (circuit.get("provenance") or {}).get("claim_level"),
        "run": card or None,
        "replay": {
            "endpoint": "/api/science/replay",
            "body": {"run_id": run_id} if run_id else None,
        },
        "container_hint": {
            "image": "fruitfly/science-engine:latest",
            "digest_hint": "pin by digest in publication",
            "env": ["FRUITFLY_DATA=/data", "FRUITFLY_SEED=" + str(card.get("seed", ""))],
        },
        "rocrate": "/api/science/rocrate",
    }


def export_zenodo_instantane() -> dict:
    """Métadonnées dépôt Zenodo (script scripts/deposer_zenodo.py)."""
    return {
        "format": "fruitfly.zenodo.v1",
        "script": "scripts/deposer_zenodo.py",
        "env": ["ZENODO_TOKEN", "ZENODO_SANDBOX=1"],
        "dossier_local": "dist/instantane_publication",
        "tgml": "https://www.france-genomique.org/plateformes-et-equipements/plateforme-sequencage-tgml-marseille/",
        "note": "Joindre MANIFESTE.json + circuit + adapters + golden tests.",
    }


def fiche_protocole(outil_id: str, run_id: str | None = None) -> dict:
    cat = catalogue_plateformes()
    outil = None
    for cat_block in cat.get("categories") or []:
        for o in cat_block.get("outils") or []:
            if o.get("id") == outil_id:
                outil = o
                break
    return {
        "format": "fruitfly.fiche_protocole.v1",
        "outil": outil,
        "pont": pont_imagerie(run_id),
        "rappel_charte": "Connectome + intégration-décharge = preuve ; imagerie = validation expérimentale.",
    }
