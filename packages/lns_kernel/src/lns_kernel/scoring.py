"""Simple probabilistic scores for Kalshi-style binary outcomes."""

from __future__ import annotations

from collections.abc import Iterable, Sequence

import numpy as np


def brier(p: float, y: int) -> float:
    """Brier score for binary y in {0,1}, p in [0,1]. Lower is better."""
    if y not in (0, 1):
        raise ValueError("y must be 0 or 1")
    p = min(1.0, max(0.0, float(p)))
    return (p - y) ** 2


def relative_move(entry: float, now: float) -> float:
    """|now-entry|/entry; entry must be > 0."""
    if entry <= 0:
        raise ValueError("entry must be > 0")
    return abs(now - entry) / entry


def should_exit_on_move(entry: float, now: float, move_pct: float = 0.20) -> bool:
    # epsilon avoids float edge cases (e.g. 0.50 → 0.60 exactly 20%)
    return relative_move(entry, now) + 1e-12 >= move_pct


def crps_empirical(samples: np.ndarray, *, observation: float) -> float:
    """Continuous Ranked Probability Score for equally weighted empirical samples."""

    values = np.asarray(samples, dtype=float).reshape(-1)
    if len(values) == 0 or not np.isfinite(values).all() or not np.isfinite(observation):
        raise ValueError("samples and observation must be finite and samples non-empty")
    values.sort()
    count = len(values)
    mean_absolute_error = float(np.mean(np.abs(values - observation)))
    indices = np.arange(1, count + 1, dtype=float)
    mean_pairwise_distance = float(2 * np.sum((2 * indices - count - 1) * values) / count**2)
    return mean_absolute_error - 0.5 * mean_pairwise_distance


def interval_coverage(
    intervals: Sequence[tuple[float, float]], observations: Iterable[float]
) -> float:
    """Return the fraction of continuous observations inside their inclusive forecast intervals."""

    observed = tuple(float(value) for value in observations)
    if not intervals or len(intervals) != len(observed):
        raise ValueError("intervals and observations must be non-empty and have equal length")
    covered = 0
    for lower, upper in intervals:
        if not np.isfinite(lower) or not np.isfinite(upper):
            raise ValueError("interval bounds must be finite")
        if lower > upper:
            raise ValueError("lower bound must not exceed upper bound")
    for (lower, upper), value in zip(intervals, observed, strict=True):
        if not np.isfinite(value):
            raise ValueError("observations must be finite")
        covered += lower <= value <= upper
    return covered / len(observed)
