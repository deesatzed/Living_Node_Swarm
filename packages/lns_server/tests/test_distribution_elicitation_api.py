from datetime import datetime, timezone
from math import log

import pytest
from fastapi.testclient import TestClient

from lns_server.app import create_app
from lns_server.settings import Settings


def test_lognormal_quantiles_become_a_valid_distribution_receipt(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        response = client.post(
            "/authoring/distributions/elicit",
            json={
                "id": "nd-price-prior",
                "family_id": "LogNormal",
                "median": 100.0,
                "p90": 180.0,
                "evidence_claim_ids": ["claim-price-history"],
                "as_of": datetime(2026, 7, 28, tzinfo=timezone.utc).isoformat(),
                "confidence_rationale": "Fixture elicitation for UI workflow testing.",
            },
        )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["receipt"]["method"] == "median_p90_quantile_match"
    parameters = {item["id"]: item["value"] for item in payload["distribution_spec"]["parameters"]}
    assert parameters["log_loc"] == pytest.approx(log(100.0))
    assert parameters["log_scale"] > 0
    assert payload["derived_statistics"]["median"] == pytest.approx(100.0)


def test_lognormal_elicitation_rejects_non_increasing_quantiles(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        response = client.post(
            "/authoring/distributions/elicit",
            json={
                "id": "bad-prior",
                "family_id": "LogNormal",
                "median": 100.0,
                "p90": 100.0,
                "as_of": datetime(2026, 7, 28, tzinfo=timezone.utc).isoformat(),
                "confidence_rationale": "bad fixture",
            },
        )
    assert response.status_code == 422


@pytest.mark.parametrize(("family_id", "values", "expected_parameters"), [
    ("Normal", {"median": 5.0, "p90": 7.56}, {"loc": 5.0}),
    ("LogNormal", {"median": 5.0, "p90": 7.56}, {"log_loc": log(5.0)}),
    ("Beta", {"mean": 0.4, "concentration": 10.0}, {"alpha": 4.0, "beta": 6.0}),
    ("Poisson", {"expected_count": 12.0}, {"rate": 12.0}),
    ("NegativeBinomial", {"expected_count": 12.0, "dispersion": 3.0}, {"mean": 12.0, "dispersion": 3.0}),
    ("Gamma", {"mean": 8.0, "standard_deviation": 4.0}, {"shape": 4.0, "scale": 2.0}),
    ("StudentT", {"location": 2.0, "scale": 1.5, "degrees_of_freedom": 5.0}, {"loc": 2.0, "scale": 1.5, "df": 5.0}),
    ("Deterministic", {"value": 7.0}, {"value": 7.0}),
])
def test_intuitive_distribution_derivation_supports_every_registered_family(tmp_path, family_id, values, expected_parameters):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        response = client.post("/authoring/distributions/derive", json={
            "id": f"{family_id}-prior", "family_id": family_id, "values": values,
            "as_of": datetime(2026, 7, 28, tzinfo=timezone.utc).isoformat(),
            "confidence_rationale": "Fixture intuitive derivation.",
        })

    assert response.status_code == 200, response.text
    payload = response.json()
    parameters = {item["id"]: item["value"] for item in payload["distribution_spec"]["parameters"]}
    assert payload["receipt"]["method"] == ("median_p90_quantile_match" if family_id in {"Normal", "LogNormal"} else "intuitive_family_derivation")
    for parameter, value in expected_parameters.items():
        assert parameters[parameter] == pytest.approx(value)
    assert payload["derived_statistics"]["support_lower"] is not None or family_id in {"Normal", "StudentT", "Deterministic"}


def test_intuitive_distribution_derivation_rejects_invalid_beta_mean(tmp_path):
    app = create_app(Settings(db_path=str(tmp_path / "graph.db")))
    with TestClient(app) as client:
        response = client.post("/authoring/distributions/derive", json={
            "id": "bad-beta", "family_id": "Beta", "values": {"mean": 1.0, "concentration": 10.0},
            "as_of": datetime(2026, 7, 28, tzinfo=timezone.utc).isoformat(),
            "confidence_rationale": "bad fixture",
        })
    assert response.status_code == 422
