"""Typed, non-scientific persistence contracts for the Prediction Workspace."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import math
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from lns_kernel.contracts import DistributionSpec, RelationshipContract
from lns_kernel.models import Node, NodeStatus
from lns_kernel.validation import validate_node


WorkflowStage = Literal["idea", "vet", "map", "refine", "quantify", "simulate", "decide", "monitor"]
EvidenceClassification = Literal["fixture_unverified", "local_verified", "live_provider_verified"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WorkspaceProject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    target_id: str | None = None
    graph_id: str | None = None
    stage: WorkflowStage = "idea"
    evidence_classification: EvidenceClassification = "fixture_unverified"
    active_graph_version: int | None = Field(default=None, ge=1)
    draft_base_version: int | None = Field(default=None, ge=1)
    discovery_ledger: list[dict[str, str]] = Field(default_factory=list)
    research_consent: dict[str, str] | None = None
    last_run: dict[str, str] | None = None
    updated_at: datetime = Field(default_factory=utcnow)


class WorkspaceProjectPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    target_id: str | None = None
    graph_id: str | None = None
    stage: WorkflowStage | None = None
    evidence_classification: EvidenceClassification | None = None
    active_graph_version: int | None = Field(default=None, ge=1)
    discovery_ledger: list[dict[str, str]] | None = None
    research_consent: dict[str, str] | None = None
    last_run: dict[str, str] | None = None


class WorkspaceDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    base_graph_version: int = Field(ge=1)
    created_at: datetime = Field(default_factory=utcnow)


class WorkspaceCandidateRevision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    base_graph_version: int = Field(ge=1)
    candidate_parameter_overrides: dict[str, dict[str, float]] = Field(default_factory=dict)
    candidate_distribution_specs: dict[str, DistributionSpec] = Field(default_factory=dict)
    candidate_node_state_overrides: dict[str, Literal["active", "excluded"]] = Field(default_factory=dict)
    candidate_relationship_state_overrides: dict[str, Literal["active", "excluded"]] = Field(default_factory=dict)
    candidate_relationship_contracts: list[RelationshipContract] = Field(default_factory=list)
    candidate_new_nodes: list[Node] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utcnow)

    @model_validator(mode="after")
    def require_a_candidate_delta(self) -> "WorkspaceCandidateRevision":
        if not self.candidate_parameter_overrides and not self.candidate_distribution_specs and not self.candidate_node_state_overrides and not self.candidate_relationship_state_overrides and not self.candidate_relationship_contracts and not self.candidate_new_nodes:
            raise ValueError("candidate revision requires a parameter, distribution, node-state, relationship-state, relationship contract, or new-node override")
        if any(relationship.state != "proposed" for relationship in self.candidate_relationship_contracts):
            raise ValueError("candidate relationship contracts must be proposed")
        if len({relationship.id for relationship in self.candidate_relationship_contracts}) != len(self.candidate_relationship_contracts):
            raise ValueError("candidate relationship contract ids must be unique")
        if any(node.status != NodeStatus.PROPOSED or not node.requires_human_approval for node in self.candidate_new_nodes):
            raise ValueError("candidate new nodes must be proposed and require human approval")
        if len({node.id for node in self.candidate_new_nodes}) != len(self.candidate_new_nodes):
            raise ValueError("candidate new node ids must be unique")
        for node in self.candidate_new_nodes:
            validate_node(node)
        return self


class WorkspaceScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    assumptions: dict[str, str] = Field(default_factory=dict)
    base_graph_version: int | None = Field(default=None, ge=1)
    target_node_id: str | None = None
    parameter_overrides: dict[str, dict[str, float]] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)

    @model_validator(mode="after")
    def require_complete_executable_scenario(self) -> "WorkspaceScenario":
        executable_fields = (self.base_graph_version, self.target_node_id, self.parameter_overrides)
        if any(value is not None and value != {} for value in executable_fields):
            if self.base_graph_version is None or not self.target_node_id or not self.parameter_overrides:
                raise ValueError("executable scenarios require base_graph_version, target_node_id, and parameter_overrides")
            if any(not math.isfinite(value) for parameters in self.parameter_overrides.values() for value in parameters.values()):
                raise ValueError("scenario parameter overrides must be finite")
        return self


class WorkspaceEnsembleMember(BaseModel):
    model_config = ConfigDict(extra="forbid")

    graph_id: str
    graph_version: int = Field(ge=1)
    target_node_id: str
    weight: float = Field(ge=0)

    @model_validator(mode="after")
    def require_finite_weight(self) -> "WorkspaceEnsembleMember":
        if not math.isfinite(self.weight):
            raise ValueError("ensemble member weight must be finite")
        return self


class WorkspaceEnsemble(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    members: list[WorkspaceEnsembleMember] = Field(min_length=2, max_length=8)
    combination_method: Literal["weighted_distribution_mixture"] = "weighted_distribution_mixture"
    created_at: datetime = Field(default_factory=utcnow)

    @model_validator(mode="after")
    def require_unique_members_and_positive_total_weight(self) -> "WorkspaceEnsemble":
        bindings = [(member.graph_id, member.graph_version, member.target_node_id) for member in self.members]
        if len(bindings) != len(set(bindings)):
            raise ValueError("ensemble members must have unique graph/version/target bindings")
        if sum(member.weight for member in self.members) <= 0:
            raise ValueError("ensemble member weights must sum to a positive value")
        return self

    @property
    def binding_hash(self) -> str:
        payload = json.dumps(self.model_dump(mode="json"), sort_keys=True, separators=(",", ":")).encode()
        return hashlib.sha256(payload).hexdigest()


class WorkspaceEnsembleApproval(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    ensemble_id: str
    binding_hash: str
    approved_by: str
    approved_at: datetime = Field(default_factory=utcnow)

    @model_validator(mode="after")
    def require_valid_approval_fields(self) -> "WorkspaceEnsembleApproval":
        if not self.ensemble_id.strip() or not self.approved_by.strip():
            raise ValueError("ensemble_id and approved_by are required")
        if len(self.binding_hash) != 64 or any(character not in "0123456789abcdef" for character in self.binding_hash.lower()):
            raise ValueError("ensemble binding_hash must be a SHA-256 hexadecimal digest")
        return self


class MonitoringConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cadence: str
    freshness_threshold_days: int = Field(ge=1)
    mode: Literal["fixture", "local", "live"]


class MonitoringFixtureEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    severity: Literal["info", "warning", "critical"]
    message: str
    evidence_classification: EvidenceClassification = "fixture_unverified"
    created_at: datetime = Field(default_factory=utcnow)
    acknowledged_at: datetime | None = None
