"""Client HTTP local pour Ollama. Rien ne sort de la machine."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
DEFAULT_MODEL = "fruitfly"


def ask(prompt: str, model: str = DEFAULT_MODEL, timeout: float = 300) -> str:
    body = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "think": False,
        }
    ).encode()
    request = urllib.request.Request(
        OLLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.load(response)
    return payload["message"]["content"].strip()


class OllamaError(urllib.error.URLError):
    """Alias pour les appels échoués."""
