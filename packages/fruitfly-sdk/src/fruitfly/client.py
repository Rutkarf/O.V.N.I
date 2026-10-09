from __future__ import annotations

from typing import Any, Iterable

import requests


class FruitflyError(RuntimeError):
    """HTTP or API error from the fruitfly backend."""

    def __init__(self, message: str, status: int | None = None, body: Any = None):
        super().__init__(message)
        self.status = status
        self.body = body


class FruitflyClient:
    """
    Client Python pour l'instrument fruitfly (comme un package R pour un labo).

    Parle au backend Spring (`/api/v1/...`) avec JWT.
    """

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8080",
        token: str | None = None,
        timeout: float = 120.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout
        self.session = requests.Session()

    # --- auth -----------------------------------------------------------------

    def register(self, email: str, password: str, display_name: str) -> dict:
        data = self._request(
            "POST",
            "/api/v1/auth/register",
            json={"email": email, "password": password, "displayName": display_name},
            auth=False,
        )
        self.token = data.get("token") or data.get("accessToken")
        return data

    def login(self, email: str, password: str) -> dict:
        data = self._request(
            "POST",
            "/api/v1/auth/login",
            json={"email": email, "password": password},
            auth=False,
        )
        self.token = data.get("token") or data.get("accessToken")
        return data

    def me(self) -> dict:
        return self._request("GET", "/api/v1/auth/me")

    # --- science --------------------------------------------------------------

    def atlas(self) -> dict:
        return self._request("GET", "/api/v1/science/atlas")

    def stimulate(
        self,
        *,
        sugar: float = 0.0,
        bitter: float = 0.0,
        looming: float = 0.0,
        hunger: float = 0.0,
        seed: int = 0,
        duration_ms: float | None = None,
        silence: Iterable[str] | None = None,
        shuffle_edges: bool = False,
        neuron_rates: dict[str, float] | None = None,
        param_overrides: dict | None = None,
        policy_overrides: dict | None = None,
        **extra: Any,
    ) -> dict:
        body: dict[str, Any] = {
            "sugar": sugar,
            "bitter": bitter,
            "looming": looming,
            "hunger": hunger,
            "seed": seed,
            "shuffle_edges": shuffle_edges,
            **extra,
        }
        if duration_ms is not None:
            body["duration_ms"] = duration_ms
        if silence is not None:
            body["silence"] = list(silence)
        if neuron_rates:
            body["neuron_rates"] = neuron_rates
        if param_overrides:
            body["param_overrides"] = param_overrides
        if policy_overrides:
            body["policy_overrides"] = policy_overrides
        return self._request("POST", "/api/v1/science/stimulate", json=body)

    def batch(self, trials: list[dict], base_seed: int = 0) -> dict:
        return self._request(
            "POST",
            "/api/v1/science/batch",
            json={"trials": trials, "base_seed": base_seed},
        )

    def dose_response(
        self,
        channel: str = "looming",
        levels: list[float] | None = None,
        repeats: int = 5,
        **kwargs: Any,
    ) -> dict:
        body: dict[str, Any] = {
            "channel": channel,
            "repeats": repeats,
            **kwargs,
        }
        if levels is not None:
            body["levels"] = levels
        return self._request("POST", "/api/v1/science/dose-response", json=body)

    def compare(self, run_ids: list[str]) -> dict:
        return self._request("POST", "/api/v1/science/compare", json={"run_ids": run_ids})

    def runs(self, limit: int = 50) -> list:
        return self._request("GET", f"/api/v1/science/runs?limit={limit}")

    def run(self, run_id: str) -> dict:
        return self._request("GET", f"/api/v1/science/runs/{run_id}")

    def validate(self) -> dict:
        return self._request("GET", "/api/v1/science/validate")

    def adapters(self) -> dict:
        return self._request("GET", "/api/v1/science/adapters")

    def save_adapters(self, document: dict) -> dict:
        clean = {k: v for k, v in document.items() if not str(k).startswith("_")}
        return self._request("POST", "/api/v1/science/adapters", json=clean)

    def reset_adapters(self) -> dict:
        return self._request("POST", "/api/v1/science/adapters/reset", json={})

    def upload_edges(self, csv: str) -> dict:
        return self._request("POST", "/api/v1/science/upload/edges", json={"csv": csv})

    def reset_circuit(self) -> dict:
        return self._request("POST", "/api/v1/science/circuit/reset", json={})

    def spikes_csv(self, run_id: str) -> str:
        return self._request_text("GET", f"/api/v1/science/runs/{run_id}/spikes.csv")

    def methods_md(self, run_id: str) -> str:
        return self._request_text("GET", f"/api/v1/science/runs/{run_id}/methods.md")

    # --- helpers --------------------------------------------------------------

    def _headers(self, auth: bool) -> dict[str, str]:
        h = {"Accept": "application/json"}
        if auth and self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict | None = None,
        auth: bool = True,
    ) -> Any:
        url = f"{self.base_url}{path}"
        r = self.session.request(
            method,
            url,
            json=json,
            headers=self._headers(auth),
            timeout=self.timeout,
        )
        if r.status_code >= 400:
            try:
                body = r.json()
            except Exception:  # noqa: BLE001
                body = r.text
            raise FruitflyError(
                f"{method} {path} → {r.status_code}: {body}",
                status=r.status_code,
                body=body,
            )
        if not r.content:
            return {}
        return r.json()

    def _request_text(self, method: str, path: str) -> str:
        url = f"{self.base_url}{path}"
        r = self.session.request(
            method, url, headers=self._headers(True), timeout=self.timeout
        )
        if r.status_code >= 400:
            raise FruitflyError(f"{method} {path} → {r.status_code}", status=r.status_code)
        return r.text
