"""Génétique drosophile — croisements, CRISPR 1/2, Kepler, GAL4/UAS, phénotype Argon."""

from __future__ import annotations

import json
import random
import uuid
from datetime import datetime, timezone

from fruitfly_science.paths import datasets_root


def _catalog() -> dict:
    path = datasets_root() / "genetics_loci.json"
    return (
        json.loads(path.read_text(encoding="utf-8"))
        if path.exists()
        else {"loci": [], "cross_types": [], "drivers": []}
    )


def catalog() -> dict:
    return {"format": "fruitfly.genetics.catalog.v1", **_catalog()}


def _parse_alleles(genotype: dict | str) -> dict[str, tuple[str, str]]:
    if isinstance(genotype, dict):
        out: dict[str, tuple[str, str]] = {}
        for k, v in genotype.items():
            if isinstance(v, (list, tuple)) and len(v) == 2:
                out[k] = (str(v[0]), str(v[1]))
            elif isinstance(v, str) and "/" in v:
                a, b = v.split("/", 1)
                out[k] = (a.strip(), b.strip())
        return out
    if isinstance(genotype, str):
        out = {}
        for part in genotype.replace(" ", "").split(";"):
            if not part or "=" not in part:
                continue
            loc, alleles = part.split("=", 1)
            loc = loc.strip()
            if "/" in alleles:
                a, b = alleles.split("/", 1)
                out[loc] = (a.strip(), b.strip())
        return out
    return {}


def _wild_type() -> dict[str, tuple[str, str]]:
    cat = _catalog()
    return {
        str(l["id"]): (str(l["dominant"]), str(l["dominant"]))
        for l in cat.get("loci") or []
    }


def _gamete(alleles: dict[str, tuple[str, str]], locus: str, rng: random.Random) -> str:
    a, b = alleles.get(locus, ("+", "+"))
    return rng.choice([a, b])


def _genotype_label(gt: dict) -> str:
    alleles = _parse_alleles(gt)
    parts = []
    for loc in sorted(alleles.keys()):
        a, b = alleles[loc]
        parts.append(f"{loc}={a}/{b}")
    return "; ".join(parts) if parts else "—"


def cross(body: dict) -> dict:
    """Croisement mendélien (plusieurs modes)."""
    body = body or {}
    cross_type = str(body.get("cross_type") or "mono_hybrid")
    g1 = _parse_alleles(body.get("parent_a") or body.get("parent1") or _wild_type())
    g2 = _parse_alleles(body.get("parent_b") or body.get("parent2") or _wild_type())
    seed = int(body.get("seed") or 42)
    n = min(500, max(4, int(body.get("n_offspring") or 64)))
    rng = random.Random(seed)
    loci = list(set(g1.keys()) | set(g2.keys()))
    if not loci:
        loci = [l["id"] for l in (_catalog().get("loci") or [])[:2]]

    offspring: list[dict] = []
    for i in range(n):
        child: dict[str, tuple[str, str]] = {}
        for loc in loci:
            child[loc] = (_gamete(g1, loc, rng), _gamete(g2, loc, rng))
        row = {k: list(v) for k, v in child.items()}
        offspring.append(row)

    loc0 = loci[0]
    counts: dict[str, int] = {}
    for o in offspring:
        a, b = o[loc0]
        if a == b:
            key = "hom_" + a
        else:
            key = "het"
        counts[key] = counts.get(key, 0) + 1

    # Liste sélectionnable (32 premiers) avec phénotype résumé
    selectable = []
    for i, o in enumerate(offspring[:32]):
        ph = phenotype(o, body.get("drivers"))
        selectable.append(
            {
                "index": i,
                "label": _genotype_label(o),
                "genotype": o,
                "phenotype": ph,
                "generation": "F2" if "sibling" in cross_type or "dihybrid" in cross_type else "F1",
            }
        )

    drivers = body.get("drivers") or {}
    first_ph = phenotype(offspring[0] if offspring else g1, drivers)
    progeny_id = str(uuid.uuid4())
    return {
        "format": "fruitfly.genetics.cross.v1",
        "cross_type": cross_type,
        "parent_a": {k: list(v) for k, v in g1.items()},
        "parent_b": {k: list(v) for k, v in g2.items()},
        "loci": loci,
        "n": n,
        "seed": seed,
        "progeny_id": progeny_id,
        "offspring": offspring[:32],
        "selectable": selectable,
        "counts_preview": counts,
        "genotype": offspring[0] if offspring else {k: list(v) for k, v in g1.items()},
        "phenotype": first_ph,
        "drivers": drivers,
        "sex_annotation": (
            "réciproque : parent A ♀ / parent B ♂"
            if cross_type == "reciprocal"
            else body.get("sex_note") or "♀ × ♂ standard"
        ),
        "argon_manifest_hint": "Exporter GET /passerelles/argon avec ce progeny_id",
    }


def apply_edit(body: dict) -> dict:
    """CRISPR 1 (Cas9) ou CRISPR 2 (Cas12a) — édition allélique pédagogique."""
    body = body or {}
    tool = str(body.get("tool") or "crispr1_cas9").lower()
    gt = _parse_alleles(body.get("genotype") or _wild_type())
    targets = body.get("targets") or body.get("loci") or ["w"]
    if isinstance(targets, str):
        targets = [targets]
    events = []
    for loc in targets:
        loc = str(loc)
        rec = _recessif_allele(loc)
        if "cas9" in tool or tool == "crispr1":
            gt[loc] = (rec, rec)
            events.append({"locus": loc, "effet": "knock-out Cas9", "allele": rec})
        elif "cas12" in tool or "crispr2" in tool or tool == "crispr2_cas12a":
            dom = _dominant_allele(loc)
            gt[loc] = (dom + "-GFP", dom)
            events.append({"locus": loc, "effet": "knock-in tag Cas12a", "allele": gt[loc][0]})
        elif "kepler" in tool:
            gt[loc] = (rec, rec)
            events.append({"locus": loc, "effet": "Ciseaux Kepler (multiplex)", "allele": rec})

    drivers = body.get("drivers") or {}
    ph = phenotype({k: list(v) for k, v in gt.items()}, drivers)
    return {
        "format": "fruitfly.genetics.edit.v1",
        "tool": tool,
        "famille": (
            "KEPLER"
            if "kepler" in tool
            else "CRISPR2"
            if "cas12" in tool or "crispr2" in tool
            else "CRISPR1"
        ),
        "genotype": {k: list(v) for k, v in gt.items()},
        "events": events,
        "phenotype": ph,
        "drivers": drivers,
        "cree_at": datetime.now(timezone.utc).isoformat(),
    }


def kepler_scissors(body: dict) -> dict:
    """Ciseaux Kepler — découpe multiplexée (Cas12a) sur plusieurs cibles."""
    body = body or {}
    cuts = body.get("cuts") or body.get("targets") or ["w", "y"]
    if isinstance(cuts, str):
        cuts = [c.strip() for c in cuts.split(",")]
    edit = apply_edit({**body, "tool": "kepler", "targets": cuts})
    edit["format"] = "fruitfly.genetics.kepler.v1"
    edit["kepler"] = {
        "geometry": "multiplex_arc",
        "n_cuts": len(cuts),
        "cuts": cuts,
        "note": "Rendu 3D : arc de ciseaux autour du thorax — pédagogie CRISPR2",
    }
    return edit


def apply_drivers(body: dict) -> dict:
    """Intersection GAL4 × UAS → expression pédagogique (glow neural / reporter)."""
    body = body or {}
    gt = body.get("genotype") or _wild_type()
    drivers = body.get("drivers") or {}
    gal4 = str(drivers.get("gal4") or body.get("gal4") or "")
    uas = str(drivers.get("uas") or body.get("uas") or "")
    cat = {d["id"]: d for d in (_catalog().get("drivers") or [])}
    g_meta = cat.get(gal4) if gal4 else None
    u_meta = cat.get(uas) if uas else None
    g_type = (g_meta or {}).get("type")
    driver_ok = g_type in ("GAL4", "SPLIT_GAL4")
    active = bool(g_meta and u_meta and driver_ok and u_meta.get("type") == "UAS")
    # Split AD×DBD sans lignée packagée
    split_ad = str(drivers.get("split_ad") or body.get("split_ad") or "")
    split_dbd = str(drivers.get("split_dbd") or body.get("split_dbd") or "")
    if not active and split_ad and split_dbd and uas:
        ad_m, dbd_m = cat.get(split_ad), cat.get(split_dbd)
        if (
            ad_m
            and dbd_m
            and ad_m.get("type") == "SPLIT_AD"
            and dbd_m.get("type") == "SPLIT_DBD"
            and (u_meta or cat.get(uas) or {}).get("type") == "UAS"
        ):
            active = True
            g_meta = {
                "pattern": ad_m.get("pattern"),
                "neuron_glow": max(
                    float(ad_m.get("neuron_glow") or 1),
                    float(dbd_m.get("neuron_glow") or 1),
                ),
                "type": "SPLIT_GAL4",
            }
            gal4 = f"{split_ad}∩{split_dbd}"
            u_meta = u_meta or cat.get(uas)
    combo = {
        "gal4": gal4 or None,
        "uas": uas or None,
        "split_ad": split_ad or None,
        "split_dbd": split_dbd or None,
        "active": active,
        "pattern": (g_meta or {}).get("pattern") if active else None,
        "reporter": (u_meta or {}).get("reporter") if active else None,
        "label": f"{gal4} > {uas}" if active else "pas de croisement driver",
        "kind": (g_meta or {}).get("type") if active else None,
    }
    ph = phenotype(gt, {"gal4": gal4, "uas": uas, "split_meta": g_meta} if active else {})
    return {
        "format": "fruitfly.genetics.drivers.v1",
        "genotype": gt if isinstance(gt, dict) else {k: list(v) for k, v in _parse_alleles(gt).items()},
        "drivers": combo,
        "phenotype": ph,
        "note": "GAL4/UAS/split = outil d’expression — pas une preuve connectomique.",
    }


def phenotype(genotype: dict, drivers: dict | None = None) -> dict:
    """Phénotype → paramètres Three.js (échelle Argon, yeux, ailes, GAL4/UAS…)."""
    alleles = _parse_alleles(genotype)
    cat = {l["id"]: l for l in (_catalog().get("loci") or [])}
    drv_cat = {d["id"]: d for d in (_catalog().get("drivers") or [])}
    scale = 1.0
    wing_scale = 1.0
    eye_hex = 0xB01A2E
    amber_shift = 0.0
    tags: list[str] = []
    label_parts: list[str] = []

    for loc, (a, b) in alleles.items():
        meta = cat.get(loc, {})
        rec = str(meta.get("recessif", ""))
        is_hom_rec = a == b == rec
        is_het = a != b
        if is_hom_rec:
            pr = meta.get("phenotype_recessif") or {}
            if "eye_hex" in pr:
                eye_hex = int(pr["eye_hex"])
            if "wing_scale" in pr:
                wing_scale *= float(pr["wing_scale"])
            if "argon_scale" in pr:
                scale *= float(pr["argon_scale"])
            if "cuticle_amber_shift" in pr:
                amber_shift += float(pr["cuticle_amber_shift"])
            label_parts.append(f"{loc}⁻")
        elif is_het and meta.get("phenotype_dominant_het"):
            het = meta["phenotype_dominant_het"]
            if "argon_scale" in het:
                scale *= float(het["argon_scale"])
            label_parts.append(f"{loc}⁺/⁻")
        else:
            label_parts.append(f"{loc}⁺")
        if "GFP" in a or "GFP" in b:
            tags.append(f"{loc}::GFP")

    drivers = drivers or {}
    gal4 = str(drivers.get("gal4") or "")
    uas = str(drivers.get("uas") or "")
    g_meta = drv_cat.get(gal4) or drivers.get("split_meta")
    u_meta = drv_cat.get(uas)
    g_type = (g_meta or {}).get("type")
    driver_active = bool(
        g_meta
        and u_meta
        and g_type in ("GAL4", "SPLIT_GAL4")
        and u_meta.get("type") == "UAS"
    )
    neuron_glow = 1.0
    reporter_hex = 0
    optogenetic = False
    silence_boost = False
    eye_boost = False
    driver_label = ""
    if driver_active:
        neuron_glow = float(g_meta.get("neuron_glow") or 1.0)
        reporter_hex = int(u_meta.get("reporter_hex") or 0x32CD33)
        optogenetic = bool(u_meta.get("optogenetic"))
        silence_boost = bool(u_meta.get("silence_boost"))
        eye_boost = bool(g_meta.get("eye_boost"))
        driver_label = f"{gal4} > {uas}"
        if eye_boost and eye_hex == 0xB01A2E:
            eye_hex = 0xE04060
        tags.append(driver_label)

    return {
        "argon_scale": round(scale, 3),
        "wing_scale": round(wing_scale, 3),
        "eye_hex": eye_hex,
        "cuticle_amber_shift": round(amber_shift, 3),
        "fluorescent_tags": tags,
        "genotype_label": "; ".join(label_parts) or "w+/w+; y+/y+ (Oregon-R type)",
        "crispr_glow": any("GFP" in t for t in tags) or (driver_active and not silence_boost),
        "driver_active": driver_active,
        "driver_label": driver_label,
        "neuron_glow": round(neuron_glow, 3),
        "reporter_hex": reporter_hex,
        "optogenetic": optogenetic,
        "silence_boost": silence_boost,
    }


def argon_ready(body: dict) -> dict:
    """Lignée prête pour conteneur Argon (taille + génotype + exports)."""
    body = body or {}
    gt = body.get("genotype") or cross(body).get("offspring", [{}])[0]
    drivers = body.get("drivers") or {}
    ph = phenotype(gt, drivers)
    from fruitfly_science.passerelles import export_argon_manifest

    return {
        "format": "fruitfly.genetics.argon_ready.v1",
        "phenotype": ph,
        "genotype": gt,
        "drivers": drivers,
        "argon": export_argon_manifest(body.get("run_id")),
        "container_scale": ph["argon_scale"],
        "note": "Échelle 3D = container_scale · validation wet-lab requise avant claim.",
    }


def _dominant_allele(locus: str) -> str:
    for l in (_catalog().get("loci") or []):
        if l["id"] == locus:
            return str(l["dominant"])
    return locus + "+"


def _recessif_allele(locus: str) -> str:
    for l in (_catalog().get("loci") or []):
        if l["id"] == locus:
            return str(l["recessif"])
    return locus
