"""API publique science — façade modulaire."""

from __future__ import annotations

from fruitfly_science.adapters import get_adapters, reset_adapters, save_adapters
from fruitfly_science.concordance import rapport_flywire, table_concordance
from fruitfly_science.export import (
    export_figure_svg,
    export_methods,
    export_spikes_csv,
    get_run,
    list_runs,
)
from fruitfly_science.ingest import reset_circuit, upload_edges_csv
from fruitfly_science.meta import atlas_claim_status
from fruitfly_science.organisms import registre_organismes
from fruitfly_science.stimulate import (
    batch_stimulate,
    build_graph,
    compare_runs,
    dose_response,
    replay_stimulate,
    stimulate,
)
from fruitfly_science.validation_imagerie import rapport_validation
from fruitfly_science.store import (
    atlas,
    file_hash,
    load_circuit,
    motifs,
    selectionner_motif,
)
from fruitfly_science.jobs_async import soumettre_dose, soumettre_lot, statut_job
from fruitfly_science.passerelles import (
    carte_genetique,
    catalogue_plateformes,
    export_argon_manifest,
    export_clem,
    export_maelstrom,
    export_pipeline,
    export_zenodo_instantane,
    fiche_protocole,
    journal_colonie,
    pont_imagerie,
)
from fruitfly_science.genetics import (
    apply_drivers,
    apply_edit,
    argon_ready,
    catalog as genetics_catalog,
    cross as genetics_cross,
    kepler_scissors,
    phenotype as genetics_phenotype,
)
from fruitfly_science.validate import validate_suite


def concordance() -> dict:
    return table_concordance()


def flywire_controle() -> dict:
    return rapport_flywire(load_circuit())


def figure(run_id: str, dose: dict | None = None) -> str | None:
    return export_figure_svg(run_id, dose)


def plateformes() -> dict:
    return catalogue_plateformes()


def atlas_status() -> dict:
    return atlas_claim_status()


def validation_imagerie(body: dict) -> dict:
    return rapport_validation(body)


def passerelle_maelstrom(run_id: str | None = None, carte: dict | None = None) -> dict:
    return export_maelstrom(run_id, carte)


def passerelle_argon(run_id: str | None = None) -> dict:
    return export_argon_manifest(run_id)


def zenodo_meta() -> dict:
    return export_zenodo_instantane()


def organisms_registry() -> dict:
    return registre_organismes()


def genetics_catalog_api() -> dict:
    return genetics_catalog()


def genetics_cross_api(body: dict) -> dict:
    return genetics_cross(body)


def genetics_edit_api(body: dict) -> dict:
    return apply_edit(body)


def genetics_kepler_api(body: dict) -> dict:
    return kepler_scissors(body)


def genetics_phenotype_api(body: dict) -> dict:
    gt = body.get("genotype") or {}
    drivers = body.get("drivers") or {}
    return {
        "format": "fruitfly.genetics.phenotype.v1",
        "genotype": gt,
        "drivers": drivers,
        "phenotype": genetics_phenotype(gt, drivers),
    }


def genetics_drivers_api(body: dict) -> dict:
    return apply_drivers(body)


def genetics_argon_ready_api(body: dict) -> dict:
    return argon_ready(body)


def argon_doi_api(body: dict | None = None) -> dict:
    from fruitfly_science.doi_argon import argon_with_doi, publish_bundle

    body = body or {}
    if body.get("publish"):
        return publish_bundle(body.get("run_id"))
    return argon_with_doi(body.get("run_id"), body.get("doi"))


def rocrate_api(body: dict | None = None) -> dict:
    from fruitfly_science.rocrate import build_rocrate

    body = body or {}
    return build_rocrate(body.get("run_id"))


def gpu_sweep_api(body: dict) -> dict:
    from fruitfly_science.gpu_sweeps import sweep_levels

    body = body or {}
    return sweep_levels(
        list(body.get("levels") or [0, 0.25, 0.5, 0.75, 1.0]),
        channel=str(body.get("channel") or "looming"),
        repeats=int(body.get("repeats") or 8),
        seed=int(body.get("seed") or 7),
        use_gpu=bool(body.get("use_gpu", True)),
    )


def bridge_fiji_api(run_id: str | None = None) -> dict:
    from fruitfly_science.bridges_imaging import export_fiji_macro

    return export_fiji_macro(run_id)


def bridge_napari_api(run_id: str | None = None) -> dict:
    from fruitfly_science.bridges_imaging import export_napari_manifest

    return export_napari_manifest(run_id)


def opto_curve_api(body: dict | None = None) -> dict:
    from fruitfly_science.opto import intensity_to_hz, rapport_opto

    body = body or {}
    xs = [i / 20 for i in range(21)]
    max_hz = float(body.get("max_hz") or 80)
    return {
        "format": "fruitfly.opto.curve.v1",
        "curve": [{"intensity": x, "hz": intensity_to_hz(x, max_hz=max_hz)} for x in xs],
        "rapport": rapport_opto(body),
    }


def picsl_sample_api() -> dict:
    from fruitfly_science.bridges_imaging import load_picsl_observation

    return load_picsl_observation()


def echelles_catalog_api() -> dict:
    from fruitfly_science.echelles import catalog_echelles

    return catalog_echelles()


def echelles_resolve_api(body: dict) -> dict:
    from fruitfly_science.echelles import resolve_echelle

    return resolve_echelle(body)


def ovni_lifecycle_catalog_api() -> dict:
    from fruitfly_science.ovni_lifecycle import catalog

    return catalog()


def ovni_birth_api(body: dict) -> dict:
    from fruitfly_science.ovni_lifecycle import birth

    return birth(body)


def ovni_advance_api(body: dict) -> dict:
    from fruitfly_science.ovni_lifecycle import advance

    return advance(body.get("state"), body)


def voix_aide_api() -> dict:
    from fruitfly_science.voix import aide

    return aide()


def voix_fiche_api(body: dict | None = None) -> dict:
    from fruitfly_science.voix import fiche_chimere

    return fiche_chimere(body)


def voix_lexique_api(body: dict | None = None) -> dict:
    from fruitfly_science.voix import lexique

    return lexique(body)


def voix_gabarit_api(body: dict | None = None) -> dict:
    from fruitfly_science.voix import gabarit_phrases

    body = body or {}
    return gabarit_phrases(body.get("fiche") or body, body.get("run_id"))


def voix_dialoguer_api(body: dict | None = None) -> dict:
    from fruitfly_science.voix import dialoguer

    return dialoguer(body)


def voix_verify_api(body: dict | None = None) -> dict:
    from fruitfly_science.voix import verify_api

    return verify_api(body)


def voix_stimulate_api(body: dict | None = None) -> dict:
    from fruitfly_science.voix import stimulate_voix

    return stimulate_voix(body)


def voix_replay_api(body: dict | None = None) -> dict:
    from fruitfly_science.voix import replay_voix

    return replay_voix(body)


def voix_journal_api(limit: int = 30) -> dict:
    from fruitfly_science.voix import journal_list

    return journal_list(limit)


def voix_journal_md_api(limit: int = 50) -> str:
    from fruitfly_science.voix import journal_export_md

    return journal_export_md(limit)


__all__ = [
    "organisms_registry",
    "atlas_status",
    "validation_imagerie",
    "replay_stimulate",
    "passerelle_maelstrom",
    "passerelle_argon",
    "zenodo_meta",
    "atlas",
    "batch_stimulate",
    "build_graph",
    "compare_runs",
    "concordance",
    "dose_response",
    "export_methods",
    "export_spikes_csv",
    "file_hash",
    "figure",
    "flywire_controle",
    "get_adapters",
    "get_run",
    "list_runs",
    "load_circuit",
    "motifs",
    "plateformes",
    "pont_imagerie",
    "export_clem",
    "export_pipeline",
    "carte_genetique",
    "journal_colonie",
    "fiche_protocole",
    "reset_adapters",
    "reset_circuit",
    "save_adapters",
    "selectionner_motif",
    "soumettre_dose",
    "soumettre_lot",
    "statut_job",
    "stimulate",
    "replay_stimulate",
    "upload_edges_csv",
    "validate_suite",
    "genetics_catalog_api",
    "genetics_cross_api",
    "genetics_edit_api",
    "genetics_kepler_api",
    "genetics_phenotype_api",
    "genetics_drivers_api",
    "genetics_argon_ready_api",
    "argon_doi_api",
    "rocrate_api",
    "gpu_sweep_api",
    "bridge_fiji_api",
    "bridge_napari_api",
    "opto_curve_api",
    "picsl_sample_api",
    "echelles_catalog_api",
    "echelles_resolve_api",
    "ovni_lifecycle_catalog_api",
    "ovni_birth_api",
    "ovni_advance_api",
    "voix_aide_api",
    "voix_fiche_api",
    "voix_lexique_api",
    "voix_gabarit_api",
    "voix_dialoguer_api",
    "voix_verify_api",
    "voix_stimulate_api",
    "voix_replay_api",
    "voix_journal_api",
    "voix_journal_md_api",
]
