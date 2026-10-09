"""LIF discret déterministe — petit graphe, exportable pour Methods."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field


@dataclass
class LifParams:
    dt_ms: float = 0.1
    duration_ms: float = 500.0
    v_rest: float = -65.0
    v_reset: float = -70.0
    v_thresh: float = -50.0
    tau_ms: float = 20.0
    r_mohm: float = 10.0
    refractory_ms: float = 2.0
    syn_tau_ms: float = 5.0
    syn_strength: float = 8.0


@dataclass
class Graph:
    neuron_ids: list[str]
    edges: list[tuple[str, str, float]]
    index: dict[str, int] = field(default_factory=dict)
    wmat: list[list[float]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.index = {n: i for i, n in enumerate(self.neuron_ids)}
        n = len(self.neuron_ids)
        self.wmat = [[0.0] * n for _ in range(n)]
        for pre, post, w in self.edges:
            if pre in self.index and post in self.index:
                self.wmat[self.index[pre]][self.index[post]] += w


def poisson_train(rate_hz: float, duration_ms: float, rng: random.Random) -> list[float]:
    if rate_hz <= 0:
        return []
    times: list[float] = []
    t = 0.0
    lam = rate_hz / 1000.0
    while True:
        t += rng.expovariate(lam)
        if t >= duration_ms:
            break
        times.append(t)
    return times


def run_lif(
    graph: Graph,
    input_spikes: dict[str, list[float]],
    params: LifParams,
) -> dict[str, list[float]]:
    n = len(graph.neuron_ids)
    v = [params.v_rest] * n
    refrac = [0.0] * n
    i_syn = [0.0] * n
    spikes: dict[str, list[float]] = {nid: [] for nid in graph.neuron_ids}

    # External drive schedules: neuron index -> set of step indices
    ext: list[set[int]] = [set() for _ in range(n)]
    for nid, times in input_spikes.items():
        if nid not in graph.index:
            continue
        i = graph.index[nid]
        for t in times:
            ext[i].add(int(t / params.dt_ms))

    steps = int(params.duration_ms / params.dt_ms)
    syn_decay = math.exp(-params.dt_ms / params.syn_tau_ms)
    ext_kick = params.syn_strength * 2.2

    for step in range(steps):
        t = step * params.dt_ms
        # synaptic decay + external kicks
        for i in range(n):
            i_syn[i] *= syn_decay
            if step in ext[i]:
                i_syn[i] += ext_kick

        fired: list[int] = []
        for i in range(n):
            if refrac[i] > 0:
                refrac[i] -= params.dt_ms
                v[i] = params.v_reset
                continue
            dv = (-(v[i] - params.v_rest) + i_syn[i] * params.r_mohm) * (
                params.dt_ms / params.tau_ms
            )
            v[i] += dv
            if v[i] >= params.v_thresh:
                spikes[graph.neuron_ids[i]].append(round(t, 3))
                v[i] = params.v_reset
                refrac[i] = params.refractory_ms
                fired.append(i)

        # instantaneous synapse onto targets (next decay step)
        for i in fired:
            for j in range(n):
                w = graph.wmat[i][j]
                if w != 0.0:
                    i_syn[j] += params.syn_strength * w

    return spikes


def decode_action(spikes: dict[str, list[float]], adapters: dict) -> tuple[str, float | None]:
    readouts = adapters["readouts"]
    window = float(readouts["EAT"].get("window_ms", 50))
    eat_count = int(readouts["EAT"].get("count", 4))

    escape_times = sorted(
        t for n in readouts["ESCAPE"]["neurons"] for t in spikes.get(n, [])
    )
    eat_times = sorted(t for n in readouts["EAT"]["neurons"] for t in spikes.get(n, []))

    escape_t = escape_times[0] if escape_times else None
    eat_t = None
    if len(eat_times) >= eat_count:
        for i in range(len(eat_times) - eat_count + 1):
            if eat_times[i + eat_count - 1] - eat_times[i] <= window:
                eat_t = eat_times[i + eat_count - 1]
                break

    if escape_t is not None and (eat_t is None or escape_t <= eat_t):
        return "ESCAPE", escape_t
    if eat_t is not None:
        return "EAT", eat_t
    return "IDLE", None
