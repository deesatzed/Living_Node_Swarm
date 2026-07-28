"""Immutable, non-active structural graph proposals."""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import asdict
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator

from lns_kernel.contracts import ApprovalReceipt, RelationshipContract
from lns_kernel.dependencies import assert_acyclic
from lns_kernel.dependence import detect_dependence_warnings
from lns_kernel.models import Graph
from lns_kernel.validation import ValidationError, validate_graph_nodes


class StructuralProposalBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relationships: tuple[RelationshipContract, ...]

    @field_validator("relationships")
    @classmethod
    def require_proposed_relationships(
        cls, relationships: tuple[RelationshipContract, ...]
    ) -> tuple[RelationshipContract, ...]:
        if not relationships:
            raise ValueError("structural proposal requires at least one relationship")
        if len({relationship.id for relationship in relationships}) != len(relationships):
            raise ValueError("structural proposal relationship ids must be unique")
        if any(relationship.state != "proposed" for relationship in relationships):
            raise ValueError("structural proposal relationships must be proposed")
        return relationships


class StructuralGraphProposal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    graph_id: str
    graph_version: int = Field(ge=1)
    relationships: tuple[RelationshipContract, ...]
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


def make_structural_proposal(graph: Graph, body: StructuralProposalBody) -> StructuralGraphProposal:
    """Validate a structural delta against a copy of the exact active graph."""

    trial = graph.model_copy(deep=True)
    for relationship in body.relationships:
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
        active_relationship = relationship.model_copy(update={"state": "active"})
        trial.relationships[relationship.id] = active_relationship
        trial.nodes[child.id] = child.model_copy(
            update={
                "depends_on": [*child.depends_on, relationship.parent_node_id],
                "relationship_ids": [*child.relationship_ids, relationship.id],
            }
        )
    validate_graph_nodes(trial.nodes)
    assert_acyclic(trial.nodes)
    return StructuralGraphProposal(
        id=str(uuid.uuid4()),
        graph_id=graph.id,
        graph_version=graph.graph_version,
        relationships=body.relationships,
        candidate_relationship_ids=tuple(relationship.id for relationship in body.relationships),
        dependence_warnings=tuple(asdict(warning) for warning in detect_dependence_warnings(trial.relationships.values())),
        created_at=datetime.now(timezone.utc),
    )
