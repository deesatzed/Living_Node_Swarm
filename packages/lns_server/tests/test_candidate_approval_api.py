from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def create_proposal(client: TestClient, graph_id: str) -> dict[str, object]:
    response = client.post(
        f"/authoring/graphs/{graph_id}/candidate-proposals",
        json={"candidate_parameter_overrides": {"input_signal": {"mu": 5.0}}},
    )
    assert response.status_code == 200, response.text
    return response.json()["proposal"]


def test_candidate_approval_binds_hash_and_activates_atomically(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        graph_id = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
        proposal = create_proposal(client, graph_id)
        response = client.post(
            f"/authoring/graphs/{graph_id}/candidate-proposals/{proposal['id']}/approve",
            json={"approved_by": "human", "binding_hash": proposal["binding_hash"]},
        )
        active = client.get(f"/graphs/{graph_id}").json()

    assert response.status_code == 200, response.text
    assert response.json()["approval_receipt"]["binding_hash"] == proposal["binding_hash"]
    assert active["nodes"]["input_signal"]["parameters"]["mu"] == 5.0


def test_graph_edit_invalidates_unapproved_candidate_version(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        graph_id = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
        proposal = create_proposal(client, graph_id)
        assert client.patch(
            f"/graphs/{graph_id}/nodes/input_signal", json={"parameters": {"mu": 4.0}, "run_sim": False}
        ).status_code == 200
        response = client.post(
            f"/authoring/graphs/{graph_id}/candidate-proposals/{proposal['id']}/approve",
            json={"approved_by": "human", "binding_hash": proposal["binding_hash"]},
        )

    assert response.status_code == 409
    assert "invalidated" in response.json()["detail"]


def test_distribution_candidate_approval_persists_exact_provenance_and_parameters(tmp_path):
    settings = Settings(db_path=str(tmp_path / "graph.db"))
    app = create_app(settings)
    with TestClient(app) as client:
        graph_id = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
        proposed = client.post(
            f"/authoring/graphs/{graph_id}/candidate-proposals",
            json={
                "candidate_parameter_overrides": {"input_signal": {"mu": 5.0, "sigma": 2.0}},
                "candidate_distribution_specs": {
                    "input_signal": {
                        "id": "input-signal-median-p90",
                        "family_id": "Normal",
                        "parameters": [{"id": "loc", "value": 5.0}, {"id": "scale", "value": 2.0}],
                        "elicitation_method": "median_p90_quantile_match",
                        "evidence_claim_ids": [],
                        "as_of": "2026-07-28T00:00:00Z",
                        "confidence_rationale": "Operator supplied a reviewed range.",
                    }
                },
            },
        )
        assert proposed.status_code == 200, proposed.text
        proposal = proposed.json()["proposal"]
        approved = client.post(
            f"/authoring/graphs/{graph_id}/candidate-proposals/{proposal['id']}/approve",
            json={"approved_by": "human", "binding_hash": proposal["binding_hash"]},
        )
        active = client.get(f"/graphs/{graph_id}").json()

    with TestClient(create_app(settings)) as restarted:
        restored = restarted.get(f"/graphs/{graph_id}").json()

    assert approved.status_code == 200, approved.text
    node = active["nodes"]["input_signal"]
    assert node["parameters"] == {"mu": 5.0, "sigma": 2.0}
    assert node["distribution_spec_id"] == "input-signal-median-p90"
    assert node["distribution_spec"]["confidence_rationale"] == "Operator supplied a reviewed range."
    assert restored["nodes"]["input_signal"]["distribution_spec"] == node["distribution_spec"]
