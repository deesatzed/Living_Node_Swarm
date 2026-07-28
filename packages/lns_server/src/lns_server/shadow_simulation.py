"""Non-mutating active-versus-candidate simulation for authoring review."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from lns_kernel.ensemble import run_ensemble
from lns_kernel.models import Graph
from lns_kernel.validation import ValidationError, validate_node


class ShadowSimulationBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_node_id: str
    candidate_parameter_overrides: dict[str, dict[str, float]]
    seed: int = Field(default=42, ge=0)
    n_samples: int = Field(default=2_000, gt=0)


class ShadowSimulationError(ValueError):
    pass


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
