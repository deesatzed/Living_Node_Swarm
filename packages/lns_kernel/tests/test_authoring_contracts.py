from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

import lns_kernel.contracts as contracts


def contract_type(name: str):
    value = getattr(contracts, name, None)
    assert value is not None, f"lns_kernel.contracts must define {name}"
    return value


def utc_now() -> datetime:
    return datetime(2026, 7, 27, 12, 0, tzinfo=timezone.utc)


def source_receipt():
    return contract_type("SourceReceipt")(
        id="source-nd-retail",
        canonical_url="https://strategicmetalsinvest.com/neodymium-prices/",
        publisher="Strategic Metals Invest",
        retrieved_at=utc_now(),
        content_hash="a" * 64,
        source_type="web_page",
        commercial_interest="sells physical neodymium",
    )


def test_evidence_claim_distinguishes_retrieved_from_model_inference():
    EvidenceClaim = contract_type("EvidenceClaim")
    EvidenceClass = contract_type("EvidenceClass")

    retrieved = EvidenceClaim(
        id="claim-retail-price",
        classification=EvidenceClass.RETRIEVED,
        claim_text="The displayed series is a private-investor retail price.",
        source_receipt_id=source_receipt().id,
    )
    inferred = EvidenceClaim(
        id="claim-supply-risk",
        classification=EvidenceClass.INFERRED,
        claim_text="Supply concentration may increase tail risk.",
    )

    assert retrieved.source_receipt_id == "source-nd-retail"
    assert inferred.source_receipt_id is None
    assert retrieved.classification != inferred.classification


def test_evidence_claim_preserves_explicit_conflicts():
    EvidenceClaim = contract_type("EvidenceClaim")
    EvidenceClass = contract_type("EvidenceClass")

    claim = EvidenceClaim(
        id="claim-demand-growth",
        classification=EvidenceClass.RETRIEVED,
        claim_text="Demand will grow materially in the forecast period.",
        source_receipt_id=source_receipt().id,
        conflicts_with_claim_ids=("claim-demand-contraction",),
    )

    restored = EvidenceClaim.model_validate_json(claim.model_dump_json())
    assert restored.conflicts_with_claim_ids == ("claim-demand-contraction",)


def test_affine_relationship_requires_coefficient_units():
    RelationshipContract = contract_type("RelationshipContract")
    RelationshipType = contract_type("RelationshipType")

    with pytest.raises(ValidationError, match="coefficient_units"):
        RelationshipContract(
            id="rel-demand-price",
            parent_node_id="ev_demand",
            child_node_id="nd_price",
            relationship_type=RelationshipType.CAUSAL_HYPOTHESIS,
            transform="affine",
            source_unit="vehicles/year",
            target_unit="USD/kg",
            sign="positive",
            lag_periods=1,
        )


def graph_proposal(*, node_ids: tuple[str, ...] = ("nd_price",)):
    GraphProposal = contract_type("GraphProposal")
    return GraphProposal(
        id="proposal-nd-1",
        graph_id="graph-nd",
        graph_version=4,
        target_contract_id="target-nd-2027",
        node_ids=node_ids,
        relationship_ids=("rel-demand-price",),
        created_at=utc_now(),
    )


def test_approval_binds_graph_and_proposal_versions():
    ApprovalReceipt = contract_type("ApprovalReceipt")
    proposal = graph_proposal()

    receipt = ApprovalReceipt(
        id="approval-1",
        proposal_id=proposal.id,
        proposal_version=proposal.version,
        graph_id=proposal.graph_id,
        graph_version=proposal.graph_version,
        binding_hash=proposal.binding_hash,
        approved_by="human",
        approved_at=utc_now(),
    )

    assert receipt.graph_version == 4
    assert receipt.binding_hash == proposal.binding_hash


def test_proposal_binding_hash_changes_after_structural_edit():
    original = graph_proposal()
    changed = graph_proposal(node_ids=("nd_price", "china_refining_capacity"))

    assert original.binding_hash != changed.binding_hash


def test_simulation_run_records_seed_engine_and_provenance():
    SimulationRun = contract_type("SimulationRun")

    run = SimulationRun(
        id="run-nd-1",
        graph_id="graph-nd",
        graph_version=4,
        target_contract_id="target-nd-2027",
        seed=42,
        sample_count=10_000,
        engine_version="0.2.0",
        started_at=utc_now(),
        provenance_ids=("source-nd-retail", "approval-1"),
        classification="hypothesis_only",
    )

    assert run.seed == 42
    assert run.provenance_ids == ("source-nd-retail", "approval-1")
