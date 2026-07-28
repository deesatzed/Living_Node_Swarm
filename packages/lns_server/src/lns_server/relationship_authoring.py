"""Validation boundary for proposed-only relationship authoring."""

from __future__ import annotations

from dataclasses import asdict

from pydantic import BaseModel, ConfigDict, field_validator

from lns_kernel.contracts import RelationshipContract
from lns_kernel.dependence import detect_dependence_warnings


class RelationshipValidationBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relationships: tuple[RelationshipContract, ...]

    @field_validator("relationships")
    @classmethod
    def require_proposed_relationships(
        cls, relationships: tuple[RelationshipContract, ...]
    ) -> tuple[RelationshipContract, ...]:
        if not relationships:
            raise ValueError("at least one relationship is required")
        if any(relationship.state != "proposed" for relationship in relationships):
            raise ValueError("relationship authoring accepts proposed relationships only")
        return relationships


def validate_proposed_relationships(body: RelationshipValidationBody) -> dict[str, object]:
    """Return pure validation results without persisting or activating graph structure."""

    return {
        "relationships": [relationship.model_dump(mode="json") for relationship in body.relationships],
        "dependence_warnings": [asdict(warning) for warning in detect_dependence_warnings(body.relationships)],
        "active_graph_mutated": False,
    }
