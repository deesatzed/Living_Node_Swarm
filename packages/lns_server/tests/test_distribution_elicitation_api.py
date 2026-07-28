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
