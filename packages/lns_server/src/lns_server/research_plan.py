"""Bounded research planning and visible completeness reporting."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

from lns_kernel.contracts import SourceReceipt


class ResearchPlan(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    target_contract_id: str
    max_sources: int = Field(gt=0)
    max_total_bytes: int = Field(gt=0)
    max_duration_seconds: float = Field(gt=0)
    minimum_distinct_publishers: int = Field(gt=0)
    require_contradiction_search: bool = True
    saturation_zero_claim_sources: int = Field(gt=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ResearchCompletenessReport(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    plan_id: str
    source_count: int
    distinct_publishers: int
    contradiction_search_completed: bool
    saturation_state: str
    budget_exhausted: bool
    total_bytes: int
    elapsed_seconds: float
    gaps: tuple[str, ...]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def assess_research_completeness(
    plan: ResearchPlan,
    *,
    sources: list[SourceReceipt],
    new_claim_counts: tuple[int, ...],
    contradiction_search_completed: bool,
    total_bytes: int,
    elapsed_seconds: float,
) -> ResearchCompletenessReport:
    """Produce an honest bounded-research receipt; it never equates saturation with truth."""

    if total_bytes < 0 or elapsed_seconds < 0 or any(count < 0 for count in new_claim_counts):
        raise ValueError("research usage and new claim counts must be non-negative")
    publishers = {source.publisher.strip().lower() for source in sources}
    saturated = (
        len(new_claim_counts) >= plan.saturation_zero_claim_sources
        and all(count == 0 for count in new_claim_counts[-plan.saturation_zero_claim_sources :])
    )
    budget_exhausted = (
        len(sources) >= plan.max_sources
        or total_bytes >= plan.max_total_bytes
        or elapsed_seconds >= plan.max_duration_seconds
    )
    gaps: list[str] = []
    if len(publishers) < plan.minimum_distinct_publishers:
        gaps.append("source diversity below required minimum")
    if plan.require_contradiction_search and not contradiction_search_completed:
        gaps.append("contradiction search not completed")
    if budget_exhausted:
        gaps.append("research budget exhausted before all gaps were resolved")
    if not saturated:
        gaps.append("claim discovery has not reached configured saturation")
    return ResearchCompletenessReport(
        id=f"{plan.id}:completeness",
        plan_id=plan.id,
        source_count=len(sources),
        distinct_publishers=len(publishers),
        contradiction_search_completed=contradiction_search_completed,
        saturation_state="saturated" if saturated else "not_saturated",
        budget_exhausted=budget_exhausted,
        total_bytes=total_bytes,
        elapsed_seconds=elapsed_seconds,
        gaps=tuple(gaps),
    )
