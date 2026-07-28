from pathlib import Path

from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def test_distribution_catalog_exposes_kernel_registry_metadata_in_frozen_order(tmp_path: Path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        response = client.get("/catalog/distributions")

    assert response.status_code == 200, response.text
    families = response.json()["families"]
    assert [family["id"] for family in families] == [
        "Normal",
        "LogNormal",
        "Beta",
        "Poisson",
        "NegativeBinomial",
        "Gamma",
        "StudentT",
        "Deterministic",
    ]
    assert families[0]["parameters"][0] == {
        "id": "loc",
        "label": "Location",
        "description": "Central expected value.",
        "lower": None,
        "lower_open": False,
    }
    assert families[1]["support"] == {
        "lower": 0,
        "upper": None,
        "lower_open": True,
        "upper_open": False,
    }
