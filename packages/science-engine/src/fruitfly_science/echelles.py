"""Échelles Argon (fin) ↔ Maelstrom (vaste) — continuum de mesure fruitfly."""

from __future__ import annotations

from fruitfly_science.passerelles import export_argon_manifest, export_maelstrom
from fruitfly_science.store import ENGINE_VERSION


# Résolutions opératoires (pédagogie + protocole)
ARGON_DT_MS = 0.05  # plus fin que le défaut LIF 0.1
MAELSTROM_COHORT_MAX = 10_000


def catalog_echelles() -> dict:
    return {
        "format": "fruitfly.echelles.v1",
        "engine_version": ENGINE_VERSION,
        "argon": {
            "nom": "Argon",
            "role": "plus petite unité opératoire (résolution / empreinte)",
            "dt_ms_min": ARGON_DT_MS,
            "morph_scale_key": "argon_scale",
            "exports": ["/api/science/passerelles/argon", "/api/science/argon/doi"],
            "note": (
                "Travailler à l’Argon près = même graine, même dt, même empreinte circuit — "
                "replay bit-exact. Pas l’atome chimique."
            ),
        },
        "maelstrom": {
            "nom": "Maelstrom",
            "role": "plus grande unité opératoire (population / omics / cohortes)",
            "cohort_max": MAELSTROM_COHORT_MAX,
            "exports": ["/api/science/passerelles/maelstrom", "/api/science/gpu-sweep"],
            "note": (
                "Travailler au Maelstrom = essaims, balayages, carte CRISPR/omics. "
                "Pas une unité SI cosmologique."
            ),
        },
        "continuum": [
            {"niveau": 0, "nom": "argon_tick", "description": "1 pas LIF à dt_ms minimal"},
            {"niveau": 1, "nom": "essai", "description": "1 run_card (500 ms typique)"},
            {"niveau": 2, "nom": "individu_ovni", "description": "1 cycle de vie OVNI"},
            {"niveau": 3, "nom": "cohorte", "description": "essaim 1–5 (UI) à N Maelstrom"},
            {"niveau": 4, "nom": "maelstrom_pop", "description": "population + omics export"},
        ],
    }


def resolve_echelle(body: dict | None = None) -> dict:
    """Applique une échelle demandée → paramètres stimulate / cohorte."""
    body = body or {}
    mode = str(body.get("echelle") or body.get("scale") or "essai").lower()
    cat = catalog_echelles()
    if mode in ("argon", "argon_tick", "fin"):
        return {
            "format": "fruitfly.echelle.resolve.v1",
            "echelle": "argon",
            "param_overrides": {"dt_ms": ARGON_DT_MS},
            "fly_cohort": 1,
            "manifest": export_argon_manifest(body.get("run_id")),
            "meta": cat["argon"],
        }
    if mode in ("maelstrom", "maelstrom_pop", "vaste", "population"):
        n = min(MAELSTROM_COHORT_MAX, max(8, int(body.get("n") or body.get("cohort") or 64)))
        return {
            "format": "fruitfly.echelle.resolve.v1",
            "echelle": "maelstrom",
            "param_overrides": {},
            "fly_cohort": min(5, n),  # UI cap
            "n_population": n,
            "gpu_sweep_hint": True,
            "manifest": export_maelstrom(body.get("run_id")),
            "meta": cat["maelstrom"],
        }
    return {
        "format": "fruitfly.echelle.resolve.v1",
        "echelle": "essai",
        "param_overrides": {},
        "fly_cohort": int(body.get("fly_cohort") or 1),
        "meta": {"note": "échelle intermédiaire (essai unique)"},
    }
