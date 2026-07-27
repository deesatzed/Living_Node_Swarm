"""Simple probabilistic scores for Kalshi-style binary outcomes."""

from __future__ import annotations


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
