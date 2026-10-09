#!/usr/bin/env python3
"""Chat interactif avec le modèle fruitfly local."""

from __future__ import annotations

import sys

from ollama_client import DEFAULT_MODEL, OLLAMA_URL, ask
import urllib.error


def main() -> None:
    if len(sys.argv) > 1:
        print(ask(" ".join(sys.argv[1:])))
        return

    print(f"Fruit fly — {DEFAULT_MODEL} en local. Ligne vide ou /bye pour quitter.")
    while True:
        try:
            prompt = input("toi> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not prompt or prompt == "/bye":
            break
        try:
            print(ask(prompt))
        except urllib.error.URLError as error:
            print(f"Ollama ne répond pas sur {OLLAMA_URL}: {error}")
            break


if __name__ == "__main__":
    main()
