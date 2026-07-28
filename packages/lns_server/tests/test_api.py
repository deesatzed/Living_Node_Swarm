import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


@pytest.fixture()
def client(tmp_path: Path):
    settings = Settings(
        host="127.0.0.1",
        db_path=str(tmp_path / "test.db"),
        n_samples=400,
        mc_seed=11,
        openrouter_api_key=None,
        openrouter_model=None,
    )
    app = create_app(settings)
    with TestClient(app) as c:
        yield c


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert r.json()["host"] == "127.0.0.1"


def test_create_seed_patch_changes_outcome(client: TestClient):
    r = client.post("/graphs", json={"from_seed": True, "name": "t"})
    assert r.status_code == 200
    body = r.json()
    gid = body["graph"]["id"]
    q0 = body["snapshot"]["node_predictives"]["outcome"]["quantiles"]["p50"]

    r2 = client.patch(
        f"/graphs/{gid}/nodes/input_signal",
        json={"parameters": {"mu": 5.0}, "run_sim": True},
    )
    assert r2.status_code == 200
    q1 = r2.json()["snapshot"]["node_predictives"]["outcome"]["quantiles"]["p50"]
    assert abs(q1 - q0) > 1.0
    assert r2.json()["sim_status"]["freshness"] == "fresh"
    assert len(r2.json()["event"]["diff_summary"]["parameters_after"]) >= 1


def test_snapshot_history_returns_persisted_receipts_newest_first(client: TestClient):
    created = client.post("/graphs", json={"from_seed": True})
    graph_id = created.json()["graph"]["id"]
    first_snapshot = created.json()["snapshot"]["id"]
    second_snapshot = client.post(f"/graphs/{graph_id}/sim/run").json()["snapshot"]["id"]

    history = client.get(f"/graphs/{graph_id}/snapshots?limit=2")

    assert history.status_code == 200, history.text
    assert [snapshot["id"] for snapshot in history.json()["snapshots"]] == [second_snapshot, first_snapshot]


def test_transform_experiment(client: TestClient):
    gid = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
    r = client.post(
        f"/graphs/{gid}/experiments/transforms",
        json={"node_id": "process_stage", "n_samples": 500},
    )
    assert r.status_code == 200
    data = r.json()
    assert len(data["results"]) == 3
    assert data["recommendation"] in {"affine", "sum_parents", "mean_parents"}


def test_local_sensitivity_is_non_mutating_and_reports_method_limits(client: TestClient):
    created = client.post("/graphs", json={"from_seed": True})
    graph_id = created.json()["graph"]["id"]
    active_parameters = created.json()["graph"]["nodes"]["input_signal"]["parameters"]

    report = client.post(f"/graphs/{graph_id}/analysis/local-sensitivity", json={"target_node_id": "outcome", "perturbation_fraction": 0.1, "n_samples": 300})
    active = client.get(f"/graphs/{graph_id}")

    assert report.status_code == 200, report.text
    assert report.json()["method"] == "one_at_a_time_local_finite_difference"
    assert report.json()["active_graph_mutated"] is False
    assert report.json()["rows"]
    assert any("not causal attribution" in limitation for limitation in report.json()["limitations"])
    assert active.json()["nodes"]["input_signal"]["parameters"] == active_parameters


def test_weighted_ensemble_binds_member_versions_and_returns_distribution_mixture(client: TestClient):
    first = client.post("/graphs", json={"from_seed": True}).json()["graph"]
    second = client.post("/graphs", json={"from_seed": True}).json()["graph"]
    result = client.post("/analysis/weighted-ensemble", json={
        "members": [
            {"graph_id": first["id"], "graph_version": first["graph_version"], "target_node_id": "outcome", "weight": 1},
            {"graph_id": second["id"], "graph_version": second["graph_version"], "target_node_id": "outcome", "weight": 3},
        ], "seed": 7, "n_samples": 300,
    })

    assert result.status_code == 200, result.text
    assert result.json()["active_graph_mutated"] is False
    assert result.json()["members"][0]["normalized_weight"] == 0.25
    assert result.json()["members"][1]["normalized_weight"] == 0.75
    assert result.json()["mixture"]["n_samples"] == 300
    assert "not an arithmetic average" in result.json()["limitations"][0]


def test_ai_propose_requires_key_and_model(client: TestClient):
    gid = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
    r = client.post(f"/graphs/{gid}/ai/propose-node", json={"hint": "add factor"})
    assert r.status_code == 400
    assert "OPENROUTER" in r.json()["detail"].upper() or "model" in r.json()["detail"].lower() or "API" in r.json()["detail"]


def test_wire_into_chain(client: TestClient):
    from lns_kernel.models import DistributionFamily, Node, NodeStatus

    gid = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
    store = client.app.state.store
    store.add_node(
        gid,
        Node(
            id="capacity",
            name="Capacity",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 3.0, "sigma": 0.2},
            status=NodeStatus.ACTIVE,
        ),
        actor="test",
        reason="add",
    )
    r = client.post(
        f"/graphs/{gid}/nodes/capacity/wire",
        json={"child_id": "process_stage", "weight": 1.0},
    )
    assert r.status_code == 200, r.text
    deps = r.json()["graph"]["nodes"]["process_stage"]["depends_on"]
    assert "capacity" in deps
    assert "input_signal" in deps
    assert "process_stage" in r.json()["snapshot"]["node_predictives"]


def test_activate_and_reject_proposed(client: TestClient):
    from lns_kernel.models import DistributionFamily, Node, NodeStatus
    from lns_kernel.store import GraphStore

    gid = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
    # Inject proposed node via store used by app — use API patch status by adding via activate path
    # Direct add through a second create is hard; use open app.state after request
    # Simpler: use kernel store on same db is isolated per client fixture — add via internal store
    store: GraphStore = client.app.state.store
    store.add_node(
        gid,
        Node(
            id="extra_factor",
            name="Extra",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 1.0, "sigma": 0.5},
            status=NodeStatus.PROPOSED,
        ),
        actor="test",
        reason="test propose",
    )
    r = client.post(f"/graphs/{gid}/nodes/extra_factor/activate")
    assert r.status_code == 200, r.text
    assert r.json()["graph"]["nodes"]["extra_factor"]["status"] == "active"
    assert "extra_factor" in r.json()["snapshot"]["node_predictives"]

    store.add_node(
        gid,
        Node(
            id="reject_me",
            name="Reject me",
            distribution_family=DistributionFamily.DETERMINISTIC,
            parameters={"value": 1.0},
            status=NodeStatus.PROPOSED,
        ),
        actor="test",
        reason="test propose 2",
    )
    r2 = client.post(f"/graphs/{gid}/nodes/reject_me/reject")
    assert r2.status_code == 200, r2.text
    assert "reject_me" not in r2.json()["graph"]["nodes"]
