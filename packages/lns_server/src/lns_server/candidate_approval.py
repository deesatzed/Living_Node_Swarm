"""Version-bound candidate parameter proposals and human approval records."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

from lns_kernel.contracts import ApprovalReceipt


class CandidateProposalBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_parameter_overrides: dict[str, dict[str, float]]


class CandidateApprovalProposal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    graph_id: str
    graph_version: int = Field(ge=1)
    candidate_parameter_overrides: dict[str, dict[str, float]]
    created_at: datetime
    version: int = 1

    @property
    def binding_hash(self) -> str:
        payload = json.dumps(self.model_dump(mode="json"), sort_keys=True, separators=(",", ":")).encode()
        return hashlib.sha256(payload).hexdigest()

    def response_payload(self) -> dict[str, object]:
        return {**self.model_dump(mode="json"), "binding_hash": self.binding_hash}


class ApproveCandidateBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    approved_by: str
    binding_hash: str


def make_candidate_proposal(
    *, graph_id: str, graph_version: int, body: CandidateProposalBody
) -> CandidateApprovalProposal:
    if not body.candidate_parameter_overrides:
        raise ValueError("candidate proposal must include at least one parameter override")
    return CandidateApprovalProposal(
        id=str(uuid.uuid4()),
        graph_id=graph_id,
        graph_version=graph_version,
        candidate_parameter_overrides=body.candidate_parameter_overrides,
        created_at=datetime.now(timezone.utc),
    )


def make_approval_receipt(
    proposal: CandidateApprovalProposal, body: ApproveCandidateBody
) -> ApprovalReceipt:
    if not body.approved_by:
        raise ValueError("approved_by must be non-empty")
    if body.binding_hash != proposal.binding_hash:
        raise ValueError("approval binding hash does not match candidate proposal")
    return ApprovalReceipt(
        id=str(uuid.uuid4()),
        proposal_id=proposal.id,
        proposal_version=proposal.version,
        graph_id=proposal.graph_id,
        graph_version=proposal.graph_version,
        binding_hash=proposal.binding_hash,
        approved_by=body.approved_by,
        approved_at=datetime.now(timezone.utc),
    )
