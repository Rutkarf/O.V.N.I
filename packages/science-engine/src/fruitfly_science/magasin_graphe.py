"""Magasin graphe SQLite — même API atlas / stimulate derrière cache ROI."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from fruitfly_science.paths import runtime_root


def chemin_db() -> Path:
    path = runtime_root() / "magasin_graphe.sqlite"
    return path


def _conn() -> sqlite3.Connection:
    path = chemin_db()
    con = sqlite3.connect(str(path))
    con.row_factory = sqlite3.Row
    con.execute("CREATE TABLE IF NOT EXISTS _schema (k TEXT PRIMARY KEY, v TEXT)")
    row = con.execute("SELECT v FROM _schema WHERE k = 'version'").fetchone()
    if not row or row["v"] != "2":
        con.execute("DROP TABLE IF EXISTS neurones")
        con.execute("DROP TABLE IF EXISTS aretes")
        con.execute("INSERT OR REPLACE INTO _schema(k, v) VALUES ('version', '2')")
        con.commit()
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS neurones (
            id TEXT NOT NULL,
            circuit_id TEXT NOT NULL,
            type TEXT,
            classe TEXT,
            hemisphere TEXT,
            roi TEXT,
            sexe TEXT,
            tags TEXT,
            provenances TEXT,
            PRIMARY KEY (circuit_id, id)
        )
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS aretes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            circuit_id TEXT NOT NULL,
            pre TEXT NOT NULL,
            post TEXT NOT NULL,
            poids REAL,
            signe INTEGER,
            synapses INTEGER,
            roi TEXT
        )
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS circuits_cache (
            circuit_id TEXT PRIMARY KEY,
            empreinte TEXT,
            json_brut TEXT,
            charge_at TEXT
        )
        """
    )
    con.execute("CREATE INDEX IF NOT EXISTS idx_neur_roi ON neurones(roi)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_neur_classe ON neurones(classe)")
    con.execute("CREATE INDEX IF NOT EXISTS idx_aretes_circuit ON aretes(circuit_id)")
    return con


def synchroniser_circuit(circuit: dict) -> dict:
    """Charge un circuit JSON dans SQLite (remplace les lignes du même id)."""
    cid = circuit["id"]
    empreinte = __import__("hashlib").sha256(
        json.dumps(circuit, sort_keys=True).encode()
    ).hexdigest()[:16]
    con = _conn()
    try:
        con.execute("DELETE FROM neurones WHERE circuit_id = ?", (cid,))
        con.execute("DELETE FROM aretes WHERE circuit_id = ?", (cid,))
        for n in circuit.get("neurons", []):
            con.execute(
                """
                INSERT INTO neurones(id, circuit_id, type, classe, hemisphere, roi, sexe, tags, provenances)
                VALUES (?,?,?,?,?,?,?,?,?)
                """,
                (
                    n["id"],
                    cid,
                    n.get("type"),
                    n.get("class"),
                    n.get("hemisphere"),
                    n.get("roi"),
                    n.get("sex"),
                    json.dumps(n.get("tags") or [], ensure_ascii=False),
                    json.dumps(circuit.get("provenance") or {}, ensure_ascii=False),
                ),
            )
        for e in circuit.get("edges", []):
            con.execute(
                """
                INSERT INTO aretes(circuit_id, pre, post, poids, signe, synapses, roi)
                VALUES (?,?,?,?,?,?,?)
                """,
                (
                    cid,
                    e["pre"],
                    e["post"],
                    float(e.get("weight", 1)),
                    int(e.get("sign", 1)),
                    int(e.get("synapses", 1)),
                    e.get("roi"),
                ),
            )
        from datetime import datetime, timezone

        con.execute(
            """
            INSERT OR REPLACE INTO circuits_cache(circuit_id, empreinte, json_brut, charge_at)
            VALUES (?,?,?,?)
            """,
            (cid, empreinte, json.dumps(circuit, ensure_ascii=False), datetime.now(timezone.utc).isoformat()),
        )
        con.commit()
    finally:
        con.close()
    return {"ok": True, "circuit_id": cid, "empreinte": empreinte}


def atlas_page(
    circuit_id: str,
    *,
    page: int = 1,
    taille: int = 50,
    roi: str | None = None,
    classe: str | None = None,
) -> dict:
    """Pagination atlas pour scale (~166k)."""
    page = max(1, int(page))
    taille = max(1, min(500, int(taille)))
    offset = (page - 1) * taille
    con = _conn()
    try:
        wheres = ["circuit_id = ?"]
        args: list = [circuit_id]
        if roi:
            wheres.append("roi = ?")
            args.append(roi)
        if classe:
            wheres.append("classe = ?")
            args.append(classe)
        where = " AND ".join(wheres)
        total = con.execute(f"SELECT COUNT(*) FROM neurones WHERE {where}", args).fetchone()[0]
        rows = con.execute(
            f"SELECT * FROM neurones WHERE {where} ORDER BY id LIMIT ? OFFSET ?",
            [*args, taille, offset],
        ).fetchall()
        neurones = [
            {
                "id": r["id"],
                "type": r["type"],
                "class": r["classe"],
                "hemisphere": r["hemisphere"],
                "roi": r["roi"],
                "sex": r["sexe"],
                "tags": json.loads(r["tags"] or "[]"),
            }
            for r in rows
        ]
        n_aretes = con.execute(
            "SELECT COUNT(*) FROM aretes WHERE circuit_id = ?", (circuit_id,)
        ).fetchone()[0]
        rois = [x[0] for x in con.execute(
            "SELECT DISTINCT roi FROM neurones WHERE circuit_id = ? ORDER BY roi", (circuit_id,)
        ).fetchall() if x[0]]
        classes = [x[0] for x in con.execute(
            "SELECT DISTINCT classe FROM neurones WHERE circuit_id = ? ORDER BY classe", (circuit_id,)
        ).fetchall() if x[0]]
        return {
            "circuit_id": circuit_id,
            "page": page,
            "taille": taille,
            "total": total,
            "pages": max(1, (total + taille - 1) // taille),
            "neuron_count": total,
            "edge_count": n_aretes,
            "neurons": neurones,
            "rois": rois,
            "classes": classes,
        }
    finally:
        con.close()


def empreinte_cache(circuit_id: str) -> str | None:
    con = _conn()
    try:
        row = con.execute(
            "SELECT empreinte FROM circuits_cache WHERE circuit_id = ?", (circuit_id,)
        ).fetchone()
        return row["empreinte"] if row else None
    finally:
        con.close()
