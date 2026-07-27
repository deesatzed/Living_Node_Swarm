"""Bounded Monte Carlo stability diagnostics saved with simulation receipts."""

from __future__ import annotations

from lns_kernel.ensemble import run_ensemble
from lns_kernel.models import Node, PredictivePayload, StabilityDiagnostic


def assess_stability(
    nodes: dict[str, Node],
    *,
    baseline_predictives: dict[str, PredictivePayload],
    seed: int,
    sample_count: int,
) -> StabilityDiagnostic:
    """Probe metric variability over two seeds and two sample sizes, without claiming accuracy."""

    smaller_count = max(1, sample_count // 2)
    if smaller_count == sample_count:
        smaller_count = sample_count + 1
    configurations = ((seed, sample_count), (seed + 1, sample_count), (seed, smaller_count), (seed + 1, smaller_count))
    results: list[dict[str, PredictivePayload]] = [baseline_predictives]
    for probe_seed, probe_count in configurations[1:]:
        predictives, _, _ = run_ensemble(nodes, seed=probe_seed, n_samples=probe_count)
        results.append(predictives)

    node_metric_ranges: dict[str, dict[str, float]] = {}
    node_ids = set().union(*(result.keys() for result in results))
    for node_id in sorted(node_ids):
        payloads = [result[node_id] for result in results if node_id in result]
        metrics = {
            "mean": [payload.derived_mean for payload in payloads],
            "p05": [payload.quantiles["p05"] for payload in payloads],
            "p50": [payload.quantiles["p50"] for payload in payloads],
            "p95": [payload.quantiles["p95"] for payload in payloads],
        }
        node_metric_ranges[node_id] = {
            metric: float(max(values) - min(values))
            for metric, values in metrics.items()
            if all(value is not None for value in values)
        }
    return StabilityDiagnostic(
        method="multi_seed_multi_sample_quantile_range",
        seeds=[seed, seed + 1],
        sample_counts=sorted({sample_count, smaller_count}),
        node_metric_ranges=node_metric_ranges,
        limitations="This measures Monte Carlo stability only; it does not establish forecast accuracy or model calibration.",
    )
