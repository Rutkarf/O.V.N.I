"""Modulateurs photopériode / température pour l’entraînement sensoriel LIF."""

from __future__ import annotations


def modulateurs(circadian: str | None, temperature_c: float | None) -> dict:
    temp = float(temperature_c if temperature_c is not None else 25.0)
    circ = (circadian or "day").lower()
    if circ not in ("day", "night"):
        circ = "day"
    temp_factor = max(0.55, 1.15 - abs(temp - 25.0) * 0.028)
    night = circ == "night"
    activity = (0.72 if night else 1.0) * temp_factor
    return {
        "temperature_c": temp,
        "circadian": circ,
        "temp_factor": round(temp_factor, 4),
        "activity_factor": round(activity, 4),
        "sugar_drive_scale": round((0.85 if night else 1.0) * temp_factor, 4),
        "looming_drive_scale": round((0.88 if night else 1.0) * temp_factor, 4),
        "bitter_drive_scale": 1.0,
        "note": "Modulateurs pédagogiques — calibrer sur comportement PiCsL avant claim.",
    }
