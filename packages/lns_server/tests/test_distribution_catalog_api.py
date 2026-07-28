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


def test_distribution_statistics_are_kernel_derived_and_accept_legacy_node_parameters(tmp_path: Path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        response = client.post(
            "/authoring/distributions/statistics",
            json={"family_id": "Normal", "parameters": {"mu": 4.0, "sigma": 2.0}},
        )
        invalid = client.post(
            "/authoring/distributions/statistics",
            json={"family_id": "Gamma", "parameters": {"shape": 2.0, "scale": -1.0}},
        )

    assert response.status_code == 200, response.text
    assert response.json()["parameters"] == {"loc": 4.0, "scale": 2.0}
    assert response.json()["statistics"] == {"mean": 4.0, "median": 4.0, "mode": 4.0, "variance": 4.0, "support_lower": None, "support_upper": None}
    assert response.json()["display_quantile_method"] == "seeded_monte_carlo_registry_sampler"
    assert response.json()["display_quantiles"]["p05"] < 4.0 < response.json()["display_quantiles"]["p95"]
    assert invalid.status_code == 400
