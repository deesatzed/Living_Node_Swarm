from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def body() -> dict[str, object]:
    return {
        "id": "nd-retail-2027",
        "question": "What will the private-investor retail price of neodymium be in one year?",
        "target_node_id": "nd_private_retail_price_usd_per_kg",
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


def test_target_intake_persists_resolution_grade_neodymium_contract(tmp_path: Path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        created = client.post("/targets", json=body())
        restored = client.get("/targets/nd-retail-2027")

    assert created.status_code == 200, created.text
    assert created.json()["target"]["price_basis"] == "retail"
    assert restored.status_code == 200
    assert restored.json()["oracle_url"] == "https://strategicmetalsinvest.com/neodymium-prices/"


def test_target_intake_rejects_ambiguous_missing_price_basis(tmp_path: Path):
    payload = body()
    del payload["price_basis"]
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        response = client.post("/targets", json=payload)

    assert response.status_code == 422
