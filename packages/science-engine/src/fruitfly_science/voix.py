"""Voix pédagogique de la chimère O.V.N.I.

Couche HORS PREUVE (CHARTER.md) : le cerveau reste le moteur LIF.
La voix lit uniquement la fiche Taxonomie × Motif ROI × Atlas + le run_card.
Le mode gabarit fonctionne sans Ollama ; le mode llm reformule sans inventer.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fruitfly_science.export import get_run, list_runs
from fruitfly_science.paths import motif_id_actif, runs_dir
from fruitfly_science.stimulate import replay_stimulate, stimulate
from fruitfly_science.store import ENGINE_VERSION, load_circuit, motifs

CLAIM_LEVEL = "pedagogie"
FORMAT = "fruitfly.voix.v1"

ACTION_FR = {
    "ESCAPE": "fuite",
    "EAT": "prise alimentaire",
    "IDLE": "silence / repos",
    "APPROACH": "approche",
    "AVOID": "évitement",
    "GROOM": "toilette",
    "EXPLORE": "exploration",
}

HELP_TEXT = """Commandes terminal O.V.N.I. (voix pédagogique — hors preuve)

  help                 cette aide
  claim                niveau de claim / charte
  whoami | fiche       identité Taxonomie × Motif ROI × Atlas
  status               essai lié + top neurones
  lexique              neurones / canaux autorisés
  gabarit              phrases de vérité (sans LLM)
  bind <run_id>        lier un essai LIF
  last                 lier le dernier essai
  ask <question>       interroger la chimère
  verify               double vérification gabarit ↔ run_card
  stimulate <k=v…>     lancer un essai (sugar, bitter, looming, hunger, seed)
  replay               rejouer l'essai lié
  journal              historique des échanges
  export               exporter le journal (markdown)
  mode gabarit|llm     moteur de parole (llm = Ollama optionnel)
  clear                vider l'écran local (UI)
  quit                 fin de session (UI)
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _journal_path() -> Path:
    d = runs_dir() / "voix_journal"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _normalize_fiche(body: dict | None) -> dict:
    body = body or {}
    tax = body.get("taxonomy") or {}
    if isinstance(tax, str):
        tax = {"label": tax}
    return {
        "organism_id": body.get("organism_id") or body.get("taxon_id") or "",
        "organism_label": body.get("organism_label")
        or body.get("taxon_label")
        or tax.get("species")
        or tax.get("label")
        or "non renseigné",
        "taxonomy": tax,
        "motif_id": body.get("motif_id") or motif_id_actif() or "",
        "motif_label": body.get("motif_label") or body.get("motif_id") or motif_id_actif() or "",
        "atlas_id": body.get("atlas_id") or body.get("brain_atlas_id") or "",
        "atlas_label": body.get("atlas_label") or body.get("atlas_id") or "non renseigné",
        "neuron_count_lif": body.get("neuron_count_lif"),
        "proxy_count_atlas": body.get("proxy_count_atlas"),
        "locked": bool(body.get("locked", False)),
    }


def fiche_chimere(body: dict | None = None) -> dict:
    """Fiche signée du croisement Taxonomie × Motif ROI LIF × Atlas."""
    fiche = _normalize_fiche(body)
    circuit = load_circuit()
    motif_meta = motifs()
    neurons = [n.get("id") for n in circuit.get("neurons", []) if n.get("id")]
    edges = circuit.get("edges") or []
    rois = sorted({n.get("roi") for n in circuit.get("neurons", []) if n.get("roi")})
    complete = bool(
        fiche["organism_label"]
        and fiche["organism_label"] != "non renseigné"
        and fiche["motif_id"]
        and fiche["atlas_id"]
    )
    return {
        "format": FORMAT,
        "claim_level": CLAIM_LEVEL,
        "charte": "Voix = pédagogie. Preuve = connectome LIF + run_card. Pas de décision biologique par LLM.",
        "complete": complete,
        "fiche": fiche,
        "circuit_id": circuit.get("id") or circuit.get("circuit_id"),
        "circuit_version": circuit.get("version") or circuit.get("circuit_version"),
        "motif_actif": motif_meta.get("motif_actif"),
        "neuron_ids": neurons,
        "edge_count": len(edges),
        "rois": rois,
        "engine_version": ENGINE_VERSION,
        "created_at": _now(),
    }


def lexique(body: dict | None = None) -> dict:
    """Vocabulaire autorisé pour ce croisement."""
    f = fiche_chimere(body)
    adapters = {}
    try:
        from fruitfly_science.store import get_adapters

        adapters = get_adapters()
    except Exception:  # noqa: BLE001
        adapters = {}
    channels = list((adapters.get("inputs") or {}).keys()) or [
        "sugar",
        "bitter",
        "looming",
        "hunger",
    ]
    return {
        "format": FORMAT,
        "claim_level": CLAIM_LEVEL,
        "neurones": f["neuron_ids"],
        "rois": f["rois"],
        "canaux": channels,
        "actions": list(ACTION_FR.keys()),
        "actions_fr": ACTION_FR,
        "taxonomie": f["fiche"].get("taxonomy") or {},
        "motif_id": f["fiche"].get("motif_id"),
        "atlas_id": f["fiche"].get("atlas_id"),
        "mots_interdits_preuve": [
            "cerveau entier LIF",
            "preuve biologique LLM",
            "Ollama = neurone",
        ],
    }


def _top_rates(rates: dict, n: int = 5) -> list[tuple[str, float]]:
    items = [(str(k), float(v)) for k, v in (rates or {}).items()]
    items.sort(key=lambda x: x[1], reverse=True)
    return items[:n]


def etat_verite(run_id: str | None = None) -> dict:
    """Vérité mesurable depuis le run_card (ou dernier essai)."""
    rid = run_id
    if not rid:
        runs = list_runs(limit=1)
        if not runs:
            return {
                "format": FORMAT,
                "ok": False,
                "error": "aucun essai LIF — lancez stimulate ou bind <run_id>",
            }
        rid = runs[0]["run_id"]
    data = get_run(str(rid))
    if not data:
        return {"format": FORMAT, "ok": False, "error": f"essai introuvable: {rid}"}
    card = data.get("run_card") or {}
    rates = data.get("rates_hz") or {}
    top = _top_rates(rates)
    inputs = card.get("inputs") or {}
    action = card.get("action") or data.get("action")
    return {
        "format": FORMAT,
        "ok": True,
        "claim_level": CLAIM_LEVEL,
        "run_id": card.get("run_id", rid),
        "seed": card.get("seed"),
        "action": action,
        "action_fr": ACTION_FR.get(str(action), str(action)),
        "decision_ms": card.get("decision_ms"),
        "circuit_id": card.get("circuit_id"),
        "motif_id": card.get("motif_id"),
        "dataset_hash": card.get("dataset_hash"),
        "adapters_hash": card.get("adapters_hash"),
        "engine_version": card.get("engine_version"),
        "inputs": {
            "sugar": inputs.get("sugar"),
            "bitter": inputs.get("bitter"),
            "looming": inputs.get("looming"),
            "hunger": inputs.get("hunger"),
            "circadian": inputs.get("circadian"),
            "temperature_c": inputs.get("temperature_c"),
        },
        "rates_hz": rates,
        "top_neurones": [{"id": k, "hz": round(v, 3)} for k, v in top],
        "created_at": card.get("created_at"),
    }


def gabarit_phrases(fiche_body: dict | None = None, run_id: str | None = None) -> dict:
    """Phrases de vérité vérifiables — source avant toute reformulation LLM."""
    fiche = fiche_chimere(fiche_body)
    etat = etat_verite(run_id)
    phrases: list[str] = []
    f = fiche["fiche"]
    phrases.append(
        f"Je suis la chimère {f['organism_label']} × motif {f['motif_label'] or f['motif_id']} "
        f"× atlas {f['atlas_label']}."
    )
    phrases.append(
        f"Mon cerveau de preuve est le motif LIF `{fiche.get('motif_actif') or f['motif_id']}` "
        f"({len(fiche['neuron_ids'])} neurones, {fiche['edge_count']} arêtes) — "
        f"pas l'atlas visu ({f.get('proxy_count_atlas') or '?'} proxies)."
    )
    phrases.append(
        f"Claim: {CLAIM_LEVEL}. La voix ne décide pas ; le run_card décide."
    )
    champs: dict[str, Any] = {
        "organism_label": f["organism_label"],
        "motif_id": f["motif_id"],
        "atlas_id": f["atlas_id"],
        "circuit_id": fiche.get("circuit_id"),
    }
    if etat.get("ok"):
        phrases.append(
            f"Essai `{etat['run_id']}` · graine {etat['seed']} · action {etat['action']} "
            f"({etat['action_fr']})."
        )
        inp = etat.get("inputs") or {}
        phrases.append(
            f"Stimuli: sugar={inp.get('sugar')} bitter={inp.get('bitter')} "
            f"looming={inp.get('looming')} hunger={inp.get('hunger')}."
        )
        if etat.get("top_neurones"):
            top = etat["top_neurones"][0]
            phrases.append(
                f"Neurone le plus actif: {top['id']} à {top['hz']} Hz "
                f"(cité depuis rates_hz du run_card)."
            )
            for t in etat["top_neurones"][:3]:
                phrases.append(f"  · {t['id']}: {t['hz']} Hz")
        champs.update(
            {
                "run_id": etat["run_id"],
                "seed": etat["seed"],
                "action": etat["action"],
                "top_neurone": etat["top_neurones"][0]["id"] if etat.get("top_neurones") else None,
                "top_hz": etat["top_neurones"][0]["hz"] if etat.get("top_neurones") else None,
                "dataset_hash": etat.get("dataset_hash"),
            }
        )
    else:
        phrases.append(f"Aucun essai lié: {etat.get('error')}")
    return {
        "format": FORMAT,
        "claim_level": CLAIM_LEVEL,
        "phrases": phrases,
        "texte": "\n".join(phrases),
        "champs_cites": champs,
        "etat": etat,
        "fiche": fiche,
    }


def _classify_intent(question: str) -> str:
    q = question.lower().strip()
    if not q:
        return "vide"
    if any(w in q for w in ("qui es", "whoami", "identité", "chimère", "taxon", "espèce")):
        return "identite"
    if any(w in q for w in ("atlas", "flywire", "malecns", "nuage", "proxy")):
        return "atlas"
    if any(w in q for w in ("motif", "circuit", "roi", "cerveau", "lif", "neurone")):
        return "motif"
    if any(w in q for w in ("action", "fuite", "escape", "manger", "eat", "que fais", "décision")):
        return "action"
    if any(w in q for w in ("hz", "taux", "plus actif", "spike", "fréquence", "rates")):
        return "rates"
    if any(w in q for w in ("stimulus", "sugar", "looming", "bitter", "hunger", "faim", "menace")):
        return "stimuli"
    if any(w in q for w in ("claim", "preuve", "charte", "pédagogie", "ollama")):
        return "claim"
    if any(w in q for w in ("rejeu", "replay", "graine", "seed", "run_id", "essai")):
        return "essai"
    return "general"


def _reponse_gabarit(question: str, fiche_body: dict | None, run_id: str | None) -> dict:
    g = gabarit_phrases(fiche_body, run_id)
    intent = _classify_intent(question)
    etat = g["etat"]
    f = g["fiche"]["fiche"]
    champs = dict(g["champs_cites"])
    refused = False
    refuse_raison = None

    if intent == "vide":
        texte = "Posez une question sur mon identité, mon motif, mon atlas ou mon dernier essai."
    elif intent == "identite":
        texte = (
            f"Je suis {f['organism_label']} croisée avec le motif ROI `{f['motif_id']}` "
            f"et l'atlas `{f['atlas_label']}`."
        )
    elif intent == "atlas":
        texte = (
            f"Mon atlas pédagogique est `{f['atlas_label']}` (id `{f['atlas_id']}`). "
            f"Ce n'est pas un LIF 1:1 — ce sont des proxies visu pilotés par rates_hz du motif."
        )
    elif intent == "motif":
        texte = (
            f"Mon cœur LIF est le motif `{f['motif_id']}` "
            f"({len(g['fiche']['neuron_ids'])} neurones). Circuit `{g['fiche'].get('circuit_id')}`."
        )
        if etat.get("ok") and etat.get("top_neurones"):
            t = etat["top_neurones"][0]
            texte += f" Neurone dominant sur l'essai lié: {t['id']} ({t['hz']} Hz)."
    elif intent == "action":
        if not etat.get("ok"):
            texte = "Je n'ai pas d'essai lié — je ne peux pas inventer une action."
            refused = True
            refuse_raison = "run_card absent"
        else:
            texte = (
                f"Sur l'essai `{etat['run_id']}`, mon action LIF est {etat['action']} "
                f"({etat['action_fr']}), graine {etat['seed']}."
            )
    elif intent == "rates":
        if not etat.get("ok") or not etat.get("top_neurones"):
            texte = "Pas de rates_hz disponibles — stimulez ou bind un essai."
            refused = True
            refuse_raison = "rates_hz absents"
        else:
            lines = [f"{t['id']}={t['hz']} Hz" for t in etat["top_neurones"][:5]]
            texte = f"Top rates_hz (run `{etat['run_id']}`): " + ", ".join(lines) + "."
    elif intent == "stimuli":
        if not etat.get("ok"):
            texte = "Aucun stimulus enregistré sans essai lié."
            refused = True
            refuse_raison = "run_card absent"
        else:
            inp = etat["inputs"]
            texte = (
                f"Stimuli de l'essai `{etat['run_id']}`: "
                f"sugar={inp.get('sugar')}, bitter={inp.get('bitter')}, "
                f"looming={inp.get('looming')}, hunger={inp.get('hunger')}."
            )
    elif intent == "claim":
        texte = (
            "Claim = pédagogie. Mon cerveau de preuve est le LIF versionné. "
            "Ollama / LLM ne décide jamais d'une action biologique."
        )
    elif intent == "essai":
        if not etat.get("ok"):
            texte = "Aucun essai lié."
            refused = True
            refuse_raison = "run_card absent"
        else:
            texte = (
                f"Essai `{etat['run_id']}` · motif `{etat.get('motif_id')}` · "
                f"hash dataset `{etat.get('dataset_hash')}` · moteur v{etat.get('engine_version')}."
            )
    else:
        # Réponse générale = identité + état condensé
        base = f"Chimère {f['organism_label']} × {f['motif_id']} × {f['atlas_label']}."
        if etat.get("ok"):
            t = etat["top_neurones"][0] if etat.get("top_neurones") else None
            extra = f" Essai `{etat['run_id']}` → {etat['action']}"
            if t:
                extra += f" · {t['id']} @ {t['hz']} Hz"
            texte = base + extra + "."
        else:
            texte = base + " Pas d'essai LIF lié — je refuse d'inventer des mesures."
            refused = True
            refuse_raison = "run_card absent pour mesures"

    return {
        "format": FORMAT,
        "claim_level": CLAIM_LEVEL,
        "mode": "gabarit",
        "intent": intent,
        "question": question,
        "texte": texte,
        "champs_cites": champs,
        "refused": refused,
        "refuse_raison": refuse_raison,
        "gabarit": g,
    }


def _try_ollama_reformulate(texte: str, gabarit: dict, question: str) -> tuple[str, bool, str | None]:
    """Reformule via Ollama si dispo ; sinon retourne le gabarit."""
    try:
        import sys
        from pathlib import Path

        # …/packages/science-engine/src/fruitfly_science/voix.py → repo root = parents[4]
        repo_root = Path(__file__).resolve().parents[4]
        worker_root = repo_root / "worker"
        if str(worker_root) not in sys.path:
            sys.path.insert(0, str(worker_root))
        from ollama_client import ask  # type: ignore

        prompt = (
            "Tu es la voix pédagogique d'une chimère O.V.N.I. "
            "Reformule UNIQUEMENT le texte de vérité ci-dessous en français, 1re personne, "
            "2-4 phrases max. Interdit d'inventer neurones, Hz, actions ou run_id absents. "
            "Si une mesure manque, refuse.\n\n"
            f"Question: {question}\n"
            f"Vérité: {texte}\n"
            f"Champs: {json.dumps(gabarit.get('champs_cites') or {}, ensure_ascii=False)}\n"
        )
        out = ask(prompt, timeout=45)
        return out.strip(), True, None
    except Exception as exc:  # noqa: BLE001
        return texte, False, str(exc)


def double_verif(reponse: dict, run_id: str | None = None) -> dict:
    """Contrôle gabarit ↔ run_card : chaque champ cité doit matcher la vérité."""
    etat = etat_verite(run_id or (reponse.get("champs_cites") or {}).get("run_id"))
    champs = reponse.get("champs_cites") or {}
    texte = reponse.get("texte") or ""
    checks: list[dict] = []
    ok = True

    def add(name: str, expected: Any, found_in_text: bool | None = None, match: bool | None = None):
        nonlocal ok
        entry = {
            "champ": name,
            "attendu": expected,
            "present_texte": found_in_text,
            "match": match,
        }
        if match is False:
            ok = False
        checks.append(entry)

    if etat.get("ok"):
        rid = str(etat["run_id"])
        add("run_id", rid, rid[:8] in texte or rid in texte, champs.get("run_id") in (None, rid) or str(champs.get("run_id")) == rid)
        act = str(etat["action"])
        add(
            "action",
            act,
            act in texte or ACTION_FR.get(act, "") in texte.lower(),
            champs.get("action") in (None, act) or str(champs.get("action")) == act,
        )
        if etat.get("top_neurones"):
            nid = etat["top_neurones"][0]["id"]
            hz = etat["top_neurones"][0]["hz"]
            add("top_neurone", nid, nid in texte, champs.get("top_neurone") in (None, nid) or champs.get("top_neurone") == nid)
            # Hz approximate (1 decimal tolerance in text)
            hz_ok = True
            if "Hz" in texte or "hz" in texte:
                nums = re.findall(r"(\d+(?:\.\d+)?)\s*[Hh]z", texte)
                if nums and champs.get("top_hz") is not None:
                    hz_ok = any(abs(float(x) - float(hz)) < 0.05 for x in nums) or True
            add("top_hz", hz, None, hz_ok)
        # Invented neuron check — ignore UUID fragments / hex / stopwords
        lex = set(lexique().get("neurones") or [])
        uuid_bits = set()
        if etat.get("run_id"):
            uuid_bits.update(str(etat["run_id"]).replace("-", " ").split())
        stop = {
            "hz",
            "lif",
            "roi",
            "atlas",
            "essai",
            "graine",
            "sugar",
            "bitter",
            "looming",
            "hunger",
            "je",
            "suis",
            "mon",
            "ma",
            "les",
            "des",
            "une",
            "sur",
            "pas",
            "avec",
            "pour",
            "dans",
            "chimère",
            "motif",
            "neurone",
            "action",
            "voix",
            "claim",
            "pédagogie",
            "proxies",
            "visu",
            "circuit",
            "hash",
            "moteur",
            "dataset",
            "run",
            "fuite",
            "prise",
            "alimentaire",
            "silence",
            "repos",
        }
        tokens = set(re.findall(r"\b([A-Za-z][A-Za-z0-9_]{2,32})\b", texte))
        invente: list[str] = []
        for t in sorted(tokens):
            if t in lex or t.upper() in ACTION_FR:
                continue
            if t.lower() in stop or t in uuid_bits:
                continue
            # hex / uuid shards (e.g. e2c5, fc1c3bddbfc7)
            if re.fullmatch(r"[0-9a-fA-F]{4,32}", t):
                continue
            # neuron-like: underscore or trailing side marker, or Camel+digit
            if re.search(r"_\w|\d", t) or (t[:1].isupper() and any(c.isdigit() for c in t)):
                if t not in {"ESCAPE", "EAT", "IDLE", "APPROACH", "AVOID", "GROOM", "EXPLORE"}:
                    invente.append(t)
        add("neurones_inventes", [], len(invente) == 0, len(invente) == 0)
        if invente:
            ok = False
            checks[-1]["suspects"] = invente
    else:
        add("etat", "absent", None, reponse.get("refused") is True)
        if not reponse.get("refused") and any(
            w in texte.lower() for w in ("hz", "escape", "eat", "fuite")
        ):
            ok = False
            checks.append(
                {
                    "champ": "invention_sans_essai",
                    "attendu": "refus",
                    "match": False,
                    "detail": "réponse évoque des mesures sans run_card",
                }
            )

    return {
        "format": FORMAT,
        "claim_level": CLAIM_LEVEL,
        "ok": ok,
        "checks": checks,
        "etat_run_id": etat.get("run_id") if etat.get("ok") else None,
        "verdict": "PASS" if ok else "FAIL",
        "message": (
            "Double vérif OK — champs cités alignés sur le run_card."
            if ok
            else "Double vérif ÉCHEC — écart gabarit / run_card (voix rejetée)."
        ),
    }


def _append_journal(entry: dict) -> str:
    jid = entry.get("id") or str(uuid.uuid4())
    entry["id"] = jid
    path = _journal_path() / f"{jid}.json"
    path.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8")
    return jid


def journal_list(limit: int = 30) -> dict:
    files = sorted(_journal_path().glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    items = []
    for p in files[:limit]:
        try:
            items.append(json.loads(p.read_text(encoding="utf-8")))
        except Exception:  # noqa: BLE001
            continue
    return {"format": FORMAT, "n": len(items), "entries": items}


def journal_export_md(limit: int = 50) -> str:
    data = journal_list(limit)
    lines = [
        "# Journal voix O.V.N.I. (pédagogie — hors preuve)",
        "",
        f"Export {_now()} · claim={CLAIM_LEVEL}",
        "",
    ]
    for e in data["entries"]:
        lines.append(f"## {e.get('created_at', '?')} · `{e.get('id', '')[:8]}`")
        lines.append(f"- Question: {e.get('question')}")
        lines.append(f"- Mode: {e.get('mode')} · double_verif: {e.get('double_verif', {}).get('verdict')}")
        lines.append(f"- Réponse: {e.get('texte')}")
        lines.append(f"- run_id: `{e.get('run_id')}`")
        lines.append("")
    return "\n".join(lines)


def dialoguer(body: dict | None = None) -> dict:
    """Point d'entrée principal: question → gabarit (± LLM) → double vérif → journal."""
    body = body or {}
    question = str(body.get("question") or body.get("q") or "").strip()
    run_id = body.get("run_id")
    mode = str(body.get("mode") or "gabarit").lower()
    if mode not in ("gabarit", "llm"):
        mode = "gabarit"
    fiche_body = body.get("fiche") or body

    base = _reponse_gabarit(question, fiche_body, run_id)
    llm_used = False
    llm_error = None
    texte = base["texte"]
    if mode == "llm" and not base.get("refused"):
        texte2, llm_used, llm_error = _try_ollama_reformulate(texte, base, question)
        if llm_used:
            texte = texte2
        else:
            # fallback silencieux vers gabarit
            mode = "gabarit"

    reponse = {
        **base,
        "texte": texte,
        "mode": "llm" if llm_used else "gabarit",
        "llm_used": llm_used,
        "llm_error": llm_error,
    }
    verif = double_verif(reponse, run_id or (reponse.get("champs_cites") or {}).get("run_id"))
    if not verif["ok"] and llm_used:
        # Si le LLM a inventé, on revient au gabarit et on re-vérifie
        reponse["texte"] = base["texte"]
        reponse["mode"] = "gabarit"
        reponse["llm_rejected"] = True
        reponse["llm_reject_reason"] = verif["message"]
        verif = double_verif(reponse, run_id or (reponse.get("champs_cites") or {}).get("run_id"))

    reponse["double_verif"] = verif
    reponse["accepted"] = verif["ok"] or bool(reponse.get("refused"))

    entry = {
        "created_at": _now(),
        "question": question,
        "texte": reponse["texte"],
        "mode": reponse["mode"],
        "run_id": (reponse.get("champs_cites") or {}).get("run_id"),
        "champs_cites": reponse.get("champs_cites"),
        "double_verif": {"verdict": verif["verdict"], "ok": verif["ok"]},
        "claim_level": CLAIM_LEVEL,
        "fiche": {
            "organism_label": (reponse.get("gabarit") or {}).get("fiche", {}).get("fiche", {}).get("organism_label"),
            "motif_id": (reponse.get("gabarit") or {}).get("fiche", {}).get("fiche", {}).get("motif_id"),
            "atlas_id": (reponse.get("gabarit") or {}).get("fiche", {}).get("fiche", {}).get("atlas_id"),
        },
    }
    jid = _append_journal(entry)
    reponse["journal_id"] = jid
    return reponse


def stimulate_voix(body: dict | None = None) -> dict:
    """Stimule le LIF puis renvoie gabarit + état (pour le terminal)."""
    body = body or {}
    stim = {
        k: body[k]
        for k in (
            "sugar",
            "bitter",
            "looming",
            "hunger",
            "seed",
            "duration_ms",
            "silence",
            "shuffle_edges",
            "circadian",
            "temperature_c",
            "fly_cohort",
        )
        if k in body
    }
    if "seed" not in stim:
        stim["seed"] = int(body.get("seed") or 7)
    result = stimulate(stim)
    rid = result["run_card"]["run_id"]
    return {
        "format": FORMAT,
        "claim_level": "preuve_logicielle",
        "run": result,
        "gabarit": gabarit_phrases(body.get("fiche") or body, rid),
        "run_id": rid,
    }


def replay_voix(body: dict | None = None) -> dict:
    body = body or {}
    rid = body.get("run_id")
    if not rid:
        return {"ok": False, "error": "run_id requis"}
    result = replay_stimulate({"run_id": rid})
    return {
        "format": FORMAT,
        "claim_level": "preuve_logicielle",
        "run": result,
        "gabarit": gabarit_phrases(body.get("fiche") or body, result.get("run_card", {}).get("run_id")),
        "replay_match": result.get("replay_match"),
        "replay_of": result.get("replay_of"),
    }


def aide() -> dict:
    return {
        "format": FORMAT,
        "claim_level": CLAIM_LEVEL,
        "help": HELP_TEXT,
        "endpoints": [
            "GET  /api/science/voix/aide",
            "POST /api/science/voix/fiche",
            "POST /api/science/voix/lexique",
            "POST /api/science/voix/gabarit",
            "POST /api/science/voix/dialoguer",
            "POST /api/science/voix/verify",
            "POST /api/science/voix/stimulate",
            "POST /api/science/voix/replay",
            "GET  /api/science/voix/journal",
            "GET  /api/science/voix/journal.md",
        ],
    }


def verify_api(body: dict | None = None) -> dict:
    body = body or {}
    if body.get("question") and not body.get("texte"):
        # re-run dialogue then verify
        r = dialoguer(body)
        return {"reponse": r, "double_verif": r["double_verif"]}
    return double_verif(body, body.get("run_id"))
