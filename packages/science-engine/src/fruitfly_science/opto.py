"""Optogénétique virtuelle calibrée — intensité lumineuse → fréquence de spike."""

from __future__ import annotations

import math
from typing import Callable


# Courbe pédagogique calibrée (ChR2-like) : saturante, pas une preuve biophysique.
# I_half ~ 0.35 (u.a.), max_hz typique 80 Hz pour UAS-ChR2 × elav.
def intensity_to_hz(
    intensity: float,
    *,
    max_hz: float = 80.0,
    i_half: float = 0.35,
    hill: float = 2.2,
    baseline_hz: float = 0.0,
) -> float:
    """Mappe intensité [0,1] → Hz de drive (Hill saturante)."""
    x = max(0.0, min(1.0, float(intensity)))
    if x <= 0:
        return float(baseline_hz)
    num = x**hill
    den = (i_half**hill) + num
    return float(baseline_hz + max_hz * (num / den))


def apply_opto_calibrated(
    circuit: dict,
    body: dict,
    duration_ms: float,
    rng,
    poisson_train: Callable,
) -> dict[str, list[float]]:
    """
    body.opto_calibrated = {
      gal4, uas, intensity (0-1), targets?: [neuron_ids],
      classe?: str, max_hz?, wavelength_nm?
    }
    """
    cfg = body.get("opto_calibrated") or body.get("opto_calib") or {}
    if not cfg:
        return {}
    intensity = float(cfg.get("intensity", cfg.get("light", 0)))
    max_hz = float(cfg.get("max_hz", 80))
    hz = intensity_to_hz(intensity, max_hz=max_hz)
    if hz <= 0:
        return {}

    targets = list(cfg.get("targets") or [])
    classe = str(cfg.get("classe") or cfg.get("class") or "")
    if not targets and classe:
        for n in circuit.get("neurons") or []:
            if str(n.get("class") or "") == classe or classe in (n.get("tags") or []):
                targets.append(n["id"])
    if not targets:
        # défaut pédagogique : voies menace
        for n in circuit.get("neurons") or []:
            if n.get("id") in ("LPLC2", "LC4", "DNp01_L", "DNp01_R"):
                targets.append(n["id"])

    out: dict[str, list[float]] = {}
    for nid in targets:
        out[nid] = poisson_train(hz, duration_ms, rng)
    return out


def rapport_opto(cfg: dict | None) -> dict:
    cfg = cfg or {}
    intensity = float(cfg.get("intensity", cfg.get("light", 0)) or 0)
    max_hz = float(cfg.get("max_hz", 80))
    hz = intensity_to_hz(intensity, max_hz=max_hz)
    return {
        "format": "fruitfly.opto.calibrated.v1",
        "intensity": intensity,
        "hz_effectif": round(hz, 3),
        "gal4": cfg.get("gal4"),
        "uas": cfg.get("uas") or "UAS-ChR2",
        "wavelength_nm": cfg.get("wavelength_nm", 470),
        "note": "Courbe Hill pédagogique — calibrer sur données PiCsL avant claim optogénétique.",
        "equation": "hz = max_hz * I^n / (I_half^n + I^n)",
    }
