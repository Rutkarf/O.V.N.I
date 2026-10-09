# science-engine

Pure LIF science package (`fruitfly_science`) — no HTTP.

```bash
export PYTHONPATH=packages/science-engine/src
export FRUITFLY_DATASETS=packages/science-datasets
python3 -c "from fruitfly_science.service import validate_suite; print(validate_suite()['passed'])"
```

Runtime I/O (runs/uploads): `FRUITFLY_RUNTIME` (default `worker/science/data`).
