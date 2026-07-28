from pathlib import Path

from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def _settings(tmp_path: Path) -> Settings:
    return Settings(db_path=str(tmp_path / "graph.db"))


def _project_payload() -> dict[str, object]:
    return {
        "id": "nd-project",
        "name": "Neodymium retail one-year model",
        "stage": "idea",
        "evidence_classification": "fixture_unverified",
    }


def test_workspace_project_persists_lifecycle_ledger_scenario_and_monitoring_across_restart(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        created = client.post("/projects", json=_project_payload())
        updated = client.patch(
            "/projects/nd-project",
            json={
                "stage": "vet",
                "target_id": "fixture-nd-retail-2027",
                "discovery_ledger": [{"kind": "user_claim", "text": "Demand will rise."}],
                "research_consent": {"mode": "local_only", "provider": "none", "data_scope": "no content leaves this Mac"},
                "last_run": {"snapshot_id": "snapshot-1", "graph_version": "2"},
            },
        )
        scenario = client.post(
            "/projects/nd-project/scenarios",
            json={"id": "conservative", "name": "Conservative", "assumptions": {"demand": "lower"}},
        )
        draft = client.post("/projects/nd-project/drafts", json={"id": "draft-1", "base_graph_version": 1})
        monitoring = client.put(
            "/projects/nd-project/monitoring",
            json={"cadence": "weekly", "freshness_threshold_days": 14, "mode": "fixture"},
        )
        event = client.post(
            "/projects/nd-project/monitoring/fixture-events",
            json={"id": "fixture-stale-source", "severity": "warning", "message": "Source is stale."},
        )
        acknowledged = client.post("/projects/nd-project/monitoring/events/fixture-stale-source/acknowledge")

    assert created.status_code == 200, created.text
    assert updated.status_code == 200, updated.text
    assert scenario.status_code == 200, scenario.text
    assert draft.status_code == 200, draft.text
    assert monitoring.status_code == 200, monitoring.text
    assert event.status_code == 200, event.text
    assert acknowledged.status_code == 200, acknowledged.text
    assert acknowledged.json()["acknowledged_at"] is not None

    with TestClient(create_app(settings)) as restarted:
        projects = restarted.get("/projects")
        restored = restarted.get("/projects/nd-project")
        scenarios = restarted.get("/projects/nd-project/scenarios")
        restored_monitoring = restarted.get("/projects/nd-project/monitoring")

    assert [project["id"] for project in projects.json()["projects"]] == ["nd-project"]
    assert restored.json()["stage"] == "refine"
    assert restored.json()["draft_base_version"] == 1
    assert restored.json()["discovery_ledger"] == [{"kind": "user_claim", "text": "Demand will rise."}]
    assert restored.json()["research_consent"]["mode"] == "local_only"
    assert restored.json()["last_run"]["snapshot_id"] == "snapshot-1"
    assert scenarios.json()["scenarios"][0]["name"] == "Conservative"
    assert restored_monitoring.json()["events"][0]["evidence_classification"] == "fixture_unverified"
    assert restored_monitoring.json()["events"][0]["acknowledged_at"] is not None


def test_workspace_rejects_unknown_project_and_stale_draft_base(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        client.post("/projects", json={**_project_payload(), "active_graph_version": 2})
        missing = client.get("/projects/missing")
        stale = client.post(
            "/projects/nd-project/drafts",
            json={"id": "draft-1", "base_graph_version": 1},
        )

    assert missing.status_code == 404
    assert stale.status_code == 409


def test_workspace_scenarios_do_not_mutate_the_active_graph(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        graph = client.post("/graphs", json={"from_seed": True, "name": "active-model"}).json()["graph"]
        created = client.post(
            "/projects",
            json={
                **_project_payload(),
                "graph_id": graph["id"],
                "active_graph_version": graph["graph_version"],
            },
        )
        scenario = client.post(
            "/projects/nd-project/scenarios",
            json={"id": "upside", "name": "Upside", "assumptions": {"demand": "higher"}},
        )
        restored = client.get(f"/graphs/{graph['id']}")

    assert created.status_code == 200, created.text
    assert scenario.status_code == 200, scenario.text
    assert restored.status_code == 200, restored.text
    assert restored.json()["graph_version"] == graph["graph_version"]
    assert restored.json()["nodes"] == graph["nodes"]


def test_version_bound_parameter_scenario_executes_without_mutating_active_graph(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        graph = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        client.post("/projects", json={**_project_payload(), "graph_id": graph["id"], "active_graph_version": graph["graph_version"]})
        saved = client.post("/projects/nd-project/scenarios", json={
            "id": "demand-upside", "name": "Demand upside", "assumptions": {"note": "Higher demand signal."},
            "base_graph_version": graph["graph_version"], "target_node_id": "outcome",
            "parameter_overrides": {"input_signal": {"mu": 5.0}},
        })
        executed = client.post("/projects/nd-project/scenarios/demand-upside/simulate")
        active = client.get(f"/graphs/{graph['id']}")

    assert saved.status_code == 200, saved.text
    assert executed.status_code == 200, executed.text
    assert executed.json()["active_graph_mutated"] is False
    assert executed.json()["comparison"]["candidate_summary"]["mean"] != executed.json()["comparison"]["active_summary"]["mean"]
    assert active.json()["nodes"]["input_signal"]["parameters"] == graph["nodes"]["input_signal"]["parameters"]


def test_project_ensemble_persists_exact_member_versions_without_activation(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        first = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        second = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        client.post("/projects", json={**_project_payload(), "graph_id": first["id"], "active_graph_version": first["graph_version"]})
        saved = client.post("/projects/nd-project/ensembles", json={"id": "blend-1", "name": "Two-model blend", "members": [
            {"graph_id": first["id"], "graph_version": first["graph_version"], "target_node_id": "outcome", "weight": 1},
            {"graph_id": second["id"], "graph_version": second["graph_version"], "target_node_id": "outcome", "weight": 3},
        ]})

    with TestClient(create_app(settings)) as restarted:
        listed = restarted.get("/projects/nd-project/ensembles")
        project = restarted.get("/projects/nd-project")

    assert saved.status_code == 200, saved.text
    assert listed.json()["ensembles"][0]["members"][1]["graph_version"] == second["graph_version"]
    assert project.json()["active_graph_version"] == first["graph_version"]


def test_ensemble_approval_binds_saved_configuration_and_rejects_wrong_hash(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        graph = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        other = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        client.post("/projects", json={**_project_payload(), "graph_id": graph["id"], "active_graph_version": graph["graph_version"]})
        ensemble = client.post("/projects/nd-project/ensembles", json={"id": "blend", "name": "Blend", "members": [
            {"graph_id": graph["id"], "graph_version": graph["graph_version"], "target_node_id": "outcome", "weight": 1},
            {"graph_id": other["id"], "graph_version": other["graph_version"], "target_node_id": "outcome", "weight": 1},
        ]}).json()
        rejected = client.post("/projects/nd-project/ensembles/blend/approve", json={"approved_by": "operator", "binding_hash": "0" * 64})
        approved = client.post("/projects/nd-project/ensembles/blend/approve", json={"approved_by": "operator", "binding_hash": ensemble["binding_hash"]})
        active = client.get(f"/graphs/{graph['id']}")

    with TestClient(create_app(settings)) as restarted:
        receipts = restarted.get("/projects/nd-project/ensemble-approvals")

    assert rejected.status_code == 409
    assert approved.status_code == 200, approved.text
    assert approved.json()["approval_receipt"]["approved_by"] == "operator"
    assert approved.json()["active_graph_mutated"] is False
    assert receipts.status_code == 200, receipts.text
    assert receipts.json()["approval_receipts"] == [approved.json()["approval_receipt"]]
    assert active.json()["graph_version"] == graph["graph_version"]


def test_project_bound_approval_syncs_the_persisted_project_lifecycle(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        graph = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        project = client.post(
            "/projects",
            json={
                **_project_payload(),
                "graph_id": graph["id"],
                "active_graph_version": graph["graph_version"],
                "stage": "refine",
            },
        )
        proposal = client.post(
            f"/authoring/graphs/{graph['id']}/candidate-proposals",
            json={"candidate_parameter_overrides": {"input_signal": {"mu": 5.0}}},
        ).json()["proposal"]
        approved = client.post(
            f"/projects/nd-project/candidate-proposals/{proposal['id']}/approve",
            json={"approved_by": "operator", "binding_hash": proposal["binding_hash"]},
        )
        restored = client.get("/projects/nd-project")

    assert project.status_code == 200, project.text
    assert approved.status_code == 200, approved.text
    assert approved.json()["graph"]["graph_version"] == graph["graph_version"] + 1
    assert approved.json()["project"]["stage"] == "decide"
    assert approved.json()["project"]["active_graph_version"] == graph["graph_version"] + 1
    assert restored.json()["stage"] == "decide"
    assert restored.json()["active_graph_version"] == graph["graph_version"] + 1


def test_candidate_revisions_persist_without_mutating_the_active_graph(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        graph = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        client.post(
            "/projects",
            json={
                **_project_payload(),
                "graph_id": graph["id"],
                "active_graph_version": graph["graph_version"],
                "stage": "refine",
            },
        )
        saved = client.post(
            "/projects/nd-project/candidate-revisions",
            json={
                "id": "revision-1",
                "base_graph_version": graph["graph_version"],
                "candidate_parameter_overrides": {"input_signal": {"mu": 5.0, "sigma": 2.0}},
            },
        )
        active = client.get(f"/graphs/{graph['id']}")

    with TestClient(create_app(settings)) as restarted:
        revisions = restarted.get("/projects/nd-project/candidate-revisions")

    assert saved.status_code == 200, saved.text
    assert active.json()["nodes"]["input_signal"]["parameters"] == graph["nodes"]["input_signal"]["parameters"]
    assert revisions.json()["candidate_revisions"][0]["id"] == "revision-1"
    assert revisions.json()["candidate_revisions"][0]["candidate_parameter_overrides"]["input_signal"]["sigma"] == 2.0


def test_candidate_revision_persists_node_state_delta_without_mutating_active_graph(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        graph = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        client.post("/projects", json={**_project_payload(), "graph_id": graph["id"], "active_graph_version": graph["graph_version"], "stage": "refine"})
        saved = client.post("/projects/nd-project/candidate-revisions", json={
            "id": "exclude-input", "base_graph_version": graph["graph_version"],
            "candidate_node_state_overrides": {"input_signal": "excluded"},
        })
        invalid = client.post("/projects/nd-project/candidate-revisions", json={
            "id": "unknown-node", "base_graph_version": graph["graph_version"],
            "candidate_node_state_overrides": {"not-a-node": "excluded"},
        })
        active = client.get(f"/graphs/{graph['id']}")

    assert saved.status_code == 200, saved.text
    assert saved.json()["candidate_node_state_overrides"] == {"input_signal": "excluded"}
    assert invalid.status_code == 422
    assert active.json()["nodes"]["input_signal"]["status"] == graph["nodes"]["input_signal"]["status"]


def test_candidate_revision_persists_relationship_state_delta_without_mutating_active_graph(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        graph = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        client.post("/projects", json={**_project_payload(), "graph_id": graph["id"], "active_graph_version": graph["graph_version"], "stage": "refine"})
        saved = client.post("/projects/nd-project/candidate-revisions", json={
            "id": "exclude-dependency", "base_graph_version": graph["graph_version"],
            "candidate_relationship_state_overrides": {"input_signal:process_stage": "excluded"},
        })
        invalid = client.post("/projects/nd-project/candidate-revisions", json={
            "id": "unknown-dependency", "base_graph_version": graph["graph_version"],
            "candidate_relationship_state_overrides": {"input_signal:missing": "excluded"},
        })
        active = client.get(f"/graphs/{graph['id']}")

    assert saved.status_code == 200, saved.text
    assert saved.json()["candidate_relationship_state_overrides"] == {"input_signal:process_stage": "excluded"}
    assert invalid.status_code == 422
    assert active.json()["nodes"]["process_stage"]["depends_on"] == graph["nodes"]["process_stage"]["depends_on"]


def test_candidate_revision_persists_proposed_new_node_without_mutating_active_graph(tmp_path: Path):
    settings = _settings(tmp_path)
    with TestClient(create_app(settings)) as client:
        graph = client.post("/graphs", json={"from_seed": True}).json()["graph"]
        client.post("/projects", json={**_project_payload(), "graph_id": graph["id"], "active_graph_version": graph["graph_version"], "stage": "refine"})
        saved = client.post("/projects/nd-project/candidate-revisions", json={
            "id": "new-factor", "base_graph_version": graph["graph_version"], "candidate_new_nodes": [{"id": "candidate_signal", "name": "Candidate signal", "distribution_family": "Normal", "parameters": {"mu": 0.0, "sigma": 1.0}, "depends_on": [], "transform": "none", "status": "proposed", "requires_human_approval": True}],
        })
        duplicate = client.post("/projects/nd-project/candidate-revisions", json={
            "id": "duplicate-factor", "base_graph_version": graph["graph_version"], "candidate_new_nodes": [{"id": "input_signal", "name": "Duplicate", "distribution_family": "Normal", "parameters": {"mu": 0.0, "sigma": 1.0}, "depends_on": [], "transform": "none", "status": "proposed", "requires_human_approval": True}],
        })
        active = client.get(f"/graphs/{graph['id']}")
    assert saved.status_code == 200, saved.text
    assert saved.json()["candidate_new_nodes"][0]["id"] == "candidate_signal"
    assert duplicate.status_code == 422
    assert "candidate_signal" not in active.json()["nodes"]
