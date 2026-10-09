"""Perturbations labo : silence, ablation, recâblage, opto/thermo virtuelles."""

from __future__ import annotations

from fruitfly_science.lif import Graph


def appliquer_silence(graph: Graph, silence: set[str]) -> Graph:
    """Ablation fonctionnelle : retire arêtes depuis/vers neurones silencés."""
    if not silence:
        return graph
    edges = [
        (pre, post, w)
        for pre, post, w in graph.edges
        if pre not in silence and post not in silence
    ]
    ids = [i for i in graph.neuron_ids if i not in silence]
    # garder ids pour rates ; spikes forcés vides ailleurs
    return Graph(neuron_ids=graph.neuron_ids, edges=edges)


def recabler(
    graph: Graph,
    regenerer: list[dict] | None,
) -> Graph:
    """Rewire : liste {pre, post, weight, sign} remplace ou ajoute des arêtes."""
    if not regenerer:
        return graph
    edges = list(graph.edges)
    for r in regenerer:
        pre, post = r["pre"], r["post"]
        w = float(r.get("weight", 1.0)) * float(r.get("sign", 1))
        edges = [(a, b, c) for a, b, c in edges if not (a == pre and b == post)]
        edges.append((pre, post, w))
    return Graph(neuron_ids=graph.neuron_ids, edges=edges)


def drive_classe(
    circuit: dict,
    classe: str,
    hz: float,
    duration_ms: float,
    rng,
    poisson_train,
) -> dict[str, list[float]]:
    """Optogénétique / thermogénétique virtuelle : drive Hz sur une classe."""
    out: dict[str, list[float]] = {}
    for n in circuit.get("neurons") or []:
        if n.get("class") == classe or classe in (n.get("tags") or []):
            out[n["id"]] = poisson_train(float(hz), duration_ms, rng)
    return out


def rapport_perturbations(body: dict, circuit: dict) -> dict:
    silence = sorted(set(body.get("silence") or []))
    rewire = body.get("rewire") or []
    opto = body.get("opto") or body.get("drive_classe") or {}
    return {
        "silence": silence,
        "n_silence": len(silence),
        "recablage": rewire,
        "n_recablage": len(rewire),
        "opto_thermo": opto,
        "neurones_circuit": len(circuit.get("neurons") or []),
        "note": "Rapport systématique des perturbations appliquées à l'essai.",
    }
