"""Typed, non-scientific persistence contracts for the Prediction Workspace."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


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
    candidate_parameter_overrides: dict[str, dict[str, float]] = Field(min_length=1)
    created_at: datetime = Field(default_factory=utcnow)


class WorkspaceScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    assumptions: dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)


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
