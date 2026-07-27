"""Versioned contracts for resolvable Living Node Swarm predictions."""

from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime
from enum import Enum
from typing import Self
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _require_aware_datetime(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("must be timezone-aware")
    return value


def _require_non_empty(value: str) -> str:
    if not value:
        raise ValueError("must not be blank")
    return value


def _require_http_or_https(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("must be an absolute http or https URL")
    return value


class EvidenceClass(str, Enum):
    USER = "user_provided"
    RETRIEVED = "retrieved"
    INFERRED = "model_inference"
    ASSUMPTION = "scenario_assumption"
    OBSERVATION = "resolved_observation"
    UNKNOWN = "unknown"


class RelationshipType(str, Enum):
    CAUSAL_HYPOTHESIS = "causal_hypothesis"
    ACCOUNTING_IDENTITY = "accounting_identity"
    OBSERVED_RELATION = "observed_relation"
    PROXY_CORRELATION = "proxy_correlation"
    SCENARIO_ASSUMPTION = "scenario_assumption"


class ContractModel(BaseModel):
    """Strict immutable base shared by all prediction contracts."""

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)


class TargetContract(ContractModel):
    """Defines the exact observable that resolves a prediction."""

    id: str
    question: str
    target_node_id: str
    forecast_origin: datetime
    resolution_at: datetime
    product: str
    grade: str
    purity: str | None = None
    price_basis: str
    geography: str
    currency: str
    unit: str
    oracle_url: str
    observation_rule: str
    missing_source_fallback: str
    revision_policy: str
    schema_version: int = Field(default=1, ge=1)

    @field_validator(
        "id",
        "question",
        "target_node_id",
        "product",
        "grade",
        "price_basis",
        "geography",
        "currency",
        "unit",
        "observation_rule",
        "missing_source_fallback",
        "revision_policy",
    )
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        return _require_non_empty(value)

    @field_validator("forecast_origin", "resolution_at")
    @classmethod
    def require_timezone_aware_datetime(cls, value: datetime) -> datetime:
        return _require_aware_datetime(value)

    @field_validator("oracle_url")
    @classmethod
    def require_http_or_https_oracle(cls, value: str) -> str:
        return _require_http_or_https(value)

    @model_validator(mode="after")
    def resolution_must_follow_forecast_origin(self) -> "TargetContract":
        if self.resolution_at <= self.forecast_origin:
            raise ValueError("resolution_at must be after forecast_origin")
        return self

    @property
    def horizon_days(self) -> int:
        """Whole elapsed days between forecast origin and resolution."""

        return (self.resolution_at - self.forecast_origin).days


class SourceReceipt(ContractModel):
    """Provenance metadata for one retrieved or user-supplied source."""

    id: str
    canonical_url: str
    publisher: str
    retrieved_at: datetime
    content_hash: str
    source_type: str
    commercial_interest: str | None = None
    original_source_url: str | None = None
    schema_version: int = Field(default=1, ge=1)

    @field_validator("id", "publisher", "source_type")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        return _require_non_empty(value)

    @field_validator("canonical_url", "original_source_url")
    @classmethod
    def require_http_or_https_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _require_http_or_https(value)

    @field_validator("retrieved_at")
    @classmethod
    def require_timezone_aware_datetime(cls, value: datetime) -> datetime:
        return _require_aware_datetime(value)

    @field_validator("content_hash")
    @classmethod
    def require_sha256_hash(cls, value: str) -> str:
        if len(value) != 64 or any(char not in "0123456789abcdef" for char in value.lower()):
            raise ValueError("must be a 64-character SHA-256 hex digest")
        return value.lower()


class EvidenceClaim(ContractModel):
    """A typed statement with explicit provenance class."""

    id: str
    classification: EvidenceClass
    claim_text: str
    source_receipt_id: str | None = None
    conflicts_with_claim_ids: tuple[str, ...] = ()
    schema_version: int = Field(default=1, ge=1)

    @field_validator("id", "claim_text", "source_receipt_id")
    @classmethod
    def require_non_empty_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _require_non_empty(value)

    @field_validator("conflicts_with_claim_ids")
    @classmethod
    def require_unique_conflict_ids(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if len(value) != len(set(value)):
            raise ValueError("conflict claim ids must be unique")
        for claim_id in value:
            _require_non_empty(claim_id)
        return value

    @model_validator(mode="after")
    def retrieved_claims_require_a_source(self) -> Self:
        if self.classification in {EvidenceClass.RETRIEVED, EvidenceClass.OBSERVATION}:
            if self.source_receipt_id is None:
                raise ValueError("retrieved and resolved claims require source_receipt_id")
        return self


class ParameterValue(ContractModel):
    """One canonical numeric parameter in a distribution specification."""

    id: str
    value: float

    @field_validator("id")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        return _require_non_empty(value)

    @field_validator("value")
    @classmethod
    def require_finite_value(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("must be finite")
        return value


class DistributionSpec(ContractModel):
    """Versioned distribution assumptions plus provenance and support."""

    id: str
    family_id: str
    parameters: tuple[ParameterValue, ...]
    support_lower: float | None = None
    support_upper: float | None = None
    support_lower_open: bool = False
    support_upper_open: bool = False
    elicitation_method: str
    evidence_claim_ids: tuple[str, ...] = ()
    as_of: datetime
    confidence_rationale: str
    schema_version: int = Field(default=1, ge=1)

    @field_validator("id", "family_id", "elicitation_method", "confidence_rationale")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        return _require_non_empty(value)

    @field_validator("support_lower", "support_upper")
    @classmethod
    def require_finite_optional_bound(cls, value: float | None) -> float | None:
        if value is not None and not math.isfinite(value):
            raise ValueError("support bound must be finite")
        return value

    @field_validator("evidence_claim_ids")
    @classmethod
    def require_non_empty_claim_ids(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        for claim_id in value:
            _require_non_empty(claim_id)
        return value

    @field_validator("as_of")
    @classmethod
    def require_timezone_aware_datetime(cls, value: datetime) -> datetime:
        return _require_aware_datetime(value)

    @model_validator(mode="after")
    def validate_distribution_spec(self) -> Self:
        parameter_ids = [parameter.id for parameter in self.parameters]
        if not parameter_ids:
            raise ValueError("parameters must contain at least one value")
        if len(parameter_ids) != len(set(parameter_ids)):
            raise ValueError("parameter ids must be unique")
        if (
            self.support_lower is not None
            and self.support_upper is not None
            and self.support_lower >= self.support_upper
        ):
            raise ValueError("support_lower must be less than support_upper")
        return self

    @property
    def parameter_map(self) -> dict[str, float]:
        return {parameter.id: parameter.value for parameter in self.parameters}


class RelationshipContract(ContractModel):
    """A reviewable, unit-aware dependency between two graph nodes."""

    id: str
    parent_node_id: str
    child_node_id: str
    relationship_type: RelationshipType
    transform: str
    source_unit: str
    target_unit: str
    sign: str
    lag_periods: int = Field(ge=0)
    coefficient_units: str | None = None
    state: str = "proposed"
    evidence_claim_ids: tuple[str, ...] = ()
    schema_version: int = Field(default=1, ge=1)

    @field_validator(
        "id",
        "parent_node_id",
        "child_node_id",
        "transform",
        "source_unit",
        "target_unit",
        "sign",
        "coefficient_units",
        "state",
    )
    @classmethod
    def require_non_empty_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _require_non_empty(value)

    @field_validator("evidence_claim_ids")
    @classmethod
    def require_non_empty_claim_ids(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        for claim_id in value:
            _require_non_empty(claim_id)
        return value

    @model_validator(mode="after")
    def validate_relationship(self) -> Self:
        if self.parent_node_id == self.child_node_id:
            raise ValueError("parent_node_id and child_node_id must differ")
        if self.transform == "affine" and self.coefficient_units is None:
            raise ValueError("affine relationships require coefficient_units")
        return self


class GraphProposal(ContractModel):
    """An immutable candidate graph delta awaiting approval."""

    id: str
    graph_id: str
    graph_version: int = Field(ge=1)
    target_contract_id: str
    node_ids: tuple[str, ...]
    relationship_ids: tuple[str, ...]
    created_at: datetime
    version: int = Field(default=1, ge=1)
    schema_version: int = Field(default=1, ge=1)

    @field_validator("id", "graph_id", "target_contract_id")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        return _require_non_empty(value)

    @field_validator("node_ids", "relationship_ids")
    @classmethod
    def require_non_empty_ids(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if not value:
            raise ValueError("must contain at least one id")
        for item in value:
            _require_non_empty(item)
        return value

    @field_validator("created_at")
    @classmethod
    def require_timezone_aware_datetime(cls, value: datetime) -> datetime:
        return _require_aware_datetime(value)

    @property
    def binding_hash(self) -> str:
        payload = json.dumps(
            self.model_dump(mode="json"), sort_keys=True, separators=(",", ":")
        ).encode()
        return hashlib.sha256(payload).hexdigest()


class ApprovalReceipt(ContractModel):
    """Human approval bound to one exact proposal and graph version."""

    id: str
    proposal_id: str
    proposal_version: int = Field(ge=1)
    graph_id: str
    graph_version: int = Field(ge=1)
    binding_hash: str
    approved_by: str
    approved_at: datetime
    schema_version: int = Field(default=1, ge=1)

    @field_validator("id", "proposal_id", "graph_id", "approved_by")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        return _require_non_empty(value)

    @field_validator("binding_hash")
    @classmethod
    def require_sha256_hash(cls, value: str) -> str:
        return SourceReceipt.require_sha256_hash(value)

    @field_validator("approved_at")
    @classmethod
    def require_timezone_aware_datetime(cls, value: datetime) -> datetime:
        return _require_aware_datetime(value)


class SimulationRun(ContractModel):
    """Reproducibility receipt for one simulation execution."""

    id: str
    graph_id: str
    graph_version: int = Field(ge=1)
    target_contract_id: str
    seed: int = Field(ge=0)
    sample_count: int = Field(gt=0)
    engine_version: str
    started_at: datetime
    provenance_ids: tuple[str, ...]
    classification: str
    schema_version: int = Field(default=1, ge=1)

    @field_validator(
        "id", "graph_id", "target_contract_id", "engine_version", "classification"
    )
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        return _require_non_empty(value)

    @field_validator("provenance_ids")
    @classmethod
    def require_non_empty_provenance_ids(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if not value:
            raise ValueError("must contain at least one provenance id")
        for item in value:
            _require_non_empty(item)
        return value

    @field_validator("started_at")
    @classmethod
    def require_timezone_aware_datetime(cls, value: datetime) -> datetime:
        return _require_aware_datetime(value)
