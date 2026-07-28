from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from lns_kernel.contracts import EvidenceClaim, EvidenceClass, SourceReceipt
from lns_server.app import create_app
from lns_server.settings import Settings


def test_research_review_requires_explicit_claim_decision_before_authoring(tmp_path: Path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        store = client.app.state.evidence_store
        store.save_source_receipt(
            SourceReceipt(
                id="source-nd",
                canonical_url="https://public.example/neodymium",
                publisher="Fixture publisher",
                retrieved_at=datetime(2026, 7, 27, tzinfo=timezone.utc),
                content_hash="a" * 64,
                source_type="fixture",
            )
        )
        store.save_evidence_claim(
            EvidenceClaim(
                id="claim-supply",
                classification=EvidenceClass.RETRIEVED,
                claim_text="Supply concentration is a risk factor.",
                source_receipt_id="source-nd",
                conflicts_with_claim_ids=("claim-supply-relief",),
            )
        )

        before = client.get("/research/targets/nd-retail-2027/review")
        decision = client.post(
            "/research/targets/nd-retail-2027/claims/claim-supply/review",
            json={"decision": "included", "reviewed_by": "human", "reason": "plausible but uncertain"},
        )
        after = client.get("/research/targets/nd-retail-2027/review")

    assert before.status_code == 200
    assert before.json()["claims"][0]["review_status"] == "unreviewed"
    assert decision.status_code == 200
    assert after.json()["claims"][0]["review_status"] == "included"
    assert after.json()["claims"][0]["source"]["publisher"] == "Fixture publisher"
    assert after.json()["claims"][0]["conflicts_with_claim_ids"] == ["claim-supply-relief"]
