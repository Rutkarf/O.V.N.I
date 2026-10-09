"""Export figures multi-panneaux (SVG) — raster + courbe + schéma."""

from __future__ import annotations

import html


def figure_essai_svg(payload: dict, courbe: list[dict] | None = None) -> str:
    card = payload.get("run_card") or {}
    raster = payload.get("raster") or []
    w, h = 920, 520
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
        '<rect width="100%" height="100%" fill="#f7f4ef"/>',
        f'<text x="24" y="28" font-family="Georgia,serif" font-size="16">'
        f'Essai {html.escape(str(card.get("run_id", ""))[:8])} — '
        f'{html.escape(str(card.get("action", "")))}</text>',
        '<text x="24" y="50" font-family="sans-serif" font-size="11" fill="#555">'
        "Panneau A : raster · B : schéma circuit · C : dose (si fournie)</text>",
    ]
    # A raster
    y0 = 70
    for i, row in enumerate(raster[:12]):
        y = y0 + i * 18
        nid = html.escape(str(row.get("neuron", "")))
        parts.append(f'<text x="24" y="{y + 4}" font-size="10" font-family="monospace">{nid}</text>')
        for t in (row.get("spikes_ms") or [])[:80]:
            x = 120 + float(t) * 0.6
            if x < 420:
                parts.append(f'<circle cx="{x:.1f}" cy="{y}" r="2" fill="#1a3a2a"/>')
    parts.append('<rect x="20" y="60" width="420" height="240" fill="none" stroke="#ccc"/>')
    # B schema simple
    parts.append('<rect x="470" y="60" width="420" height="240" fill="#fff" stroke="#ccc"/>')
    parts.append(
        f'<text x="490" y="90" font-size="12">Circuit {html.escape(str(card.get("circuit_id", "")))}</text>'
    )
    parts.append(
        f'<text x="490" y="120" font-size="11">Empreinte {html.escape(str(card.get("dataset_hash", "")))}</text>'
    )
    parts.append(
        f'<text x="490" y="150" font-size="11">Graine {html.escape(str(card.get("seed", "")))}</text>'
    )
    # C curve
    parts.append('<rect x="20" y="320" width="870" height="180" fill="#fff" stroke="#ccc"/>')
    if courbe:
        xs = [float(r.get("level", 0)) for r in courbe]
        ys = [float(r.get("p_escape", 0)) for r in courbe]
        if xs:
            xmin, xmax = min(xs), max(xs) or 1
            pts = []
            for x, y in zip(xs, ys):
                px = 40 + (x - xmin) / (xmax - xmin or 1) * 820
                py = 480 - y * 140
                pts.append(f"{px:.1f},{py:.1f}")
            parts.append(
                f'<polyline fill="none" stroke="#8b2e1a" stroke-width="2" points="{" ".join(pts)}"/>'
            )
            parts.append('<text x="40" y="340" font-size="11">p(fuite) vs niveau</text>')
    else:
        parts.append('<text x="40" y="360" font-size="11" fill="#888">Pas de courbe dose fournie</text>')
    parts.append("</svg>")
    return "\n".join(parts)
