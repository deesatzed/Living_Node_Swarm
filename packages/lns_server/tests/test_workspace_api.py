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
            },
        )
        scenario = client.post(
            "/projects/nd-project/scenarios",
            json={"id": "conservative", "name": "Conservative", "assumptions": {"demand": "lower"}},
        )
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
    assert restored.json()["stage"] == "vet"
    assert restored.json()["discovery_ledger"] == [{"kind": "user_claim", "text": "Demand will rise."}]
    assert restored.json()["research_consent"]["mode"] == "local_only"
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
