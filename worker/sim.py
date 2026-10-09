#!/usr/bin/env python3
"""CLI : boucle de vie fruitfly (monde → capteurs → cerveau → action)."""

from __future__ import annotations

import argparse
import sys

from engine import Simulation, _clamp


def render_bar(value: float, width: int = 12) -> str:
    filled = int(round(_clamp(value) * width))
    return "[" + "#" * filled + "." * (width - filled) + "]"


def print_state(state: dict) -> None:
    sensors = state["sensors"]
    print()
    print(
        f"── tick {state['tick']} ── énergie {state['energy']:.2f} "
        f"{render_bar(state['energy'])}"
    )
    for event in state["events"]:
        print(f"  · {event}")
    print(
        "  capteurs  "
        f"sugar={sensors['sugar']:.2f} bitter={sensors['bitter']:.2f} "
        f"looming={sensors['looming']:.2f} hunger={sensors['hunger']:.2f}"
    )
    print(f"  action    {state['action']}")
    for line in (state["brain"] or "").strip().splitlines()[:6]:
        print(f"  cerveau   {line}")
    print(f"  résultat  {state['outcome']}")
    if state.get("memory"):
        print(
            "  mémoire   "
            f"valence={state['memory'].get('valence_now')} "
            f"updates={state['memory'].get('updates')}"
        )


def run(ticks: int, seed: int | None, mode: str) -> int:
    sim = Simulation(seed=seed, mode=mode)
    print("fruitfly — boucle de vie locale")
    print(f"mode={mode}  ticks max={ticks}  seed={seed}")
    if mode == "fruitfly":
        print("Chaque tick appelle Ollama (peut prendre ~30–90 s). Ctrl+C pour quit.")
    else:
        print("Mode rules : décisions locales + mémoire mushroom body.")

    for _ in range(ticks):
        try:
            state = sim.tick()
        except KeyboardInterrupt:
            print("\nInterrompu.")
            return 130

        if state["error"]:
            print(f"\n{state['error']}")
            print("Relance avec --mode rules pour tester sans le LLM.")
            return 1

        print_state(state)
        if not state["alive"]:
            print()
            print(f"FIN — morte au tick {state['tick']} ({state['cause_of_death']}).")
            return 0

    state = sim.state()
    print()
    print(f"FIN — survivante après {state['tick']} ticks (énergie {state['energy']:.2f}).")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulateur de vie fruitfly")
    parser.add_argument("--ticks", type=int, default=8, help="nombre max de ticks")
    parser.add_argument("--seed", type=int, default=None, help="graine RNG")
    parser.add_argument(
        "--mode",
        choices=("fruitfly", "rules"),
        default="fruitfly",
        help="fruitfly = LLM Ollama ; rules = arbitre local rapide",
    )
    args = parser.parse_args()
    sys.exit(run(ticks=args.ticks, seed=args.seed, mode=args.mode))


if __name__ == "__main__":
    main()
