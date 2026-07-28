"""Non-mutating active-versus-candidate simulation for authoring review."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from lns_kernel.ensemble import run_ensemble
from lns_kernel.models import Graph, NodeStatus
from lns_kernel.validation import ValidationError, validate_node


class ShadowSimulationBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_node_id: str
    candidate_parameter_overrides: dict[str, dict[str, float]]
    seed: int = Field(default=42, ge=0)
    n_samples: int = Field(default=2_000, gt=0)


class ShadowSimulationError(ValueError):
    pass


def run_local_sensitivity(
    graph: Graph,
    *,
    target_node_id: str,
    perturbation_fraction: float,
    seed: int = 42,
    n_samples: int = 2_000,
) -> dict[str, object]:
    """One-at-a-time finite-difference impact report; never saves or changes the graph."""

    baseline = run_shadow_simulation(graph, ShadowSimulationBody(
        target_node_id=target_node_id,
        candidate_parameter_overrides={}, seed=seed, n_samples=n_samples,
    ))
    active_summary = baseline["active_summary"]
    assert isinstance(active_summary, dict)
    rows: list[dict[str, object]] = []
    skipped: list[str] = []
    for node_id, node in sorted(graph.nodes.items()):
        if node.status != NodeStatus.ACTIVE:
            continue
        for parameter, value in sorted(node.parameters.items()):
            if value == 0:
                skipped.append(f"{node_id}.{parameter}")
                continue
            perturbed = value * (1 + perturbation_fraction)
            comparison = run_shadow_simulation(graph, ShadowSimulationBody(
                target_node_id=target_node_id,
                candidate_parameter_overrides={node_id: {parameter: perturbed}}, seed=seed, n_samples=n_samples,
            ))
            candidate_summary = comparison["candidate_summary"]
            assert isinstance(candidate_summary, dict)
            rows.append({
                "node_id": node_id,
                "parameter": parameter,
                "baseline_value": value,
                "perturbed_value": perturbed,
                "delta_mean": float(candidate_summary["mean"]) - float(active_summary["mean"]),
                "delta_p50": float(candidate_summary["p50"]) - float(active_summary["p50"]),
            })
    rows.sort(key=lambda row: abs(float(row["delta_mean"])), reverse=True)
    return {
        "target_node_id": target_node_id,
        "perturbation_fraction": perturbation_fraction,
        "baseline_summary": active_summary,
        "rows": rows,
        "skipped_zero_parameters": skipped,
        "active_graph_mutated": False,
        "method": "one_at_a_time_local_finite_difference",
        "limitations": [
            "Each nonzero active parameter is increased independently by the stated fraction while all other assumptions remain fixed.",
            "This is local structural sensitivity, not causal attribution, global importance, calibration, or evidence of forecast accuracy.",
            "Zero-valued parameters are skipped because no unit-safe relative perturbation is available.",
        ],
    }


def run_shadow_simulation(graph: Graph, body: ShadowSimulationBody) -> dict[str, object]:
    """Run a copy of a candidate graph without storing or activating its proposed changes."""

    if body.target_node_id not in graph.nodes:
        raise ShadowSimulationError("target node not found in graph")
    candidate_nodes = {node_id: node.model_copy(deep=True) for node_id, node in graph.nodes.items()}
    for node_id, override in body.candidate_parameter_overrides.items():
        node = candidate_nodes.get(node_id)
        if node is None:
            raise ShadowSimulationError(f"candidate override references missing node {node_id}")
        merged = {**node.parameters, **override}
        candidate_nodes[node_id] = node.model_copy(update={"parameters": merged})
        try:
            validate_node(candidate_nodes[node_id])
        except ValidationError as exc:
            raise ShadowSimulationError(str(exc)) from exc
    active_predictives, _, _ = run_ensemble(graph.nodes, seed=body.seed, n_samples=body.n_samples)
    candidate_predictives, _, _ = run_ensemble(
        candidate_nodes, seed=body.seed, n_samples=body.n_samples
    )
    active = active_predictives.get(body.target_node_id)
    candidate = candidate_predictives.get(body.target_node_id)
    if active is None or candidate is None:
        raise ShadowSimulationError("target node is not active in the simulation")
    return {
        "active_run_id": str(uuid.uuid4()),
        "candidate_run_id": str(uuid.uuid4()),
        "active_graph_mutated": False,
        "active_summary": {"mean": active.derived_mean, **active.quantiles},
        "candidate_summary": {"mean": candidate.derived_mean, **candidate.quantiles},
        "limitations": [
            "Candidate changes are simulated in memory and are not persisted or activated.",
            "A distribution shift is structural impact, not evidence of improved forecast accuracy.",
        ],
    }
