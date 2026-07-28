"""Explicit human evidence-review records for proposal-gated authoring."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict


ReviewStatus = Literal["included", "excluded"]


class ClaimReview(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    target_contract_id: str
    claim_id: str
    decision: ReviewStatus
    reviewed_by: str
    reason: str
    reviewed_at: datetime


class ClaimReviewBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    decision: ReviewStatus
    reviewed_by: str
    reason: str = ""


def make_claim_review(
    *, target_contract_id: str, claim_id: str, body: ClaimReviewBody
) -> ClaimReview:
    if not target_contract_id or not claim_id or not body.reviewed_by:
        raise ValueError("target, claim, and reviewed_by must be non-empty")
    return ClaimReview(
        target_contract_id=target_contract_id,
        claim_id=claim_id,
        decision=body.decision,
        reviewed_by=body.reviewed_by,
        reason=body.reason,
        reviewed_at=datetime.now(timezone.utc),
    )
