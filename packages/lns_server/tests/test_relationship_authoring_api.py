from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def proxy_edge(id: str, parent: str) -> dict[str, object]:
    return {
        "id": id,
        "parent_node_id": parent,
        "child_node_id": "nd_price",
        "relationship_type": "proxy_correlation",
        "transform": "affine",
        "source_unit": "index",
        "target_unit": "USD/kg",
        "sign": "positive",
        "lag_periods": 0,
        "coefficient_units": "USD/(kg*index)",
        "state": "proposed",
    }


def test_relationship_authoring_returns_validation_and_dependence_warnings(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        response = client.post(
            "/authoring/relationships/validate",
            json={"relationships": [proxy_edge("freight-price", "freight"), proxy_edge("energy-price", "energy")]},
        )

    assert response.status_code == 200, response.text
    assert {warning["code"] for warning in response.json()["dependence_warnings"]} == {
        "unresolved_proxy_correlation"
    }
    assert all(item["state"] == "proposed" for item in response.json()["relationships"])
    assert response.json()["active_graph_mutated"] is False


def test_relationship_authoring_rejects_non_proposed_input(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    body = proxy_edge("bad", "freight")
    body["state"] = "active"
    with TestClient(app) as client:
        response = client.post("/authoring/relationships/validate", json={"relationships": [body]})

    assert response.status_code == 422
