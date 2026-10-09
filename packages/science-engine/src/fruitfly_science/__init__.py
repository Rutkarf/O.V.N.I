"""fruitfly science-engine — LIF instrument (preuve) sans I/O HTTP."""

from fruitfly_science import service
from fruitfly_science.lif import Graph, LifParams, decode_action, poisson_train, run_lif

__all__ = [
    "service",
    "Graph",
    "LifParams",
    "decode_action",
    "poisson_train",
    "run_lif",
]
__version__ = "0.3.0"
