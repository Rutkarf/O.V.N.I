# O.V.N.I. — SDK Python

L’équivalent « notebook » pour ta collègue Luminy : analyser, customiser les règles,
lancer des dose-réponses — en Python (comme on ferait en **R** pour la stats).

## Install

```bash
# depuis la racine du repo
python3 -m venv .venv
.venv/bin/pip install -e "sdk[notebook]"
```

## Auth

```python
from fruitfly import FruitflyClient

ff = FruitflyClient(base_url="http://127.0.0.1:8080")
ff.register("lab@luminy.fr", "motdepasse12", "Chercheuse")
# ou ff.login("lab@luminy.fr", "motdepasse12")
```

## Exemple

```python
atlas = ff.atlas()
run = ff.stimulate(looming=0.9, seed=7)
curve = ff.dose_response(channel="looming", levels=[0, 0.25, 0.5, 0.75, 1.0], repeats=5)
ff.save_adapters(ff.adapters())  # après édition locale
```

Notebook : `../notebooks/01_luminy_quickstart.py`
