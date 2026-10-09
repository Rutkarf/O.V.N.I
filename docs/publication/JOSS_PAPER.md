# JOSS / eLife Tools — draft paper (software)

**Title:** O.V.N.I. (Organisme Vivant Numérique Intelligent): a reproducible integrate-and-fire instrument for *Drosophila* circuit protocols

**Authors:** IBDML / Luminy (to complete)

## Summary

O.V.N.I. is an open laboratory instrument that runs seedable leaky integrate-and-fire (LIF) simulations on versioned connectome motifs, with run cards, adapters, replay, dose–response, imaging validation bridges (PiCsL), and FAIR exports (Argon, RO-Crate, Zenodo).

## Statement of need

Circuit hypotheses on MaleCNS / FlyWire subgraphs need a **protocol layer**: declared sensory adapters, bit-identical replay, and exportable Methods — without conflating 3D pedagogy with proof.

## Features (software paper scope)

- Deterministic LIF + `run_card` fingerprints  
- neuPrint/FlyWire ROI import (`export_neuprint` claim)  
- PiCsL observation schema + χ² validation  
- Argon DOI manifest + RO-Crate 1.1  
- OpenAPI 3.1, JWT auth, optional OIDC profile  
- Angular lab UI with **Methods-only** mode  

## Installation

See root `README.md`. Auth: `lab@luminy.local` / `motdepasse12` (change in production).

## Example

```python
from fruitfly import FruitflyClient
ff = FruitflyClient()
ff.login("lab@luminy.local", "motdepasse12")
r = ff.dose_response(channel="looming", levels=[0, 0.5, 1.0], repeats=5)
```

## References

- MaleCNS / FlyWire literature (citations in circuit provenance)  
- `docs/science/CHARTER.md`

## Checklist JOSS

- [ ] Zenodo DOI (`ZENODO_TOKEN` + `scripts/deposer_zenodo.py`)  
- [ ] Automated tests (`./scripts/ci-science.sh`)  
- [ ] Example notebook  
- [ ] Community guidelines / LICENSE  
