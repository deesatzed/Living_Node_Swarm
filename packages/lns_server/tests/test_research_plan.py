from datetime import datetime, timezone
from pathlib import Path
import tempfile

from lns_kernel.contracts import SourceReceipt
from lns_server.evidence_store import EvidenceStore
from lns_server.research_plan import ResearchPlan, assess_research_completeness


def source(id: str, publisher: str) -> SourceReceipt:
    return SourceReceipt(
        id=id,
        canonical_url=f"https://{id}.example/research",
        publisher=publisher,
        retrieved_at=datetime(2026, 7, 27, tzinfo=timezone.utc),
        content_hash=("a" * 64),
        source_type="web_page",
    )


def plan() -> ResearchPlan:
    return ResearchPlan(
        id="research-nd-1",
        target_contract_id="nd-retail-2027",
        max_sources=5,
        max_total_bytes=100_000,
        max_duration_seconds=120,
        minimum_distinct_publishers=3,
        require_contradiction_search=True,
        saturation_zero_claim_sources=2,
    )


def test_report_records_diversity_contradiction_and_saturation_outcome():
    report = assess_research_completeness(
        plan(),
        sources=[source("sourcea", "A"), source("sourceb", "B"), source("sourcec", "C")],
        new_claim_counts=(3, 0, 0),
        contradiction_search_completed=True,
        total_bytes=10_000,
        elapsed_seconds=20,
    )

    assert report.distinct_publishers == 3
    assert report.contradiction_search_completed is True
    assert report.saturation_state == "saturated"
    assert report.gaps == ()


def test_partial_report_exposes_budget_diversity_contradiction_and_saturation_gaps_and_persists():
    report = assess_research_completeness(
        plan(),
        sources=[source("sourced", "A"), source("sourcee", "A")],
        new_claim_counts=(1, 0, 0),
        contradiction_search_completed=False,
        total_bytes=100_001,
        elapsed_seconds=121,
    )

    assert report.saturation_state == "saturated"
    assert report.budget_exhausted is True
    assert "source diversity below required minimum" in report.gaps
    assert "contradiction search not completed" in report.gaps

    with tempfile.TemporaryDirectory() as td:
        store = EvidenceStore(Path(td) / "evidence.db")
        store.save_research_completeness_report(report)
        assert store.get_research_completeness_report(report.id) == report
        store.close()
