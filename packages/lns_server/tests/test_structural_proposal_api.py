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


def test_exact_structural_proposal_approval_activates_the_trial_atomically(tmp_path):
    with TestClient(create_app(Settings(db_path=str(tmp_path / "graph.db")))) as client:
        active = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        proposal = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals",
            json={"relationships": [structural_relationship()]},
        ).json()["proposal"]
        approved = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals/{proposal['id']}/approve",
            json={"approved_by": "operator", "binding_hash": proposal["binding_hash"]},
        )
        activated = client.get(f"/graphs/{active['id']}").json()

    assert approved.status_code == 200, approved.text
    assert approved.json()["approval_receipt"]["binding_hash"] == proposal["binding_hash"]
    assert activated["graph_version"] == active["graph_version"] + 1
    assert activated["nodes"]["outcome"]["depends_on"] == ["process_stage", "input_signal"]
    assert activated["nodes"]["outcome"]["transform_params"]["a2"] == 0.2
    assert activated["relationships"]["input-to-outcome-proposal"]["state"] == "active"


def test_structural_proposal_is_invalidated_by_an_intervening_graph_edit(tmp_path):
    with TestClient(create_app(Settings(db_path=str(tmp_path / "graph.db")))) as client:
        active = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        proposal = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals",
            json={"relationships": [structural_relationship()]},
        ).json()["proposal"]
        assert client.patch(
            f"/graphs/{active['id']}/nodes/input_signal",
            json={"parameters": {"mu": 4.0}, "run_sim": False},
        ).status_code == 200
        rejected = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals/{proposal['id']}/approve",
            json={"approved_by": "operator", "binding_hash": proposal["binding_hash"]},
        )
        unchanged = client.get(f"/graphs/{active['id']}").json()

    assert rejected.status_code == 409
    assert "invalidated" in rejected.json()["detail"]
    assert "input-to-outcome-proposal" not in unchanged["relationships"]


def test_structural_proposal_shadow_simulates_its_exact_trial_without_activation(tmp_path):
    with TestClient(create_app(Settings(db_path=str(tmp_path / "graph.db")))) as client:
        active = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        proposal = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals",
            json={"relationships": [structural_relationship()]},
        ).json()["proposal"]
        comparison = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals/{proposal['id']}/shadow-simulate",
            json={"target_node_id": "outcome", "seed": 42, "n_samples": 1000},
        )
        unchanged = client.get(f"/graphs/{active['id']}").json()

    assert comparison.status_code == 200, comparison.text
    payload = comparison.json()
    assert payload["active_graph_mutated"] is False
    assert payload["candidate_relationship_ids"] == ["input-to-outcome-proposal"]
    assert payload["active_summary"]["mean"] != payload["candidate_summary"]["mean"]
    assert unchanged["graph_version"] == active["graph_version"]
    assert unchanged["nodes"]["outcome"]["depends_on"] == ["process_stage"]


def test_structural_proposal_can_remove_an_exact_active_relationship_without_mutating_until_approval(tmp_path):
    with TestClient(create_app(Settings(db_path=str(tmp_path / "graph.db")))) as client:
        active = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        addition = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals",
            json={"relationships": [structural_relationship()]},
        ).json()["proposal"]
        assert client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals/{addition['id']}/approve",
            json={"approved_by": "operator", "binding_hash": addition["binding_hash"]},
        ).status_code == 200
        activated = client.get(f"/graphs/{active['id']}").json()
        removal = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals",
            json={"relationships": [], "removed_relationship_ids": ["input-to-outcome-proposal"]},
        )
        assert removal.status_code == 200, removal.text
        removal_proposal = removal.json()["proposal"]
        unchanged = client.get(f"/graphs/{active['id']}").json()
        approved = client.post(
            f"/authoring/graphs/{active['id']}/structural-proposals/{removal_proposal['id']}/approve",
            json={"approved_by": "operator", "binding_hash": removal_proposal["binding_hash"]},
        )

    assert removal.status_code == 200, removal.text
    assert removal.json()["proposal"]["removed_relationship_ids"] == ["input-to-outcome-proposal"]
    assert unchanged["graph_version"] == activated["graph_version"]
    assert unchanged["nodes"]["outcome"]["depends_on"] == ["process_stage", "input_signal"]
    assert approved.status_code == 200, approved.text
    assert approved.json()["graph"]["nodes"]["outcome"]["depends_on"] == ["process_stage"]
    assert "input-to-outcome-proposal" not in approved.json()["graph"]["relationships"]
