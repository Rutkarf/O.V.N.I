"""Balayages asynchrones légers (file locale) — scale Phase G."""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fruitfly_science.paths import runtime_root
from fruitfly_science.stimulate import batch_stimulate, dose_response

_lock = threading.Lock()
_jobs: dict[str, dict] = {}


def _jobs_dir() -> Path:
    d = runtime_root() / "jobs"
    d.mkdir(exist_ok=True)
    return d


def soumettre_dose(body: dict) -> dict:
    jid = str(uuid.uuid4())
    job = {
        "id": jid,
        "type": "dose_reponse",
        "statut": "en_attente",
        "cree_at": datetime.now(timezone.utc).isoformat(),
        "resultat": None,
        "erreur": None,
    }
    with _lock:
        _jobs[jid] = job
    thread = threading.Thread(target=_run_dose, args=(jid, body), daemon=True)
    thread.start()
    return {"job_id": jid, "statut": "en_attente"}


def soumettre_lot(body: dict) -> dict:
    jid = str(uuid.uuid4())
    job = {
        "id": jid,
        "type": "lot",
        "statut": "en_attente",
        "cree_at": datetime.now(timezone.utc).isoformat(),
        "resultat": None,
        "erreur": None,
    }
    with _lock:
        _jobs[jid] = job
    threading.Thread(target=_run_lot, args=(jid, body), daemon=True).start()
    return {"job_id": jid, "statut": "en_attente"}


def _run_dose(jid: str, body: dict) -> None:
    with _lock:
        _jobs[jid]["statut"] = "en_cours"
    try:
        res = dose_response(body)
        with _lock:
            _jobs[jid]["statut"] = "termine"
            _jobs[jid]["resultat"] = res
        (_jobs_dir() / f"{jid}.json").write_text(
            json.dumps(_jobs[jid], ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as exc:  # noqa: BLE001
        with _lock:
            _jobs[jid]["statut"] = "echec"
            _jobs[jid]["erreur"] = str(exc)


def _run_lot(jid: str, body: dict) -> None:
    with _lock:
        _jobs[jid]["statut"] = "en_cours"
    try:
        res = batch_stimulate(body)
        with _lock:
            _jobs[jid]["statut"] = "termine"
            _jobs[jid]["resultat"] = res
        (_jobs_dir() / f"{jid}.json").write_text(
            json.dumps(_jobs[jid], ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as exc:  # noqa: BLE001
        with _lock:
            _jobs[jid]["statut"] = "echec"
            _jobs[jid]["erreur"] = str(exc)


def statut_job(job_id: str) -> dict | None:
    with _lock:
        job = _jobs.get(job_id)
        if job:
            return dict(job)
    path = _jobs_dir() / f"{job_id}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None
