"""Interface modèle neuronal — LIF par défaut ; multi-compartiment optionnel hors chemin preuve GPU."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from fruitfly_science.lif import Graph, LifParams, run_lif


class ModeleNeurone(Protocol):
    """Contrat pluggable (intégration-décharge défaut ; conductance future hors preuve)."""

    def simuler(
        self,
        graphe: Graph,
        entrees: dict[str, list[float]],
        params: LifParams,
        *,
        bruit_synaptique: float = 0.0,
        plasticite_courte: bool = False,
        rng_seed: int = 0,
    ) -> dict[str, list[float]]: ...


@dataclass
class ModeleLif:
    """Intégration-décharge mono-compartiment — seul modèle autorisé pour la preuve."""

    nom: str = "lif_mono"

    def simuler(
        self,
        graphe: Graph,
        entrees: dict[str, list[float]],
        params: LifParams,
        *,
        bruit_synaptique: float = 0.0,
        plasticite_courte: bool = False,
        rng_seed: int = 0,
    ) -> dict[str, list[float]]:
        if bruit_synaptique > 0 or plasticite_courte:
            import random

            rng = random.Random(rng_seed)
            p = LifParams(**{**params.__dict__})
            if bruit_synaptique > 0:
                p.syn_strength = params.syn_strength * (
                    1.0 + rng.uniform(-bruit_synaptique, bruit_synaptique)
                )
            if plasticite_courte:
                p.syn_tau_ms = params.syn_tau_ms * (0.85 + 0.3 * rng.random())
            return run_lif(graphe, entrees, p)
        return run_lif(graphe, entrees, params)


def choisir_modele(nom: str = "lif_mono") -> ModeleNeurone:
    if nom in ("lif_mono", "lif", "LIF", ""):
        return ModeleLif()
    raise ValueError(f"modèle inconnu ou hors preuve : {nom} (utiliser lif_mono)")
