from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def test_shadow_simulation_returns_paired_runs_without_mutating_active_graph(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db"), n_samples=300, mc_seed=7))
    with TestClient(app) as client:
        graph = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        graph_id = graph["id"]
        before = client.get(f"/graphs/{graph_id}").json()["nodes"]["input_signal"]["parameters"]["mu"]
        response = client.post(
            f"/authoring/graphs/{graph_id}/shadow-simulate",
            json={"target_node_id": "outcome", "candidate_parameter_overrides": {"input_signal": {"mu": 5.0}}},
        )
        after = client.get(f"/graphs/{graph_id}").json()["nodes"]["input_signal"]["parameters"]["mu"]

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["active_run_id"] != payload["candidate_run_id"]
    assert payload["active_graph_mutated"] is False
    assert before == after
    assert payload["active_summary"]["p50"] != payload["candidate_summary"]["p50"]


def test_shadow_simulation_rejects_unknown_candidate_node(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        graph_id = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
        response = client.post(
            f"/authoring/graphs/{graph_id}/shadow-simulate",
            json={"target_node_id": "outcome", "candidate_parameter_overrides": {"missing": {"mu": 5.0}}},
        )
    assert response.status_code == 400
