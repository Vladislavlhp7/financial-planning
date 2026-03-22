"""JSON-safe numeric helpers (FastAPI rejects nan/inf in JSON responses)."""
import math
from typing import Any


def finite_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        v = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(v):
        return default
    return v


def strip_nonfinite(obj: Any) -> Any:
    """Recursively replace nan/inf floats so jsonable_encoder succeeds."""
    if isinstance(obj, float):
        return 0.0 if not math.isfinite(obj) else obj
    if isinstance(obj, dict):
        return {k: strip_nonfinite(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [strip_nonfinite(v) for v in obj]
    return obj
