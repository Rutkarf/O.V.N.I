"""Moteur de simulation fruitfly (partagé CLI + API web)."""

from __future__ import annotations

import math
import random
import re
import urllib.error
from dataclasses import dataclass

from memory import MushroomBody, reward_from_outcome
from ollama_client import ask

ACTIONS = ("ESCAPE", "EAT", "APPROACH", "AVOID", "GROOM", "IDLE", "EXPLORE")
ACTION_RE = re.compile(
    r"ACTION\s*:\s*(ESCAPE|EAT|APPROACH|AVOID|GROOM|IDLE|EXPLORE)",
    re.IGNORECASE,
)


@dataclass
class Sensors:
    sugar: float = 0.0
    bitter: float = 0.0
    looming: float = 0.0
    hunger: float = 0.0

    def clamp(self) -> None:
        self.sugar = _clamp(self.sugar)
        self.bitter = _clamp(self.bitter)
        self.looming = _clamp(self.looming)
        self.hunger = _clamp(self.hunger)

    def line(self) -> str:
        return (
            f"sugar={self.sugar:.2f} bitter={self.bitter:.2f} "
            f"looming={self.looming:.2f} hunger={self.hunger:.2f}"
        )

    def as_dict(self) -> dict[str, float]:
        return {
            "sugar": round(self.sugar, 3),
            "bitter": round(self.bitter, 3),
            "looming": round(self.looming, 3),
            "hunger": round(self.hunger, 3),
        }


@dataclass
class Fly:
    energy: float = 0.75
    alive: bool = True
    cause_of_death: str = ""
    x: float = 0.0
    z: float = 0.0
    heading: float = 0.0

    @property
    def hunger(self) -> float:
        return _clamp(1.0 - self.energy)


class World:
    def __init__(self, rng: random.Random) -> None:
        self.rng = rng
        self.sensors = Sensors()
        self.tick = 0
        self.log: list[str] = []
        self.food_x = 2.5
        self.food_z = 1.2
        self.threat_active = False

    def spawn_stimuli(self) -> None:
        s = self.sensors
        s.sugar = max(0.0, s.sugar - 0.08)
        s.bitter = max(0.0, s.bitter - 0.05)
        s.looming = max(0.0, s.looming - 0.15)
        if s.looming < 0.2:
            self.threat_active = False

        roll = self.rng.random()
        if roll < 0.28:
            s.sugar = max(s.sugar, self.rng.uniform(0.45, 0.95))
            self.food_x = self.rng.uniform(-3.5, 3.5)
            self.food_z = self.rng.uniform(-3.5, 3.5)
            if self.rng.random() < 0.25:
                s.bitter = max(s.bitter, self.rng.uniform(0.35, 0.8))
            self.log.append("Monde: source alimentaire détectée.")
        elif roll < 0.42:
            s.looming = max(s.looming, self.rng.uniform(0.55, 0.95))
            self.threat_active = True
            self.log.append("Monde: ombre qui grossit (menace).")
        elif roll < 0.52:
            s.bitter = max(s.bitter, self.rng.uniform(0.4, 0.9))
            self.log.append("Monde: odeur / goût amer.")

        s.clamp()

    def observe(self, fly: Fly) -> Sensors:
        self.sensors.hunger = fly.hunger
        self.sensors.clamp()
        return Sensors(
            sugar=self.sensors.sugar,
            bitter=self.sensors.bitter,
            looming=self.sensors.looming,
            hunger=self.sensors.hunger,
        )


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def rules_decide(sensors: Sensors) -> tuple[str, str]:
    if sensors.looming > 0.5:
        return "ESCAPE", "looming > 0.5 → circuit d'échappement"
    if sensors.bitter >= 0.3 and sensors.sugar > 0:
        return "AVOID", "amer + sucre → ne pas manger"
    if sensors.sugar > 0 and sensors.bitter < 0.3:
        if sensors.hunger > 0.4:
            return "EAT", "sucre + faim → se nourrir"
        return "APPROACH", "sucre sans faim forte → s'approcher"
    if sensors.hunger > 0.7:
        return "EXPLORE", "faim haute → chercher"
    if sensors.bitter > 0:
        return "AVOID", "stimulus aversif"
    return "IDLE", "pas de drive dominant"


def fruitfly_decide(sensors: Sensors) -> tuple[str, str]:
    prompt = (
        "Tick de vie. Décide UNE action selon tes règles de circuit.\n"
        f"État: {sensors.line()}\n"
        "Réponds au format ACTION / SENS / POURQUOI."
    )
    raw = ask(prompt)
    match = ACTION_RE.search(raw)
    if not match:
        action, why = rules_decide(sensors)
        return action, f"réponse illisible, fallback rules — {why}\n{raw}"
    return match.group(1).upper(), raw


def apply_action(world: World, fly: Fly, action: str, sensors: Sensors) -> str:
    rng = world.rng
    notes: list[str] = []
    fly.energy -= 0.04

    if action == "ESCAPE":
        fly.energy -= 0.08
        fly.x += rng.uniform(-1.8, 1.8)
        fly.z += rng.uniform(-1.8, 1.8)
        fly.heading = rng.uniform(0, 6.28)
        if sensors.looming > 0.5:
            world.sensors.looming = 0.0
            world.threat_active = False
            notes.append("Décollage : menace évitée.")
        else:
            notes.append("Fuite inutile (pas de menace forte).")

    elif action == "EAT":
        if sensors.looming > 0.5:
            fly.alive = False
            fly.cause_of_death = "prédation (manger sous menace)"
            notes.append("Tu mangais pendant l'ombre. Mort.")
        elif sensors.sugar <= 0:
            notes.append("Rien à manger.")
        elif sensors.bitter >= 0.3:
            fly.energy -= 0.25
            world.sensors.sugar = 0.0
            world.sensors.bitter = max(0.0, world.sensors.bitter - 0.3)
            notes.append("Poison / amer : énergie perdue.")
        else:
            gain = 0.18 + 0.22 * sensors.sugar
            fly.energy = _clamp(fly.energy + gain)
            world.sensors.sugar = max(0.0, world.sensors.sugar - 0.55)
            fly.x = world.food_x * 0.85
            fly.z = world.food_z * 0.85
            notes.append(f"Nourriture assimilée (+{gain:.2f} énergie).")

    elif action == "APPROACH":
        if sensors.sugar > 0:
            world.sensors.sugar = _clamp(world.sensors.sugar + 0.1)
            fly.x += (world.food_x - fly.x) * 0.35
            fly.z += (world.food_z - fly.z) * 0.35
            notes.append("Tu te rapproches de la source.")
        else:
            notes.append("Approche sans cible claire.")

    elif action == "AVOID":
        world.sensors.sugar = max(0.0, world.sensors.sugar - 0.35)
        world.sensors.bitter = max(0.0, world.sensors.bitter - 0.45)
        fly.x -= world.food_x * 0.2
        fly.z -= world.food_z * 0.2
        notes.append("Éloignement du stimulus aversif / douteux.")

    elif action == "EXPLORE":
        fly.energy -= 0.03
        fly.heading += rng.uniform(-1.2, 1.2)
        fly.x += 0.9 * math.cos(fly.heading)
        fly.z += 0.9 * math.sin(fly.heading)
        if rng.random() < 0.35:
            world.sensors.sugar = max(world.sensors.sugar, rng.uniform(0.4, 0.85))
            world.food_x = fly.x + rng.uniform(-1.5, 1.5)
            world.food_z = fly.z + rng.uniform(-1.5, 1.5)
            notes.append("Exploration : tu trouves une trace sucrée.")
        else:
            notes.append("Exploration sans trouvaille.")

    elif action == "GROOM":
        world.sensors.bitter = max(0.0, world.sensors.bitter - 0.15)
        notes.append("Toilette : capteurs un peu nettoyés.")

    else:
        notes.append("Attente.")

    fly.x = _clamp(fly.x, -5.0, 5.0)
    fly.z = _clamp(fly.z, -5.0, 5.0)

    if fly.alive and sensors.looming > 0.7 and action != "ESCAPE":
        if rng.random() < 0.55:
            fly.alive = False
            fly.cause_of_death = "prédation (pas d'ESCAPE)"
            notes.append("L'ombre t'a eu.")

    fly.energy = _clamp(fly.energy)
    if fly.alive and fly.energy <= 0.0:
        fly.alive = False
        fly.cause_of_death = "inanition"
        notes.append("Plus d'énergie. Mort de faim.")

    return " ".join(notes)


class Simulation:
    def __init__(self, seed: int | None = None, mode: str = "rules") -> None:
        self.mode = mode
        self.seed = seed
        self.rng = random.Random(seed)
        self.world = World(self.rng)
        self.fly = Fly()
        self.memory = MushroomBody.load()
        self.last_action = "IDLE"
        self.last_brain = ""
        self.last_outcome = ""
        self.last_events: list[str] = []
        self.busy = False
        self.error = ""

    def reset(self, seed: int | None = None, mode: str | None = None) -> dict:
        if mode is not None:
            self.mode = mode
        self.seed = seed
        self.rng = random.Random(seed)
        self.world = World(self.rng)
        self.fly = Fly()
        self.last_action = "IDLE"
        self.last_brain = ""
        self.last_outcome = ""
        self.last_events = []
        self.error = ""
        return self.state()

    def tick(self) -> dict:
        if not self.fly.alive:
            return self.state()
        if self.busy:
            return self.state()

        self.busy = True
        self.error = ""
        energy_before = self.fly.energy
        try:
            self.world.tick += 1
            self.world.log.clear()
            self.world.spawn_stimuli()
            sensors = self.world.observe(self.fly)
            self.last_events = list(self.world.log)

            if self.mode == "fruitfly":
                action, brain = fruitfly_decide(sensors)
            else:
                action, brain = rules_decide(sensors)

            biased = self.memory.bias_action(action, sensors.as_dict())
            if biased and biased != action:
                brain = f"{brain}\n[mémoire MB] valence → {biased} (était {action})"
                action = biased

            if action not in ACTIONS:
                action = "IDLE"

            outcome = apply_action(self.world, self.fly, action, sensors)
            reward = reward_from_outcome(
                action, outcome, self.fly.energy - energy_before
            )
            self.memory.learn(
                sensors.sugar,
                sensors.bitter,
                sensors.looming,
                sensors.hunger,
                reward,
            )
            self.memory.save()

            self.last_action = action
            self.last_brain = brain
            self.last_outcome = outcome
        except urllib.error.URLError as error:
            self.error = f"Ollama indisponible: {error}"
        finally:
            self.busy = False

        return self.state()

    def state(self) -> dict:
        sensors = self.world.observe(self.fly) if self.fly.alive else self.world.sensors
        sensors.hunger = self.fly.hunger
        mb = self.memory.snapshot()
        mb["valence_now"] = round(
            self.memory.encode(
                sensors.sugar, sensors.bitter, sensors.looming, sensors.hunger
            ),
            3,
        )
        return {
            "tick": self.world.tick,
            "mode": self.mode,
            "busy": self.busy,
            "error": self.error,
            "alive": self.fly.alive,
            "cause_of_death": self.fly.cause_of_death,
            "energy": round(self.fly.energy, 3),
            "sensors": sensors.as_dict(),
            "fly": {
                "x": round(self.fly.x, 3),
                "z": round(self.fly.z, 3),
                "heading": round(self.fly.heading, 3),
            },
            "food": {
                "x": round(self.world.food_x, 3),
                "z": round(self.world.food_z, 3),
                "sugar": round(self.world.sensors.sugar, 3),
                "bitter": round(self.world.sensors.bitter, 3),
            },
            "threat": {
                "active": self.world.threat_active
                or self.world.sensors.looming > 0.35,
                "looming": round(self.world.sensors.looming, 3),
            },
            "action": self.last_action,
            "brain": self.last_brain,
            "outcome": self.last_outcome,
            "events": self.last_events,
            "memory": mb,
        }
