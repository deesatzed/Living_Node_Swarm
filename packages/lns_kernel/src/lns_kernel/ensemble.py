"""Real Monte Carlo ensemble over active nodes."""

from __future__ import annotations

from typing import Callable, Mapping

import numpy as np

from lns_kernel.dependencies import topological_order
from lns_kernel.distributions import sample_distribution
from lns_kernel.models import (
    DistributionFamily,
    Freshness,
    Node,
    NodeStatus,
    PredictivePayload,
    TransformKind,
)


def _sample_family(
    family: DistributionFamily, parameters: dict[str, float], n: int, rng: np.random.Generator
) -> np.ndarray:
    """Delegate all runtime sampling to the one canonical distribution registry."""

    seed = int(rng.integers(0, np.iinfo(np.int64).max))
    return sample_distribution(family.value, parameters, size=n, seed=seed)


def _compose(
    transform: TransformKind,
    parent_samples: list[np.ndarray],
    transform_params: dict[str, float],
    eps: np.ndarray,
) -> np.ndarray:
    if not parent_samples:
        return eps
    stacked = np.vstack(parent_samples)  # (k, n)
    if transform == TransformKind.SUM_PARENTS:
        return stacked.sum(axis=0) + eps
    if transform == TransformKind.MEAN_PARENTS:
        return stacked.mean(axis=0) + eps
    if transform == TransformKind.AFFINE:
        a0 = float(transform_params.get("a0", 0.0))
        out = np.full(stacked.shape[1], a0, dtype=float)
        for i in range(stacked.shape[0]):
            ai = float(transform_params.get(f"a{i + 1}", 1.0))
            out = out + ai * stacked[i]
        return out + eps
    if transform == TransformKind.NONE:
        return eps
    raise ValueError(f"Unknown transform {transform}")


def _quantiles(samples: np.ndarray) -> dict[str, float]:
    return {
        "p05": float(np.quantile(samples, 0.05)),
        "p50": float(np.quantile(samples, 0.50)),
        "p95": float(np.quantile(samples, 0.95)),
    }


def _payload(node_id: str, samples: np.ndarray, n_keep: int = 200) -> PredictivePayload:
    # Keep a subset of samples for API payload size; quantiles from full set
    step = max(1, len(samples) // n_keep)
    kept = samples[::step][:n_keep]
    return PredictivePayload(
        node_id=node_id,
        family_or_empirical="empirical",
        samples=[float(x) for x in kept],
        quantiles=_quantiles(samples),
        derived_mean=float(np.mean(samples)),
        derived_std=float(np.std(samples)),
        derived_median=float(np.median(samples)),
        n_samples=int(len(samples)),
        freshness=Freshness.FRESH,
    )


def run_ensemble(
    nodes: dict[str, Node],
    *,
    seed: int = 42,
    n_samples: int = 2000,
    transform_override: dict[str, TransformKind] | None = None,
) -> tuple[dict[str, PredictivePayload], dict[str, str], dict[str, np.ndarray]]:
    """
    Run Monte Carlo on active nodes only.

    Returns (predictives, transform_used_map, full_sample_arrays).
    """
    active = {nid: n for nid, n in nodes.items() if n.status == NodeStatus.ACTIVE}
    if not active:
        return {}, {}, {}

    order = topological_order(active)
    rng = np.random.default_rng(seed)
    samples: dict[str, np.ndarray] = {}
    transform_used: dict[str, str] = {}

    for nid in order:
        node = active[nid]
        tkind = (transform_override or {}).get(nid, node.transform)
        transform_used[nid] = tkind.value
        eps = _sample_family(node.distribution_family, node.parameters, n_samples, rng)
        if not node.depends_on:
            samples[nid] = eps
        else:
            parents = []
            for p in node.depends_on:
                if p not in samples:
                    # parent inactive or missing — skip (should not happen if graph valid)
                    continue
                parents.append(samples[p])
            samples[nid] = _compose(tkind, parents, node.transform_params, eps)

    predictives = {nid: _payload(nid, arr) for nid, arr in samples.items()}
    return predictives, transform_used, samples


def compare_transforms(
    nodes: dict[str, Node],
    node_id: str,
    strategies: list[TransformKind],
    *,
    seed: int = 42,
    n_samples: int = 2000,
) -> list[dict]:
    """
    Experiment harness: for a dependent node, run ensemble under each transform
    and report summary stats (real MC, no mocks).
    """
    results = []
    for strat in strategies:
        override = {node_id: strat}
        predictives, used, full = run_ensemble(
            nodes, seed=seed, n_samples=n_samples, transform_override=override
        )
        if node_id not in predictives:
            results.append({"transform": strat.value, "error": "node not in active set"})
            continue
        p = predictives[node_id]
        arr = full[node_id]
        results.append(
            {
                "transform": strat.value,
                "quantiles": p.quantiles,
                "derived_mean": p.derived_mean,
                "derived_std": p.derived_std,
                "sample_var": float(np.var(arr)),
                "transform_used": used.get(node_id),
            }
        )
    return results


def weighted_outcome_mixture(
    member_samples: Mapping[str, np.ndarray],
    weights: Mapping[str, float],
    *,
    seed: int,
    node_id: str = "weighted_ensemble",
) -> tuple[PredictivePayload, dict[str, float]]:
    """Sample a reproducible mixture from already-generated member outcomes.

    This is distribution mixing, not arithmetic averaging of point summaries.
    """

    if not member_samples:
        raise ValueError("at least one ensemble member is required")
    if set(member_samples) != set(weights):
        raise ValueError("ensemble weights must name exactly the supplied members")
    values = {member_id: np.asarray(samples, dtype=float) for member_id, samples in member_samples.items()}
    if any(samples.ndim != 1 or len(samples) == 0 or not np.all(np.isfinite(samples)) for samples in values.values()):
        raise ValueError("ensemble member samples must be non-empty finite one-dimensional arrays")
    raw_weights = np.array([weights[member_id] for member_id in values], dtype=float)
    if not np.all(np.isfinite(raw_weights)) or np.any(raw_weights < 0) or raw_weights.sum() <= 0:
        raise ValueError("ensemble weights must be finite, non-negative, and sum to a positive value")
    normalized = raw_weights / raw_weights.sum()
    member_ids = list(values)
    output_size = max(len(samples) for samples in values.values())
    rng = np.random.default_rng(seed)
    selected_members = rng.choice(len(member_ids), size=output_size, p=normalized)
    mixture = np.empty(output_size, dtype=float)
    for index, member_index in enumerate(selected_members):
        samples = values[member_ids[member_index]]
        mixture[index] = samples[int(rng.integers(0, len(samples)))]
    return _payload(node_id, mixture), {member_id: float(normalized[index]) for index, member_id in enumerate(member_ids)}


# Optional scoring helper for experiments: prefer finite variance, non-degenerate spread
def score_transform_result(row: dict) -> float:
    if "error" in row:
        return float("-inf")
    std = row.get("derived_std") or 0.0
    # Prefer moderate, non-zero, non-exploding variance
    if std <= 0:
        return 0.0
    if std > 1e6:
        return 0.0
    return float(std)  # simple proxy; human picks based on report
