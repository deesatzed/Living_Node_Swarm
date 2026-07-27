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


def test_ai_propose_requires_key_and_model(client: TestClient):
    gid = client.post("/graphs", json={"from_seed": True}).json()["graph"]["id"]
    r = client.post(f"/graphs/{gid}/ai/propose-node", json={"hint": "add factor"})
    assert r.status_code == 400
    assert "OPENROUTER" in r.json()["detail"].upper() or "model" in r.json()["detail"].lower() or "API" in r.json()["detail"]


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
