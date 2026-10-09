"""Statistiques dose-réponse / factoriels (n, IC, tests, corrections)."""

from __future__ import annotations

import math


def proportion_ic(k: int, n: int, z: float = 1.96) -> tuple[float, float, float]:
    """IC Wilson approximé pour une proportion."""
    if n <= 0:
        return 0.0, 0.0, 0.0
    p = k / n
    den = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / den
    marge = (z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / den
    return p, max(0.0, centre - marge), min(1.0, centre + marge)


def chi2_deux_proportions(k1: int, n1: int, k2: int, n2: int) -> dict:
    """Test du χ² d’indépendance 2×2 (fuite vs non) entre deux niveaux."""
    if min(n1, n2) <= 0:
        return {"chi2": 0.0, "p_approx": 1.0, "ok": False}
    k1n, k2n = n1 - k1, n2 - k2
    total = n1 + n2
    r1, r2 = k1 + k2, k1n + k2n
    if r1 == 0 or r2 == 0:
        return {"chi2": 0.0, "p_approx": 1.0, "ok": False, "note": "ligne nulle"}
    e11 = r1 * n1 / total
    e12 = r1 * n2 / total
    e21 = r2 * n1 / total
    e22 = r2 * n2 / total
    chi2 = 0.0
    for o, e in ((k1, e11), (k2, e12), (k1n, e21), (k2n, e22)):
        if e > 0:
            chi2 += (o - e) ** 2 / e
    # approximation queue-de-pouce : p via survie χ² ddl=1
    p = math.erfc(math.sqrt(chi2 / 2.0)) if chi2 > 0 else 1.0
    return {"chi2": round(chi2, 4), "p_approx": round(p, 6), "ok": True, "ddl": 1}


def bonferroni(p_values: list[float], alpha: float = 0.05) -> list[dict]:
    m = max(1, len(p_values))
    out = []
    for i, p in enumerate(p_values):
        adj = min(1.0, p * m)
        out.append(
            {
                "index": i,
                "p": p,
                "p_bonferroni": round(adj, 6),
                "significatif_alpha": adj < alpha,
                "alpha": alpha,
                "m_tests": m,
            }
        )
    return out


def enrichir_courbe(curve: list[dict]) -> list[dict]:
    out = []
    for row in curve:
        n = int(row.get("repeats") or 0)
        ae = int((row.get("action_counts") or {}).get("ESCAPE", 0))
        at = int((row.get("action_counts") or {}).get("EAT", 0))
        ai = int((row.get("action_counts") or {}).get("IDLE", 0))
        pe, lo_e, hi_e = proportion_ic(ae, n)
        pt, lo_t, hi_t = proportion_ic(at, n)
        pi, lo_i, hi_i = proportion_ic(ai, n)
        out.append(
            {
                **row,
                "n": n,
                "stats": {
                    "p_fuite": pe,
                    "ic95_fuite": [lo_e, hi_e],
                    "p_alimentation": pt,
                    "ic95_alimentation": [lo_t, hi_t],
                    "p_repos": pi,
                    "ic95_repos": [lo_i, hi_i],
                },
            }
        )
    return out


def effet_taille_fuite(courbe: list[dict]) -> dict:
    if len(courbe) < 2:
        return {"delta_p_fuite": 0.0, "niveaux": 0}
    bas = courbe[0]
    haut = courbe[-1]
    k1 = int((bas.get("action_counts") or {}).get("ESCAPE", 0))
    n1 = int(bas.get("repeats") or bas.get("n") or 0)
    k2 = int((haut.get("action_counts") or {}).get("ESCAPE", 0))
    n2 = int(haut.get("repeats") or haut.get("n") or 0)
    test = chi2_deux_proportions(k1, n1, k2, n2)
    # tests pairés adjacents + Bonferroni
    p_list = []
    contrasts = []
    for i in range(len(courbe) - 1):
        a, b = courbe[i], courbe[i + 1]
        ka = int((a.get("action_counts") or {}).get("ESCAPE", 0))
        na = int(a.get("repeats") or a.get("n") or 0)
        kb = int((b.get("action_counts") or {}).get("ESCAPE", 0))
        nb = int(b.get("repeats") or b.get("n") or 0)
        t = chi2_deux_proportions(ka, na, kb, nb)
        p_list.append(float(t.get("p_approx") or 1))
        contrasts.append(
            {
                "niveau_a": a.get("level"),
                "niveau_b": b.get("level"),
                **t,
            }
        )
    corr = bonferroni(p_list) if p_list else []
    for i, c in enumerate(contrasts):
        if i < len(corr):
            c["p_bonferroni"] = corr[i]["p_bonferroni"]
            c["significatif_bonferroni"] = corr[i]["significatif_alpha"]
    return {
        "delta_p_fuite": round(float(haut.get("p_escape", 0)) - float(bas.get("p_escape", 0)), 4),
        "niveau_bas": bas.get("level"),
        "niveau_haut": haut.get("level"),
        "niveaux": len(courbe),
        "test_extremes": test,
        "contrastes_adjacents": contrasts,
        "n_total": sum(int(r.get("repeats") or r.get("n") or 0) for r in courbe),
    }


def factoriel_deux_canaux(resultats: list[dict], canal_a: str, canal_b: str) -> dict:
    """Agrège un plan 2×2 à partir d’essais {canal_a, canal_b, action}."""
    cellules: dict[tuple, dict[str, int]] = {}
    for r in resultats:
        key = (round(float(r.get(canal_a, 0)), 3), round(float(r.get(canal_b, 0)), 3))
        cellules.setdefault(key, {"ESCAPE": 0, "EAT": 0, "IDLE": 0, "n": 0})
        act = r.get("action") or "IDLE"
        cellules[key][act] = cellules[key].get(act, 0) + 1
        cellules[key]["n"] += 1
    return {
        "canal_a": canal_a,
        "canal_b": canal_b,
        "cellules": [
            {"niveau_a": k[0], "niveau_b": k[1], **v} for k, v in sorted(cellules.items())
        ],
        "n_essais": len(resultats),
    }


def checklist_papier(card: dict) -> list[dict]:
    items = [
        ("empreinte_jeu", bool(card.get("dataset_hash"))),
        ("empreinte_adaptateurs", bool(card.get("adapters_hash"))),
        ("graine", card.get("seed") is not None),
        ("version_moteur", bool(card.get("engine_version"))),
        ("identifiant_circuit", bool(card.get("circuit_id"))),
        ("action_decodee", bool(card.get("action"))),
        ("provenance", bool(card.get("provenance"))),
        (
            "claim_connectome",
            (card.get("provenance") or {}).get("claim_level")
            in ("export_neuprint", "export_flywire"),
        ),
    ]
    return [{"critere": k, "ok": v} for k, v in items]
