from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def target_body() -> dict[str, object]:
    return {
        "id": "nd-retail-2027",
        "question": "Neodymium retail price in one year",
        "target_node_id": "nd_price",
        "forecast_origin": datetime(2026, 7, 27, tzinfo=timezone.utc).isoformat(),
        "resolution_at": datetime(2027, 7, 27, tzinfo=timezone.utc).isoformat(),
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


def test_fixture_candidate_graph_has_15_ranked_inactive_factors_and_three_hop_path(tmp_path: Path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        assert client.post("/targets", json=target_body()).status_code == 200
        response = client.post("/authoring/targets/nd-retail-2027/candidate-proposals/fixture")

    assert response.status_code == 200, response.text
    proposal = response.json()
    factors = proposal["factors"]
    assert proposal["generation_basis"] == "deterministic_fixture"
    assert proposal["active_graph_mutated"] is False
    assert len(factors) == 15
    assert len({factor["id"] for factor in factors}) == 15
    assert all(factor["state"] == "proposed" for factor in factors)
    assert any(factor["hop_distance"] == 3 for factor in factors)
    assert [factor["rank"] for factor in factors] == list(range(1, 16))
    assert {edge["parent_node_id"] for edge in proposal["relationships"]} >= {
        "weather_disruption",
        "freight_capacity",
        "refining_throughput",
    }


def test_fixture_candidate_graph_can_be_materialized_as_a_non_active_persisted_graph(tmp_path: Path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        assert client.post("/targets", json=target_body()).status_code == 200
        response = client.post("/authoring/targets/nd-retail-2027/candidate-proposals/fixture/materialize")

    assert response.status_code == 200, response.text
    graph = response.json()["graph"]
    assert graph["target_contract_id"] == "nd-retail-2027"
    assert graph["nodes"]["nd_price"]["status"] == "active"
    assert len(graph["nodes"]) == 16
    assert all(node["status"] == "proposed" for node_id, node in graph["nodes"].items() if node_id != "nd_price")
    assert response.json()["active_graph_mutated"] is False


def test_materialized_fixture_can_create_a_non_active_exact_structural_review_for_one_factor(tmp_path: Path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        assert client.post("/targets", json=target_body()).status_code == 200
        graph = client.post("/authoring/targets/nd-retail-2027/candidate-proposals/fixture/materialize").json()["graph"]
        fixture = client.post("/authoring/targets/nd-retail-2027/candidate-proposals/fixture").json()
        relationship = next(item for item in fixture["relationships"] if item["id"] == "china_export_controls_to_target")
        proposal = client.post(
            f"/authoring/graphs/{graph['id']}/structural-proposals",
            json={"relationships": [relationship], "activated_node_ids": ["china_export_controls"]},
        )
        unchanged = client.get(f"/graphs/{graph['id']}").json()

    assert proposal.status_code == 200, proposal.text
    assert proposal.json()["active_graph_mutated"] is False
    assert proposal.json()["proposal"]["activated_node_ids"] == ["china_export_controls"]
    assert unchanged["nodes"]["china_export_controls"]["status"] == "proposed"
    assert unchanged["relationships"] == {}
