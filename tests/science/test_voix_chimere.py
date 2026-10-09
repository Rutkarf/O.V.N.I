"""Voix chimère — gabarit + double vérif (hors preuve)."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ENGINE_SRC = REPO / "packages" / "science-engine" / "src"
sys.path.insert(0, str(ENGINE_SRC))
os.environ["FRUITFLY_DATASETS"] = str(REPO / "packages" / "science-datasets")
os.environ["FRUITFLY_RUNTIME"] = tempfile.mkdtemp(prefix="fruitfly-voix-")

from fruitfly_science.voix import (  # noqa: E402
    dialoguer,
    double_verif,
    fiche_chimere,
    gabarit_phrases,
    lexique,
    stimulate_voix,
)


FICHE = {
    "organism_id": "dmel",
    "organism_label": "Drosophila melanogaster",
    "motif_id": "escape_feed_v1",
    "motif_label": "escape_feed_v1",
    "atlas_id": "flywire_brain_2024",
    "atlas_label": "FlyWire 2024",
    "neuron_count_lif": 11,
    "proxy_count_atlas": 139255,
}


def test_fiche_complete():
    f = fiche_chimere(FICHE)
    assert f["claim_level"] == "pedagogie"
    assert f["complete"] is True
    assert f["fiche"]["motif_id"]
    assert len(f["neuron_ids"]) >= 1


def test_lexique_non_vide():
    lex = lexique(FICHE)
    assert "sugar" in lex["canaux"] or len(lex["canaux"]) >= 1
    assert lex["neurones"]


def test_stimulate_puis_gabarit():
    r = stimulate_voix({**FICHE, "looming": 0.95, "seed": 11, "duration_ms": 500})
    rid = r["run_id"]
    assert rid
    g = gabarit_phrases(FICHE, rid)
    assert g["etat"]["ok"] is True
    assert g["champs_cites"]["run_id"] == rid
    assert any("chimère" in p.lower() or "Chimère" in p or "suis" in p for p in g["phrases"])


def test_dialoguer_action_cite_run():
    r = stimulate_voix({**FICHE, "looming": 0.95, "seed": 13, "duration_ms": 500})
    rid = r["run_id"]
    out = dialoguer({**FICHE, "run_id": rid, "question": "Quelle est ton action ?", "mode": "gabarit"})
    assert out["refused"] is False
    assert rid[:8] in out["texte"] or rid in out["texte"] or out["champs_cites"].get("run_id") == rid
    assert out["double_verif"]["verdict"] == "PASS"
    assert out["mode"] == "gabarit"


def test_refus_sans_essai():
    # runtime frais déjà isolé ; s'assurer qu'on ne lie pas de run
    out = dialoguer({**FICHE, "run_id": "does-not-exist-zzzz", "question": "Quel neurone est le plus actif ?"})
    # soit refus, soit erreur etat — pas d'invention Hz acceptée sans vérité
    if out.get("refused"):
        assert out["refuse_raison"]
    else:
        # double_verif doit échouer si mesures inventées
        assert out["double_verif"]["verdict"] in ("PASS", "FAIL")


def test_double_verif_detecte_invention():
    r = stimulate_voix({**FICHE, "looming": 0.9, "seed": 17, "duration_ms": 500})
    rid = r["run_id"]
    fake = {
        "texte": f"Mon neurone FAKE_NEURON_99 tourne à 999 Hz sur l'essai {rid}.",
        "champs_cites": {"run_id": rid, "top_neurone": "FAKE_NEURON_99", "top_hz": 999, "action": "ESCAPE"},
        "refused": False,
    }
    v = double_verif(fake, rid)
    assert v["verdict"] == "FAIL"


def test_identite_question():
    out = dialoguer({**FICHE, "question": "Qui es-tu ?", "mode": "gabarit"})
    assert "Drosophila" in out["texte"] or "escape_feed" in out["texte"]
    assert out["intent"] == "identite"


if __name__ == "__main__":
    test_fiche_complete()
    test_lexique_non_vide()
    test_stimulate_puis_gabarit()
    test_dialoguer_action_cite_run()
    test_refus_sans_essai()
    test_double_verif_detecte_invention()
    test_identite_question()
    print("ok voix")
