#!/usr/bin/env python3
"""Worker fruitfly — sim toy + instrument scientifique LIF."""

from __future__ import annotations

import argparse
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
ENGINE_SRC = REPO / "packages" / "science-engine" / "src"
for path in (str(ENGINE_SRC), str(ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

from engine import Simulation
from science import service as science

_lock = threading.Lock()
_sim = Simulation(mode="rules")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"[worker] {args[0]}")

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code: int, payload) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _text(self, code: int, text: str, content_type: str) -> None:
        body = text.encode()
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode()) if raw else {}

    def _read_text(self) -> str:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return ""
        return self.rfile.read(length).decode()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path in ("/health", "/api/health"):
            self._json(200, {"status": "ok", "service": "fruitfly-worker", "science": True})
            return
        if path == "/api/state":
            with _lock:
                self._json(200, _sim.state())
            return

        # Instrument science
        if path == "/api/science/atlas":
            page = qs.get("page", [None])[0]
            self._json(
                200,
                science.atlas(
                    page=int(page) if page is not None else None,
                    taille=int(qs.get("taille", qs.get("size", ["50"]))[0]),
                    roi=qs.get("roi", [None])[0],
                    classe=qs.get("classe", qs.get("class", [None]))[0],
                ),
            )
            return
        if path == "/api/science/motifs":
            self._json(200, science.motifs())
            return
        if path == "/api/science/plateformes":
            self._json(200, science.plateformes())
            return
        if path == "/api/science/atlas/status":
            self._json(200, science.atlas_status())
            return
        if path == "/api/science/zenodo":
            self._json(200, science.zenodo_meta())
            return
        if path == "/api/science/organisms":
            self._json(200, science.organisms_registry())
            return
        if path == "/api/science/passerelles/maelstrom":
            run_id = qs.get("run_id", [None])[0]
            self._json(200, science.passerelle_maelstrom(run_id))
            return
        if path == "/api/science/passerelles/argon":
            run_id = qs.get("run_id", [None])[0]
            self._json(200, science.passerelle_argon(run_id))
            return
        if path == "/api/science/passerelles/pont-imagerie":
            run_id = qs.get("run_id", [None])[0]
            self._json(200, science.pont_imagerie(run_id))
            return
        if path == "/api/science/passerelles/clem":
            run_id = qs.get("run_id", [None])[0]
            self._json(200, science.export_clem(run_id))
            return
        if path == "/api/science/passerelles/pipeline":
            run_id = qs.get("run_id", [None])[0]
            self._json(200, science.export_pipeline(run_id))
            return
        if path == "/api/science/genetics/catalog":
            self._json(200, science.genetics_catalog_api())
            return
        if path == "/api/science/picsl/sample":
            self._json(200, science.picsl_sample_api())
            return
        if path == "/api/science/echelles":
            self._json(200, science.echelles_catalog_api())
            return
        if path == "/api/science/ovni/lifecycle":
            self._json(200, science.ovni_lifecycle_catalog_api())
            return
        if path == "/api/science/bridges/fiji":
            run_id = qs.get("run_id", [None])[0]
            self._json(200, science.bridge_fiji_api(run_id))
            return
        if path == "/api/science/bridges/napari":
            run_id = qs.get("run_id", [None])[0]
            self._json(200, science.bridge_napari_api(run_id))
            return
        if path == "/api/science/openapi.json":
            from pathlib import Path

            here = Path(__file__).resolve()
            # worker/server.py → root=parents[1] ; services/worker → root=parents[2]
            for root in (here.parents[1], here.parents[2]):
                p = root / "docs" / "api" / "openapi.json"
                if p.exists():
                    self._json(200, json.loads(p.read_text(encoding="utf-8")))
                    return
            self._json(200, {"openapi": "3.1.0", "info": {"title": "fruitfly", "version": "0.4.0"}})
            return
        if path == "/api/science/concordance":
            self._json(200, science.concordance())
            return
        if path == "/api/science/flywire":
            self._json(200, science.flywire_controle())
            return
        if path.startswith("/api/science/jobs/"):
            jid = path.rstrip("/").split("/")[-1]
            job = science.statut_job(jid)
            if job is None:
                self._json(404, {"error": "travail introuvable"})
                return
            self._json(200, job)
            return
        if path.startswith("/api/science/runs/") and path.endswith("/figure.svg"):
            run_id = path.split("/")[4]
            svg = science.figure(run_id)
            if svg is None:
                self._json(404, {"error": "essai introuvable"})
                return
            self._text(200, svg, "image/svg+xml; charset=utf-8")
            return
        if path == "/api/science/runs":
            limit = int(qs.get("limit", ["50"])[0])
            self._json(200, science.list_runs(limit=limit))
            return
        if path.startswith("/api/science/runs/") and path.endswith("/spikes.csv"):
            run_id = path.split("/")[4]
            csv_text = science.export_spikes_csv(run_id)
            if csv_text is None:
                self._json(404, {"error": "run not found"})
                return
            self._text(200, csv_text, "text/csv; charset=utf-8")
            return
        if path.startswith("/api/science/runs/") and path.endswith("/methods.md"):
            run_id = path.split("/")[4]
            md = science.export_methods(run_id)
            if md is None:
                self._json(404, {"error": "run not found"})
                return
            self._text(200, md, "text/markdown; charset=utf-8")
            return
        if path.startswith("/api/science/runs/"):
            run_id = path.rstrip("/").split("/")[-1]
            data = science.get_run(run_id)
            if data is None:
                self._json(404, {"error": "run not found"})
                return
            self._json(200, data)
            return
        if path == "/api/science/validate":
            self._json(200, science.validate_suite())
            return
        if path == "/api/science/adapters":
            self._json(200, science.get_adapters())
            return
        if path == "/api/science/voix/aide":
            self._json(200, science.voix_aide_api())
            return
        if path == "/api/science/voix/journal":
            limit = int(qs.get("limit", ["30"])[0])
            self._json(200, science.voix_journal_api(limit))
            return
        if path == "/api/science/voix/journal.md":
            limit = int(qs.get("limit", ["50"])[0])
            self._text(200, science.voix_journal_md_api(limit), "text/markdown; charset=utf-8")
            return

        self._json(404, {"error": "route inconnue"})

    def do_POST(self) -> None:  # noqa: N802
        global _sim
        path = urlparse(self.path).path

        if path == "/api/science/stimulate":
            try:
                body = self._read_json()
                self._json(200, science.stimulate(body))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/replay":
            try:
                self._json(200, science.replay_stimulate(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/validation/imagerie":
            try:
                self._json(200, science.validation_imagerie(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/batch":
            try:
                self._json(200, science.batch_stimulate(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/dose-response":
            try:
                self._json(200, science.dose_response(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/compare":
            try:
                self._json(200, science.compare_runs(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/adapters":
            try:
                self._json(200, science.save_adapters(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/adapters/reset":
            self._json(200, science.reset_adapters())
            return
        if path == "/api/science/upload/edges":
            try:
                text = self._read_text()
                mode = "motif"
                roi = None
                if text.strip().startswith("{"):
                    payload = json.loads(text)
                    csv_text = payload.get("csv", "")
                    mode = str(payload.get("mode") or "motif")
                    roi = payload.get("roi") or None
                    text = csv_text
                self._json(200, science.upload_edges_csv(text, mode=mode, roi=roi))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/circuit/reset":
            self._json(200, science.reset_circuit())
            return
        if path == "/api/science/motif":
            try:
                body = self._read_json()
                mid = str(body.get("motif_id") or body.get("id") or "")
                self._json(200, science.selectionner_motif(mid))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/jobs/dose":
            try:
                self._json(200, science.soumettre_dose(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/jobs/lot":
            try:
                self._json(200, science.soumettre_lot(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/passerelles/carte-genetique":
            try:
                self._json(200, science.carte_genetique(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/passerelles/journal-colonie":
            try:
                self._json(200, science.journal_colonie(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/passerelles/protocole":
            try:
                body = self._read_json()
                self._json(
                    200,
                    science.fiche_protocole(
                        str(body.get("outil_id") or ""),
                        body.get("run_id"),
                    ),
                )
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/genetics/cross":
            try:
                self._json(200, science.genetics_cross_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/genetics/edit":
            try:
                self._json(200, science.genetics_edit_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/genetics/kepler":
            try:
                self._json(200, science.genetics_kepler_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/genetics/phenotype":
            try:
                self._json(200, science.genetics_phenotype_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/genetics/argon-ready":
            try:
                self._json(200, science.genetics_argon_ready_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/genetics/drivers":
            try:
                self._json(200, science.genetics_drivers_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/argon/doi":
            try:
                self._json(200, science.argon_doi_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/rocrate":
            try:
                self._json(200, science.rocrate_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/gpu-sweep":
            try:
                self._json(200, science.gpu_sweep_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/opto/curve":
            try:
                self._json(200, science.opto_curve_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/echelles/resolve":
            try:
                self._json(200, science.echelles_resolve_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/ovni/birth":
            try:
                self._json(200, science.ovni_birth_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/ovni/advance":
            try:
                self._json(200, science.ovni_advance_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/voix/fiche":
            try:
                self._json(200, science.voix_fiche_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/voix/lexique":
            try:
                self._json(200, science.voix_lexique_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/voix/gabarit":
            try:
                self._json(200, science.voix_gabarit_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/voix/dialoguer":
            try:
                self._json(200, science.voix_dialoguer_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/voix/verify":
            try:
                self._json(200, science.voix_verify_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/voix/stimulate":
            try:
                self._json(200, science.voix_stimulate_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return
        if path == "/api/science/voix/replay":
            try:
                self._json(200, science.voix_replay_api(self._read_json()))
            except Exception as exc:  # noqa: BLE001
                self._json(400, {"error": str(exc)})
            return

        try:
            data = self._read_json()
        except json.JSONDecodeError:
            self._json(400, {"error": "JSON invalide"})
            return

        if path == "/api/reset":
            with _lock:
                mode = data.get("mode", _sim.mode)
                seed = data.get("seed")
                _sim = Simulation(seed=seed, mode=mode)
                self._json(200, _sim.state())
            return
        if path == "/api/tick":
            with _lock:
                if data.get("mode") in ("rules", "fruitfly"):
                    _sim.mode = data["mode"]
                self._json(200, _sim.tick())
            return
        if path == "/api/mode":
            with _lock:
                mode = data.get("mode", "rules")
                if mode not in ("rules", "fruitfly"):
                    self._json(400, {"error": "mode invalide"})
                    return
                _sim.mode = mode
                self._json(200, _sim.state())
            return

        self._json(404, {"error": "route inconnue"})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"fruitfly worker → http://{args.host}:{args.port}")
    print("science: /api/science/atlas|stimulate|runs|validate")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt.")
        server.server_close()


if __name__ == "__main__":
    main()
