from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def structural_relationship() -> dict[str, object]:
    return {
        "id": "input-to-outcome-proposal",
        "parent_node_id": "input_signal",
        "child_node_id": "outcome",
        "relationship_type": "scenario_assumption",
        "transform": "affine",
        "source_unit": "index",
        "target_unit": "index",
        "sign": "positive",
        "lag_periods": 0,
        "coefficient_units": "1",
        "coefficient_parameters": [{"id": "coefficient", "value": 0.2}],
        "state": "proposed",
    }


def test_structural_proposal_validates_exact_active_graph_without_mutating_it(tmp_path):
    with TestClient(create_app(Settings(db_path=str(tmp_path / "graph.db")))) as client:
        active = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        response = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals",
            json={"relationships": [structural_relationship()]},
        )
        unchanged = client.get(f"/graphs/{active['id']}").json()

    assert response.status_code == 200, response.text
    proposal = response.json()["proposal"]
    assert proposal["graph_id"] == active["id"]
    assert proposal["graph_version"] == active["graph_version"]
    assert proposal["candidate_relationship_ids"] == ["input-to-outcome-proposal"]
    assert proposal["relationships"][0]["state"] == "proposed"
    assert proposal["binding_hash"]
    assert response.json()["active_graph_mutated"] is False
    assert unchanged["graph_version"] == active["graph_version"]
    assert unchanged["nodes"]["outcome"]["depends_on"] == ["process_stage"]


def test_structural_proposal_survives_restart_as_a_proposed_non_active_record(tmp_path):
    settings = Settings(db_path=str(tmp_path / "graph.db"))
    with TestClient(create_app(settings)) as client:
        active = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        proposal = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals",
            json={"relationships": [structural_relationship()]},
        ).json()["proposal"]

    with TestClient(create_app(settings)) as restarted:
        stored = restarted.app.state.evidence_store.get_structural_graph_proposal(proposal["id"])
        active_after_restart = restarted.get(f"/graphs/{active['id']}").json()

    assert stored is not None
    assert stored.binding_hash == proposal["binding_hash"]
    assert stored.relationships[0].state == "proposed"
    assert active_after_restart["nodes"]["outcome"]["depends_on"] == ["process_stage"]
