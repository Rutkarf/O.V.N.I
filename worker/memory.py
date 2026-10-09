"""Mémoire type mushroom body : associations KC → valence (récompense / punition)."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

MEMORY_PATH = Path(__file__).resolve().parent / "memory.json"


@dataclass
class MushroomBody:
    """4 Kenyon cells grossières (sucre, amer, looming, faim) → valence."""

    sugar: float = 0.0
    bitter: float = 0.0
    looming: float = 0.0
    hunger: float = 0.0
    updates: int = 0
    history: list[dict] = field(default_factory=list)

    def encode(self, sugar: float, bitter: float, looming: float, hunger: float) -> float:
        """Valence attendue pour ce pattern sensoriel (−1..+1)."""
        return (
            self.sugar * sugar
            + self.bitter * bitter
            + self.looming * looming
            + self.hunger * hunger
        )

    def learn(
        self,
        sugar: float,
        bitter: float,
        looming: float,
        hunger: float,
        reward: float,
        lr: float = 0.12,
    ) -> None:
        """Dopamine-like : renforce les KC actifs selon la récompense."""
        self.sugar = _clamp(self.sugar + lr * reward * sugar, -2.0, 2.0)
        self.bitter = _clamp(self.bitter + lr * reward * bitter, -2.0, 2.0)
        self.looming = _clamp(self.looming + lr * reward * looming, -2.0, 2.0)
        self.hunger = _clamp(self.hunger + lr * reward * hunger, -2.0, 2.0)
        self.updates += 1
        self.history.append(
            {
                "sugar": round(sugar, 3),
                "bitter": round(bitter, 3),
                "looming": round(looming, 3),
                "hunger": round(hunger, 3),
                "reward": round(reward, 3),
                "valence": round(self.encode(sugar, bitter, looming, hunger), 3),
            }
        )
        self.history = self.history[-40:]

    def bias_action(self, action: str, sensors_line: dict[str, float]) -> str | None:
        """Si la valence est très négative et qu'on allait manger → AVOID."""
        valence = self.encode(
            sensors_line["sugar"],
            sensors_line["bitter"],
            sensors_line["looming"],
            sensors_line["hunger"],
        )
        if action in ("EAT", "APPROACH") and valence < -0.35:
            return "AVOID"
        if action == "AVOID" and valence > 0.45 and sensors_line["bitter"] < 0.25:
            return "EAT" if sensors_line["hunger"] > 0.4 else "APPROACH"
        return None

    def snapshot(self) -> dict:
        data = asdict(self)
        data["valence_now"] = None
        return data

    def save(self, path: Path = MEMORY_PATH) -> None:
        path.write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path = MEMORY_PATH) -> MushroomBody:
        if not path.exists():
            return cls()
        raw = json.loads(path.read_text(encoding="utf-8"))
        return cls(
            sugar=float(raw.get("sugar", 0)),
            bitter=float(raw.get("bitter", 0)),
            looming=float(raw.get("looming", 0)),
            hunger=float(raw.get("hunger", 0)),
            updates=int(raw.get("updates", 0)),
            history=list(raw.get("history", []))[-40:],
        )


def reward_from_outcome(action: str, outcome: str, energy_delta: float) -> float:
    if "Mort" in outcome or "prédation" in outcome or "inanition" in outcome:
        return -1.0
    if "Poison" in outcome or "amer" in outcome.lower():
        return -0.8
    if "Nourriture assimilée" in outcome:
        return 0.7 + min(0.3, max(0.0, energy_delta))
    if action == "ESCAPE" and "évitée" in outcome:
        return 0.4
    if action == "AVOID":
        return 0.15
    return max(-0.2, min(0.2, energy_delta))


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))
