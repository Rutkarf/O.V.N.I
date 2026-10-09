# Architecture cible — monorepo O.V.N.I. (2026)

## Arborescence

```
O.V.N.I./
├── apps/
│   ├── frontend/          # Angular LTS — UI instrument
│   └── backend/           # Spring Boot LTS — API / auth / jobs
├── packages/
│   ├── science-engine/    # LIF + stimulate/validate/export (pur, testable)
│   ├── science-datasets/  # circuits, adapters, schemas, manifests, samples
│   └── fruitfly-sdk/      # client Python HTTP
├── services/
│   └── worker/            # → lien vers worker/ (HTTP thin)
├── notebooks/
├── docs/
│   ├── science/
│   ├── architecture/
│   └── product/
├── infra/
├── scripts/
├── tests/science/         # golden runs
└── archive/               # legacy gelé (web-legacy, …)
```

## ADR-001 — science-engine vs worker

**Contexte** : le moteur LIF et l’I/O HTTP étaient mélangés dans `worker/science`.

**Décision** : code pur dans `packages/science-engine` ; datasets versionnés dans `packages/science-datasets` ; `worker/` reste le processus HTTP (sim lab + science) et importe le package.

**Conséquences** : tests golden sans serveur ; SDK et notebooks stables ; scale ROI/MaleCNS derrière les mêmes APIs.

## Contrats

- JSON Schema : `packages/science-datasets/schemas/`
- Manifest motif : `packages/science-datasets/manifests/*.yaml`
- Run card : champs obligatoires documentés dans le schema `run_card.schema.json`
