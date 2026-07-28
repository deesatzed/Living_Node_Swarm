"""Fixture-only end-to-end authoring journey; does not claim live Neodymium research."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from lns_kernel.contracts import EvidenceClaim, EvidenceClass, SourceReceipt
from lns_server.app import create_app
from lns_server.settings import Settings


def target_body() -> dict[str, object]:
    return {
        "id": "nd-retail-2027",
        "question": "Neodymium private-investor retail price in one year",
        "target_node_id": "outcome",
        "forecast_origin": datetime(2026, 7, 28, tzinfo=timezone.utc).isoformat(),
        "resolution_at": datetime(2027, 7, 28, tzinfo=timezone.utc).isoformat(),
        "product": "neodymium",
        "grade": "private-investor retail series",
        "price_basis": "retail",
        "geography": "publisher series",
        "currency": "USD",
        "unit": "USD/kg",
        "oracle_url": "https://strategicmetalsinvest.com/neodymium-prices/",
        "observation_rule": "first published value on resolution date",
        "missing_source_fallback": "unresolved",
        "revision_policy": "use first captured value",
    }


def test_fixture_generalized_authoring_journey_is_reviewed_and_approval_gated(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db"), n_samples=300))
    with TestClient(app) as client:
        assert client.post("/targets", json=target_body()).status_code == 200
        store = client.app.state.evidence_store
        store.save_source_receipt(
            SourceReceipt(
                id="fixture-source",
                canonical_url="https://public.example/fixture",
                publisher="Fixture publisher",
                retrieved_at=datetime(2026, 7, 28, tzinfo=timezone.utc),
                content_hash="a" * 64,
                source_type="fixture",
            )
        )
        store.save_evidence_claim(
            EvidenceClaim(
                id="fixture-claim",
                classification=EvidenceClass.RETRIEVED,
                claim_text="Fixture demand signal.",
                source_receipt_id="fixture-source",
            )
        )
        assert client.post(
            "/research/targets/nd-retail-2027/claims/fixture-claim/review",
            json={"decision": "included", "reviewed_by": "human"},
        ).status_code == 200
        candidates = client.post("/authoring/targets/nd-retail-2027/candidate-proposals/fixture").json()
        assert len(candidates["factors"]) == 15
        elicited = client.post(
            "/authoring/distributions/elicit",
            json={
                "id": "fixture-prior",
                "family_id": "LogNormal",
                "median": 100,
                "p90": 180,
                "as_of": datetime(2026, 7, 28, tzinfo=timezone.utc).isoformat(),
                "confidence_rationale": "fixture",
            },
        )
        assert elicited.status_code == 200
        graph_id = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
        shadow = client.post(
            f"/authoring/graphs/{graph_id}/shadow-simulate",
            json={"target_node_id": "outcome", "candidate_parameter_overrides": {"input_signal": {"mu": 5}}},
        )
        assert shadow.status_code == 200
        proposed = client.post(
            f"/authoring/graphs/{graph_id}/candidate-proposals",
            json={"candidate_parameter_overrides": {"input_signal": {"mu": 5}}},
        ).json()["proposal"]
        approved = client.post(
            f"/authoring/graphs/{graph_id}/candidate-proposals/{proposed['id']}/approve",
            json={"approved_by": "human", "binding_hash": proposed["binding_hash"]},
        )

    assert approved.status_code == 200, approved.text
    assert approved.json()["graph"]["nodes"]["input_signal"]["parameters"]["mu"] == 5
