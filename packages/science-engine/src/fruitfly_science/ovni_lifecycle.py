"""Cycle de vie OVNI — œuf → larve → nymphe → adulte → sénescence → mort."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fruitfly_science.genetics import phenotype as genetics_phenotype

# Durées pédagogiques en « ticks OVNI » (pas wall-clock biologiques)
STAGES: list[dict] = [
    {
        "id": "egg",
        "nom": "Œuf",
        "ticks": 4,
        "mesh_scale": 0.22,
        "mobility": 0.0,
        "lif_gain": 0.15,
        "form": "egg",
    },
    {
        "id": "larva",
        "nom": "Larve",
        "ticks": 12,
        "mesh_scale": 0.55,
        "mobility": 0.45,
        "lif_gain": 0.55,
        "form": "larva",
    },
    {
        "id": "pupa",
        "nom": "Nymphe",
        "ticks": 10,
        "mesh_scale": 0.7,
        "mobility": 0.0,
        "lif_gain": 0.25,
        "form": "pupa",
    },
    {
        "id": "adult",
        "nom": "Adulte",
        "ticks": 40,
        "mesh_scale": 1.0,
        "mobility": 1.0,
        "lif_gain": 1.0,
        "form": "adult",
    },
    {
        "id": "senescence",
        "nom": "Sénescence",
        "ticks": 14,
        "mesh_scale": 0.95,
        "mobility": 0.55,
        "lif_gain": 0.7,
        "form": "adult",
    },
    {
        "id": "dead",
        "nom": "Mort",
        "ticks": 0,
        "mesh_scale": 0.9,
        "mobility": 0.0,
        "lif_gain": 0.0,
        "form": "dead",
    },
]


def _stage_index(stage_id: str) -> int:
    for i, s in enumerate(STAGES):
        if s["id"] == stage_id:
            return i
    return 0


def birth(body: dict | None = None) -> dict:
    """Naissance d’un OVNI avec génotype / drivers choisis."""
    body = body or {}
    gt = body.get("genotype") or {}
    drivers = body.get("drivers") or {}
    ph = genetics_phenotype(gt, drivers)
    ovni_id = str(uuid.uuid4())
    # Argon scale module morphologie dès l’œuf
    argon = float(ph.get("argon_scale") or 1.0)
    return {
        "format": "fruitfly.ovni.birth.v1",
        "ovni_id": ovni_id,
        "born_at": datetime.now(timezone.utc).isoformat(),
        "genotype": gt,
        "drivers": drivers,
        "phenotype": ph,
        "stage": "egg",
        "stage_tick": 0,
        "age_ticks": 0,
        "alive": True,
        "energy": 0.85,
        "mesh_scale": STAGES[0]["mesh_scale"] * argon,
        "mobility": STAGES[0]["mobility"],
        "lif_gain": STAGES[0]["lif_gain"],
        "form": STAGES[0]["form"],
        "echelle": body.get("echelle") or "essai",
        "claim": (
            "Cycle pédagogique — durées non calibrées PiCsL. "
            "Remplace une part des protocoles d’hypothèse, pas toute la biologie wet-lab."
        ),
    }


def advance(state: dict | None = None, body: dict | None = None) -> dict:
    """Avance d’un tick de développement (ou force un stade)."""
    body = body or {}
    st = dict(state or birth(body))
    if body.get("force_stage"):
        sid = str(body["force_stage"])
        idx = _stage_index(sid)
        meta = STAGES[idx]
        st["stage"] = meta["id"]
        st["stage_tick"] = 0
        st["form"] = meta["form"]
        st["mobility"] = meta["mobility"]
        st["lif_gain"] = meta["lif_gain"]
        argon = float((st.get("phenotype") or {}).get("argon_scale") or 1)
        st["mesh_scale"] = meta["mesh_scale"] * argon
        if meta["id"] == "dead":
            st["alive"] = False
            st["energy"] = 0
        return {**st, "format": "fruitfly.ovni.lifecycle.v1"}

    if not st.get("alive") or st.get("stage") == "dead":
        st["alive"] = False
        st["stage"] = "dead"
        st["form"] = "dead"
        st["mobility"] = 0
        st["lif_gain"] = 0
        return {**st, "format": "fruitfly.ovni.lifecycle.v1"}

    st["age_ticks"] = int(st.get("age_ticks") or 0) + 1
    st["stage_tick"] = int(st.get("stage_tick") or 0) + 1
    idx = _stage_index(str(st.get("stage") or "egg"))
    meta = STAGES[idx]
    # métabolisme : baisse lente d’énergie hors alimentation (appelant OVNI)
    energy = float(st.get("energy") or 0.5)
    energy -= 0.008 * (1.2 if meta["id"] == "senescence" else 1.0)
    st["energy"] = max(0.0, min(1.0, energy))

    if meta["ticks"] > 0 and st["stage_tick"] >= meta["ticks"]:
        if idx + 1 < len(STAGES):
            nxt = STAGES[idx + 1]
            st["stage"] = nxt["id"]
            st["stage_tick"] = 0
            st["form"] = nxt["form"]
            st["mobility"] = nxt["mobility"]
            st["lif_gain"] = nxt["lif_gain"]
            argon = float((st.get("phenotype") or {}).get("argon_scale") or 1)
            st["mesh_scale"] = nxt["mesh_scale"] * argon
            if nxt["id"] == "dead":
                st["alive"] = False
                st["energy"] = 0
        else:
            st["alive"] = False
            st["stage"] = "dead"

    if st["energy"] <= 0.01 and st.get("stage") not in ("egg", "pupa"):
        st["alive"] = False
        st["stage"] = "dead"
        st["form"] = "dead"
        st["mobility"] = 0
        st["lif_gain"] = 0

    st["format"] = "fruitfly.ovni.lifecycle.v1"
    st["stages_catalog"] = [{"id": s["id"], "nom": s["nom"], "ticks": s["ticks"]} for s in STAGES]
    return st


def catalog() -> dict:
    return {
        "format": "fruitfly.ovni.lifecycle.catalog.v1",
        "stages": STAGES,
        "note": "Durées en ticks OVNI — calibrer avant claim publication.",
    }
