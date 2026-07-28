"""Immutable, non-active structural graph proposals."""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import asdict
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from lns_kernel.contracts import ApprovalReceipt, RelationshipContract
from lns_kernel.dependencies import assert_acyclic
from lns_kernel.dependence import detect_dependence_warnings
from lns_kernel.models import Graph
from lns_kernel.validation import ValidationError, validate_graph_nodes


class StructuralProposalBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relationships: tuple[RelationshipContract, ...] = ()
    activated_node_ids: tuple[str, ...] = ()
    removed_relationship_ids: tuple[str, ...] = ()
    retired_node_ids: tuple[str, ...] = ()
    target_node_id: str | None = None

    @field_validator("relationships")
    @classmethod
    def require_proposed_relationships(
        cls, relationships: tuple[RelationshipContract, ...]
    ) -> tuple[RelationshipContract, ...]:
        if len({relationship.id for relationship in relationships}) != len(relationships):
            raise ValueError("structural proposal relationship ids must be unique")
        if any(relationship.state != "proposed" for relationship in relationships):
            raise ValueError("structural proposal relationships must be proposed")
        return relationships

    @model_validator(mode="after")
    def require_a_structural_delta(self) -> "StructuralProposalBody":
        if not self.relationships and not self.activated_node_ids and not self.removed_relationship_ids and not self.retired_node_ids:
            raise ValueError("structural proposal requires a relationship addition, node activation, removal, or node retirement")
        if len(set(self.activated_node_ids)) != len(self.activated_node_ids):
            raise ValueError("structural proposal activated node ids must be unique")
        if len(set(self.removed_relationship_ids)) != len(self.removed_relationship_ids):
            raise ValueError("structural proposal removal ids must be unique")
        if set(self.removed_relationship_ids) & {relationship.id for relationship in self.relationships}:
            raise ValueError("structural proposal cannot add and remove the same relationship id")
        if len(set(self.retired_node_ids)) != len(self.retired_node_ids):
            raise ValueError("structural proposal retired node ids must be unique")
        if self.retired_node_ids and not self.target_node_id:
            raise ValueError("structural node retirement requires target_node_id")
        return self


class StructuralGraphProposal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    graph_id: str
    graph_version: int = Field(ge=1)
    relationships: tuple[RelationshipContract, ...]
    activated_node_ids: tuple[str, ...] = ()
    removed_relationship_ids: tuple[str, ...] = ()
    retired_node_ids: tuple[str, ...] = ()
    target_node_id: str | None = None
    candidate_relationship_ids: tuple[str, ...]
    dependence_warnings: tuple[dict[str, str], ...] = ()
    created_at: datetime
    version: int = 1

    @property
    def binding_hash(self) -> str:
        payload = json.dumps(self.model_dump(mode="json"), sort_keys=True, separators=(",", ":")).encode()
        return hashlib.sha256(payload).hexdigest()

    def response_payload(self) -> dict[str, object]:
        return {**self.model_dump(mode="json"), "binding_hash": self.binding_hash}


def make_structural_approval_receipt(
    proposal: StructuralGraphProposal, *, approved_by: str, binding_hash: str
) -> ApprovalReceipt:
    if not approved_by:
        raise ValueError("approved_by must be non-empty")
    if binding_hash != proposal.binding_hash:
        raise ValueError("approval binding hash does not match structural proposal")
    return ApprovalReceipt(
        id=str(uuid.uuid4()),
        proposal_id=proposal.id,
        proposal_version=proposal.version,
        graph_id=proposal.graph_id,
        graph_version=proposal.graph_version,
        binding_hash=proposal.binding_hash,
        approved_by=approved_by,
        approved_at=datetime.now(timezone.utc),
    )


def _remove_relationship_from_trial(trial: Graph, relationship_id: str) -> None:
    relationship = trial.relationships.get(relationship_id)
    if relationship is None:
        raise ValidationError(f"structural proposal removal references unknown active relationship {relationship_id}")
    child = trial.nodes.get(relationship.child_node_id)
    if child is None or relationship.parent_node_id not in child.depends_on or relationship_id not in child.relationship_ids:
        raise ValidationError(f"structural proposal removal {relationship_id} is inconsistent with its active child edge")
    parent_index = child.depends_on.index(relationship.parent_node_id)
    retained_dependencies = [item for index, item in enumerate(child.depends_on) if index != parent_index]
    retained_relationship_ids = [item for item in child.relationship_ids if item != relationship_id]
    retained_coefficients = [child.transform_params.get(f"a{index + 1}") for index in range(len(child.depends_on)) if index != parent_index]
    if any(value is None for value in retained_coefficients):
        raise ValidationError(f"structural proposal removal {relationship_id} cannot reindex missing affine coefficients")
    transform_params = {key: value for key, value in child.transform_params.items() if key == "a0" or not key.startswith("a") or not key[1:].isdigit()}
    transform_params.update({f"a{index + 1}": value for index, value in enumerate(retained_coefficients)})
    trial.nodes[child.id] = child.model_copy(update={
        "depends_on": retained_dependencies,
        "relationship_ids": retained_relationship_ids,
        "transform_params": transform_params,
    })
    del trial.relationships[relationship_id]


def materialize_structural_trial(
    graph: Graph, relationships: tuple[RelationshipContract, ...], removed_relationship_ids: tuple[str, ...] = (),
    retired_node_ids: tuple[str, ...] = (), target_node_id: str | None = None, activated_node_ids: tuple[str, ...] = (),
) -> Graph:
    """Return a validated in-memory graph with exact proposed relationship changes active."""
    trial = graph.model_copy(deep=True)
    if target_node_id in retired_node_ids:
        raise ValidationError("structural proposal cannot retire target node")
    for node_id in activated_node_ids:
        node = trial.nodes.get(node_id)
        if node is None:
            raise ValidationError(f"structural proposal activation references missing node {node_id}")
        if node.status.value != "proposed":
            raise ValidationError(f"structural proposal activation requires a proposed node: {node_id}")
        trial.nodes[node_id] = node.model_copy(update={"status": "active"})
    retired_ids = set(retired_node_ids)
    if any(
        relationship.parent_node_id in retired_ids or relationship.child_node_id in retired_ids
        for relationship in relationships
    ):
        raise ValidationError("structural proposal cannot add a relationship incident to a retired node")
    removal_ids = set(removed_relationship_ids)
    active_relationships = tuple(graph.relationships.values())
    for node_id in retired_node_ids:
        node = graph.nodes.get(node_id)
        if node is None:
            raise ValidationError(f"structural proposal retirement references missing node {node_id}")
        incident_ids = {
            relationship.id for relationship in active_relationships
            if relationship.parent_node_id == node_id or relationship.child_node_id == node_id
        }
        incident_edges = {
            (relationship.parent_node_id, relationship.child_node_id)
            for relationship in active_relationships
            if relationship.id in incident_ids
        }
        graph_edges = {
            (parent, child.id)
            for child in graph.nodes.values()
            for parent in child.depends_on
            if parent == node_id or child.id == node_id
        }
        if graph_edges != incident_edges:
            raise ValidationError(f"structural proposal retirement {node_id} requires complete persisted incident relationship metadata")
        if not incident_ids.issubset(removal_ids):
            raise ValidationError(f"structural proposal retirement {node_id} must remove every incident active relationship")
    for relationship_id in removed_relationship_ids:
        _remove_relationship_from_trial(trial, relationship_id)
    for node_id in retired_node_ids:
        node = trial.nodes[node_id]
        if node.depends_on or node.relationship_ids:
            raise ValidationError(f"structural proposal retirement {node_id} left unresolved dependencies")
        trial.nodes[node_id] = node.model_copy(update={"status": "retired"})
    for relationship in relationships:
        if relationship.transform == "affine" and not relationship.coefficient_parameters:
            raise ValidationError(
                f"structural affine relationship {relationship.id} requires coefficient_parameters"
            )
        if relationship.lag_periods != 0:
            raise ValidationError(
                "structural proposal relationships with nonzero lag are not executable by the current graph runtime"
            )
        if relationship.id in trial.relationships:
            raise ValidationError(f"structural proposal relationship already exists: {relationship.id}")
        parent = trial.nodes.get(relationship.parent_node_id)
        child = trial.nodes.get(relationship.child_node_id)
        if parent is None or child is None:
            raise ValidationError(f"structural proposal relationship {relationship.id} references a missing node")
        if relationship.parent_node_id in child.depends_on:
            raise ValidationError(
                f"structural proposal relationship {relationship.id} duplicates an active dependency"
            )
        if child.transform.value == "none":
            raise ValidationError(
                f"structural proposal child {child.id} cannot add a dependency with transform none"
            )
        if relationship.transform != child.transform.value:
            raise ValidationError(
                f"structural proposal relationship {relationship.id} transform must match child transform {child.transform.value}"
            )
        coefficient = relationship.coefficient_parameter_map.get("coefficient")
        if coefficient is None:
            raise ValidationError(
                f"structural proposal relationship {relationship.id} requires coefficient_parameters.coefficient"
            )
        active_relationship = relationship.model_copy(update={"state": "active"})
        trial.relationships[relationship.id] = active_relationship
        trial.nodes[child.id] = child.model_copy(
            update={
                "depends_on": [*child.depends_on, relationship.parent_node_id],
                "relationship_ids": [*child.relationship_ids, relationship.id],
                "transform_params": {**child.transform_params, f"a{len(child.depends_on) + 1}": coefficient},
            }
        )
    validate_graph_nodes(trial.nodes)
    assert_acyclic(trial.nodes)
    return trial


def make_structural_proposal(graph: Graph, body: StructuralProposalBody) -> StructuralGraphProposal:
    """Validate a structural delta against a copy of the exact active graph."""

    trial = materialize_structural_trial(
        graph, body.relationships, body.removed_relationship_ids, body.retired_node_ids, body.target_node_id,
        body.activated_node_ids,
    )
    return StructuralGraphProposal(
        id=str(uuid.uuid4()),
        graph_id=graph.id,
        graph_version=graph.graph_version,
        relationships=body.relationships,
        activated_node_ids=body.activated_node_ids,
        removed_relationship_ids=body.removed_relationship_ids,
        retired_node_ids=body.retired_node_ids,
        target_node_id=body.target_node_id,
        candidate_relationship_ids=tuple(relationship.id for relationship in body.relationships),
        dependence_warnings=tuple(asdict(warning) for warning in detect_dependence_warnings(trial.relationships.values())),
        created_at=datetime.now(timezone.utc),
    )
