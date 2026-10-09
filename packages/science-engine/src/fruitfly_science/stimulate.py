"""Stimulation, lots, dose-réponse, comparaison."""

from __future__ import annotations

import json
import random
import uuid
from dataclasses import asdict
from datetime import datetime, timezone

from fruitfly_science.environnement import modulateurs
from fruitfly_science.lif import Graph, LifParams, decode_action, poisson_train
from fruitfly_science.modele_neurone import choisir_modele
from fruitfly_science.paths import motif_id_actif
from fruitfly_science.perturbations import (
    appliquer_silence,
    drive_classe,
    rapport_perturbations,
    recabler,
)
from fruitfly_science.stats import effet_taille_fuite, enrichir_courbe
from fruitfly_science.store import (
    ENGINE_VERSION,
    RUNS,
    _adapters_path,
    _circuit_path,
    _load_adapters,
    file_hash,
    load_circuit,
)


def build_graph(circuit: dict) -> Graph:
    ids = [n["id"] for n in circuit["neurons"]]
    edges = [
        (e["pre"], e["post"], float(e["weight"]) * float(e.get("sign", 1)))
        for e in circuit["edges"]
    ]
    return Graph(neuron_ids=ids, edges=edges)


def stimulate(body: dict) -> dict:
    """Un essai scientifique depuis entrées sensorielles ou fréquences neuronales."""
    from fruitfly_science.store import RUNS as runs_dir

    adapters = _load_adapters()
    circuit = load_circuit()
    graph = build_graph(circuit)
    p = adapters["parameters"]
    policies = adapters.get("policies", {})
    overrides = body.get("param_overrides") or {}
    policy_overrides = body.get("policy_overrides") or {}
    policies = {**policies, **policy_overrides}

    params = LifParams(
        dt_ms=float(overrides.get("dt_ms", p["dt_ms"])),
        duration_ms=float(body.get("duration_ms", overrides.get("duration_ms", p["duration_ms"]))),
        v_rest=float(overrides.get("v_rest", p["v_rest"])),
        v_reset=float(overrides.get("v_reset", p["v_reset"])),
        v_thresh=float(overrides.get("v_thresh", p["v_thresh"])),
        tau_ms=float(overrides.get("tau_ms", p["tau_ms"])),
        r_mohm=float(overrides.get("r_mohm", p["r_mohm"])),
        refractory_ms=float(overrides.get("refractory_ms", p["refractory_ms"])),
        syn_tau_ms=float(overrides.get("syn_tau_ms", policies.get("syn_tau_ms", 5.0))),
        syn_strength=float(overrides.get("syn_strength", policies.get("syn_strength", 8.0))),
    )
    seed = int(body.get("seed", 0))
    rng = random.Random(seed)

    sugar = float(body.get("sugar", 0.0))
    bitter = float(body.get("bitter", 0.0))
    looming = float(body.get("looming", 0.0))
    hunger = float(body.get("hunger", 0.0))
    env = modulateurs(body.get("circadian"), body.get("temperature_c"))
    fly_cohort = int(body.get("fly_cohort") or 1)
    shuffle = bool(body.get("shuffle_edges", False))
    silence = set(body.get("silence", []) or [])
    keep_frac = float(policies.get("shuffle_keep_fraction", 0.2))
    bruit = float(body.get("bruit_synaptique", body.get("synaptic_noise", 0.0)))
    plasticite = bool(body.get("plasticite_courte", body.get("stp", False)))
    modele_nom = str(body.get("modele", "lif_mono"))

    if shuffle:
        edges = [(pre, post, w) for pre, post, w in graph.edges if rng.random() < keep_frac]
        graph = Graph(neuron_ids=graph.neuron_ids, edges=edges)

    graph = recabler(graph, body.get("rewire") or body.get("recablage"))
    graph = appliquer_silence(graph, silence)

    inputs_cfg = adapters["inputs"]
    input_spikes: dict[str, list[float]] = {}

    def drive(channel: str, level: float, hunger_mod: float = 0.0, scale: float = 1.0) -> None:
        cfg = inputs_cfg.get(channel) or {"targets": [], "max_rate_hz": 0}
        if not cfg.get("targets"):
            return
        rate = max(0.0, min(1.0, level)) * float(cfg["max_rate_hz"]) * scale * env["activity_factor"]
        if channel == "sugar" and hunger_mod > 0:
            rate *= 1.0 + (float(cfg.get("gain_by_hunger", 1.0)) - 1.0) * hunger_mod
        for nid in cfg["targets"]:
            if nid in silence:
                continue
            train = poisson_train(rate, params.duration_ms, rng)
            input_spikes.setdefault(nid, []).extend(train)

    direct = body.get("neuron_rates") or {}
    for nid, hz in direct.items():
        if nid in silence:
            continue
        train = poisson_train(float(hz), params.duration_ms, rng)
        input_spikes.setdefault(nid, []).extend(train)

    opto = body.get("opto") or body.get("drive_classe") or {}
    if opto:
        classe = str(opto.get("classe") or opto.get("class") or "")
        hz = float(opto.get("hz", 40))
        for nid, train in drive_classe(
            circuit, classe, hz, params.duration_ms, rng, poisson_train
        ).items():
            if nid in silence:
                continue
            input_spikes.setdefault(nid, []).extend(train)

    from fruitfly_science.opto import apply_opto_calibrated, rapport_opto

    opto_cal = body.get("opto_calibrated") or body.get("opto_calib")
    opto_rapport = rapport_opto(opto_cal) if opto_cal else None
    if opto_cal:
        for nid, train in apply_opto_calibrated(
            circuit, body, params.duration_ms, rng, poisson_train
        ).items():
            if nid in silence:
                continue
            input_spikes.setdefault(nid, []).extend(train)

    if not direct and not opto and not opto_cal:
        sugar_eff = sugar
        if policies.get("bitter_suppresses_sugar", True):
            thr = float(policies.get("bitter_gate_threshold", 0.45))
            scale = float(policies.get("bitter_sugar_scale", 0.12))
            if bitter >= thr:
                sugar_eff = sugar * scale
        drive("sugar", sugar_eff, hunger, env["sugar_drive_scale"])
        drive("bitter", bitter, scale=env["bitter_drive_scale"])
        drive("looming", looming, scale=env["looming_drive_scale"])

    for nid in list(input_spikes):
        input_spikes[nid] = sorted(input_spikes[nid])

    modele = choisir_modele(modele_nom)
    spikes = modele.simuler(
        graph,
        input_spikes,
        params,
        bruit_synaptique=bruit,
        plasticite_courte=plasticite,
        rng_seed=seed,
    )
    for nid in silence:
        spikes[nid] = []

    action, decision_ms = decode_action(spikes, adapters)
    duration_s = params.duration_ms / 1000.0
    rates = {
        nid: len(times) / duration_s if duration_s > 0 else 0.0
        for nid, times in spikes.items()
    }

    pert = rapport_perturbations(body, circuit)
    run_id = str(uuid.uuid4())
    run_card = {
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "engine": "fruitfly-lif",
        "engine_version": ENGINE_VERSION,
        "circuit_id": circuit["id"],
        "circuit_version": circuit["version"],
        "motif_id": motif_id_actif(),
        "adapters_version": adapters["version"],
        "dataset_hash": file_hash(_circuit_path()),
        "seed": seed,
        "modele": modele_nom,
        "params": asdict(params),
        "inputs": {
            "sugar": sugar,
            "bitter": bitter,
            "looming": looming,
            "hunger": hunger,
            "neuron_rates": direct,
            "silence": sorted(silence),
            "shuffle_edges": shuffle,
            "rewire": body.get("rewire") or body.get("recablage") or [],
            "opto": opto,
            "opto_calibrated": opto_cal,
            "opto_rapport": opto_rapport,
            "bruit_synaptique": bruit,
            "plasticite_courte": plasticite,
            "param_overrides": overrides,
            "policy_overrides": policy_overrides,
            "circadian": env["circadian"],
            "temperature_c": env["temperature_c"],
            "fly_cohort": fly_cohort,
            "environnement": env,
        },
        "perturbations": pert,
        "policies": policies,
        "adapters_hash": file_hash(_adapters_path()),
        "action": action,
        "decision_ms": decision_ms,
        "provenance": circuit["provenance"],
        "wall_note": "La latence logicielle n’est pas un temps de réaction biologique.",
    }

    payload = {
        "run_card": run_card,
        "spikes": spikes,
        "rates_hz": rates,
        "raster": [
            {"neuron": nid, "spikes_ms": times}
            for nid, times in spikes.items()
            if times
        ],
        "action": action,
        "decision_ms": decision_ms,
        "rapport_perturbations": pert,
    }
    (runs_dir / f"{run_id}.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return payload


def batch_stimulate(body: dict) -> dict:
    trials = body.get("trials") or []
    if not trials:
        raise ValueError("trials[] requis")
    if len(trials) > 500:
        raise ValueError("maximum 500 essais par lot")
    results = []
    for i, trial in enumerate(trials):
        if "seed" not in trial:
            trial = {**trial, "seed": int(body.get("base_seed", 0)) + i}
        r = stimulate(trial)
        results.append(
            {
                "index": i,
                "run_id": r["run_card"]["run_id"],
                "action": r["action"],
                "decision_ms": r["decision_ms"],
                "inputs": r["run_card"]["inputs"],
                "rates_hz": r["rates_hz"],
            }
        )
    counts: dict[str, int] = {}
    for r in results:
        counts[r["action"]] = counts.get(r["action"], 0) + 1
    return {"n": len(results), "action_counts": counts, "trials": results}


def dose_response(body: dict) -> dict:
    channel = body.get("channel", "looming")
    if channel not in ("sugar", "bitter", "looming", "hunger"):
        raise ValueError("canal : sugar|bitter|looming|hunger")
    levels = body.get("levels") or [i / 10 for i in range(11)]
    repeats = int(body.get("repeats", 5))
    base = {
        "sugar": float(body.get("sugar", 0.0)),
        "bitter": float(body.get("bitter", 0.0)),
        "looming": float(body.get("looming", 0.0)),
        "hunger": float(body.get("hunger", 0.0)),
        "silence": body.get("silence") or [],
        "shuffle_edges": bool(body.get("shuffle_edges", False)),
        "param_overrides": body.get("param_overrides") or {},
        "policy_overrides": body.get("policy_overrides") or {},
        "bruit_synaptique": float(body.get("bruit_synaptique", 0.0)),
        "plasticite_courte": bool(body.get("plasticite_courte", False)),
    }
    base_seed = int(body.get("base_seed", 42))
    curve = []
    for li, level in enumerate(levels):
        level = float(level)
        actions = {"ESCAPE": 0, "EAT": 0, "IDLE": 0}
        run_ids = []
        for ri in range(repeats):
            trial = {**base, channel: level, "seed": base_seed + li * 100 + ri}
            r = stimulate(trial)
            actions[r["action"]] = actions.get(r["action"], 0) + 1
            run_ids.append(r["run_card"]["run_id"])
        curve.append(
            {
                "channel": channel,
                "level": level,
                "repeats": repeats,
                "action_counts": actions,
                "p_escape": actions.get("ESCAPE", 0) / repeats,
                "p_eat": actions.get("EAT", 0) / repeats,
                "p_idle": actions.get("IDLE", 0) / repeats,
                "run_ids": run_ids,
            }
        )
    courbe = enrichir_courbe(curve)
    return {
        "channel": channel,
        "repeats": repeats,
        "curve": courbe,
        "effet": effet_taille_fuite(courbe),
        "n_total": repeats * len(levels),
    }


def replay_stimulate(body: dict) -> dict:
    from fruitfly_science.export import get_run

    rid = str(body.get("run_id") or "")
    data = get_run(rid)
    if not data:
        raise ValueError("run introuvable")
    card = data["run_card"]
    inp = dict(card.get("inputs") or {})
    trial = {
        "sugar": inp.get("sugar", 0),
        "bitter": inp.get("bitter", 0),
        "looming": inp.get("looming", 0),
        "hunger": inp.get("hunger", 0),
        "seed": card.get("seed", 0),
        "duration_ms": body.get("duration_ms") or (card.get("params") or {}).get("duration_ms"),
        "silence": inp.get("silence") or [],
        "shuffle_edges": inp.get("shuffle_edges", False),
        "neuron_rates": inp.get("neuron_rates") or {},
        "circadian": inp.get("circadian"),
        "temperature_c": inp.get("temperature_c"),
        "fly_cohort": inp.get("fly_cohort", 1),
        "param_overrides": inp.get("param_overrides") or {},
        "policy_overrides": inp.get("policy_overrides") or {},
    }
    out = stimulate(trial)
    out["replay_of"] = rid
    out["replay_match"] = out["action"] == card.get("action")
    out["replay_decision_delta_ms"] = None
    if out.get("decision_ms") is not None and card.get("decision_ms") is not None:
        out["replay_decision_delta_ms"] = round(
            float(out["decision_ms"]) - float(card["decision_ms"]), 4
        )
    return out


def compare_runs(body: dict) -> dict:
    from fruitfly_science.export import get_run

    ids = body.get("run_ids") or []
    if len(ids) < 2:
        raise ValueError("au moins 2 run_ids requis")
    rows = []
    for rid in ids[:20]:
        data = get_run(rid)
        if not data:
            continue
        card = data["run_card"]
        rows.append(
            {
                "run_id": rid,
                "action": card.get("action"),
                "decision_ms": card.get("decision_ms"),
                "seed": card.get("seed"),
                "inputs": card.get("inputs"),
                "top_rates": sorted(
                    data.get("rates_hz", {}).items(), key=lambda kv: -kv[1]
                )[:5],
            }
        )
    return {"n": len(rows), "runs": rows}
