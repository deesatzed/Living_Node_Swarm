"""Core domain models for Living Node Swarm v0.1."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DistributionFamily(str, Enum):
    NORMAL = "Normal"
    LOGNORMAL = "LogNormal"
    BETA = "Beta"
    DETERMINISTIC = "Deterministic"


class NodeStatus(str, Enum):
    PROPOSED = "proposed"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    RETIRED = "retired"


class TransformKind(str, Enum):
    """How a dependent node composes parent samples."""

    NONE = "none"  # root / no parents
    AFFINE = "affine"  # y = a0 + sum(a_i * p_i) + eps
    SUM_PARENTS = "sum_parents"  # y = sum(p_i) + eps
    MEAN_PARENTS = "mean_parents"  # y = mean(p_i) + eps


class Freshness(str, Enum):
    FRESH = "fresh"
    STALE = "stale"
    UPDATING = "updating"
    FAILED = "failed"


class Node(BaseModel):
    id: str
    name: str
    description: str = ""
    distribution_family: DistributionFamily
    parameters: dict[str, float] = Field(default_factory=dict)
    depends_on: list[str] = Field(default_factory=list)
    transform: TransformKind = TransformKind.NONE
    # Affine coeffs: a0, a1, a2, ... matching depends_on order (a0 intercept)
    transform_params: dict[str, float] = Field(default_factory=dict)
    version: int = 1
    status: NodeStatus = NodeStatus.ACTIVE
    units: str | None = None
    support_lower: float | None = None
    support_upper: float | None = None
    requires_human_approval: bool = False
    created_by: str = "human"
    last_updated_by: str = "human"
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    discovery_rationale: str | None = None
    tags: list[str] = Field(default_factory=list)
    # General-workspace metadata. Defaults deliberately preserve v0 graph semantics.
    distribution_spec_id: str | None = None
    evidence_claim_ids: list[str] = Field(default_factory=list)
    relationship_ids: list[str] = Field(default_factory=list)
    schema_version: int = Field(default=1, ge=1)

    @field_validator("id")
    @classmethod
    def id_nonempty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("id must be non-empty")
        return v.strip()


class NodeLayout(BaseModel):
    x: float = 0.0
    y: float = 0.0


class Graph(BaseModel):
    id: str
    name: str = "untitled"
    nodes: dict[str, Node] = Field(default_factory=dict)
    layout: dict[str, NodeLayout] = Field(default_factory=dict)
    graph_version: int = 1
    # These optional links are introduced without changing legacy graph behavior.
    target_contract_id: str | None = None
    active_approval_id: str | None = None
    schema_version: int = Field(default=1, ge=1)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class UpdateEvent(BaseModel):
    id: str
    graph_id: str
    node_id: str
    old_version: int
    new_version: int
    reason: str
    actor: str
    timestamp: datetime = Field(default_factory=utcnow)
    diff_summary: dict[str, Any] = Field(default_factory=dict)


class PredictivePayload(BaseModel):
    node_id: str
    family_or_empirical: str = "empirical"
    parameters: dict[str, float] | None = None
    samples: list[float] = Field(default_factory=list)
    quantiles: dict[str, float] = Field(default_factory=dict)
    derived_mean: float | None = None
    derived_std: float | None = None
    derived_median: float | None = None
    n_samples: int = 0
    freshness: Freshness = Freshness.FRESH


class SimulationSnapshot(BaseModel):
    id: str
    graph_id: str
    graph_version: int
    node_predictives: dict[str, PredictivePayload] = Field(default_factory=dict)
    seed: int
    n_samples: int
    transform_kind_used: dict[str, str] = Field(default_factory=dict)
    started_at: datetime
    finished_at: datetime | None = None
    status: str = "complete"  # complete | failed | running
    error: str | None = None


class SimStatus(BaseModel):
    graph_id: str
    freshness: Freshness
    graph_version: int
    last_snapshot_id: str | None = None
    last_error: str | None = None
    job_running: bool = False
