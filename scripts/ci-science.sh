#!/usr/bin/env bash
# CI science : essais dorés + validate_suite (sans Spring/Angular).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export FRUITFLY_DATASETS="$ROOT/packages/science-datasets"
export FRUITFLY_RUNTIME="${TMPDIR:-/tmp}/fruitfly-ci-runtime-$$"
mkdir -p "$FRUITFLY_RUNTIME"
cleanup() { rm -rf "$FRUITFLY_RUNTIME"; }
trap cleanup EXIT

export PYTHONPATH="$ROOT/packages/science-engine/src${PYTHONPATH:+:$PYTHONPATH}"

echo "[ci-science] essais dorés"
python3 "$ROOT/tests/science/test_golden_escape_feed.py"

echo "[ci-science] validate_suite"
python3 - <<'PY'
from fruitfly_science.service import validate_suite, selectionner_motif
for mid in (
    "escape_feed_v1",
    "vision_menace_v1",
    "gout_alimentation_v1",
    "malecns_roi_fuite_lop_v1",
    "flywire_roi_fuite_lop_v1",
):
    r = validate_suite(mid)
    assert r["passed"], r
    print("ok", mid, r["engine_version"])
selectionner_motif("malecns_roi_fuite_lop_v1")
from fruitfly_science.passerelles import carte_genetique
c = carte_genetique({"outil": "CRISPR 2 / Cas12a", "ligne": "test"})
assert c["famille"] == "CRISPR2", c
print("ok crispr2", c["famille"])
PY

echo "[ci-science] environnement / replay"
python3 "$ROOT/tests/science/test_environnement_replay.py"

echo "[ci-science] voix chimère (pédagogie)"
python3 "$ROOT/tests/science/test_voix_chimere.py"

echo "[ci-science] publication P0/P1"
python3 "$ROOT/tests/science/test_publication_p0.py"

echo "[ci-science] instantané publication"
python3 "$ROOT/scripts/instantane_doi.py" >/dev/null

echo "[ci-science] réussi"
