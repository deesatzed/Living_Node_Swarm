"""Stable JSON Schema export for the public Gate 0 authoring contracts."""

from __future__ import annotations

from typing import TypeAlias

from pydantic import BaseModel

from lns_kernel.contracts import (
    ApprovalReceipt,
    DistributionSpec,
    EvidenceClaim,
    GraphProposal,
    RelationshipContract,
    SimulationRun,
    SourceReceipt,
    TargetContract,
)

ContractModelType: TypeAlias = type[BaseModel]

CONTRACT_MODELS: dict[str, ContractModelType] = {
    "TargetContract": TargetContract,
    "SourceReceipt": SourceReceipt,
    "EvidenceClaim": EvidenceClaim,
    "DistributionSpec": DistributionSpec,
    "RelationshipContract": RelationshipContract,
    "GraphProposal": GraphProposal,
    "ApprovalReceipt": ApprovalReceipt,
    "SimulationRun": SimulationRun,
}


def contract_json_schemas() -> dict[str, dict[str, object]]:
    """Return a fresh JSON-schema mapping for all versioned Gate 0 contracts."""

    return {name: model.model_json_schema() for name, model in CONTRACT_MODELS.items()}
