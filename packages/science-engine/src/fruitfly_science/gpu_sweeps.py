"""Balayages dose-réponse accélérés (NumPy vectorisé ; GPU optionnel via CuPy)."""

from __future__ import annotations

from typing import Any


def _xp():
    try:
        import cupy as cp  # type: ignore

        return cp, "cupy"
    except Exception:  # noqa: BLE001
        import numpy as np

        return np, "numpy"


def sweep_levels(
    levels: list[float],
    *,
    channel: str = "looming",
    repeats: int = 8,
    seed: int = 7,
    use_gpu: bool = True,
) -> dict[str, Any]:
    """
    Lance dose_response classique ; le backend GPU accélère les stats agrégées
    (proportions / IC) — le LIF reste CPU pour bit-exactitude preuve.
    """
    from fruitfly_science.stimulate import dose_response

    backend = "cpu"
    xp = None
    if use_gpu:
        xp, backend = _xp()

    result = dose_response(
        {
            "channel": channel,
            "levels": levels,
            "repeats": repeats,
            "seed": seed,
        }
    )
    # Agrégation vectorisée des taux de fuite
    curve = result.get("curve") or result.get("points") or []
    if not curve and isinstance(result.get("results"), list):
        curve = result["results"]

    escapes = []
    ns = []
    for pt in curve:
        if isinstance(pt, dict):
            escapes.append(float(pt.get("p_escape") or pt.get("escape_rate") or 0))
            ns.append(float(pt.get("n") or repeats))
    if xp is not None and escapes:
        arr = xp.asarray(escapes, dtype=float)
        n_arr = xp.asarray(ns, dtype=float)
        # IC Wald approximatif
        se = xp.sqrt(xp.maximum(arr * (1 - arr) / xp.maximum(n_arr, 1), 0))
        lo = arr - 1.96 * se
        hi = arr + 1.96 * se
        if hasattr(lo, "get"):
            lo, hi, arr = lo.get(), hi.get(), arr.get()
        result["gpu_agg"] = {
            "backend": backend,
            "p_escape": [float(x) for x in arr],
            "ci95_lo": [float(x) for x in lo],
            "ci95_hi": [float(x) for x in hi],
            "note": "LIF CPU bit-exact ; agrégation NumPy/CuPy hors preuve spike-à-spike.",
        }
    else:
        result["gpu_agg"] = {"backend": "none", "note": "pas de courbe à agréger"}
    result["format"] = result.get("format") or "fruitfly.gpu_sweep.v1"
    return result
