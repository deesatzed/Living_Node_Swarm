from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

import lns_kernel


def target_payload() -> dict:
    return {
        "id": "nd-retail-2027",
        "question": "Neodymium private-investor retail price in one year",
        "target_node_id": "nd_price",
        "forecast_origin": datetime(2026, 7, 27, tzinfo=timezone.utc),
        "resolution_at": datetime(2027, 7, 27, tzinfo=timezone.utc),
        "product": "neodymium",
        "grade": "private-investor retail series",
        "price_basis": "retail",
        "geography": "publisher series",
        "currency": "USD",
        "unit": "USD/kg",
        "oracle_url": "https://strategicmetalsinvest.com/neodymium-prices/",
        "observation_rule": "first published value on the resolution date",
        "missing_source_fallback": "unresolved",
        "revision_policy": "use first captured value",
    }


def target_contract(**overrides):
    contract_type = getattr(lns_kernel, "TargetContract", None)
    assert contract_type is not None, "lns_kernel must export TargetContract"
    return contract_type(**(target_payload() | overrides))


def test_target_contract_is_resolution_grade_and_versioned():
    target = target_contract()

    assert target.horizon_days == 365
    assert target.schema_version == 1
    assert target.oracle_url == "https://strategicmetalsinvest.com/neodymium-prices/"


def test_target_contract_rejects_missing_price_basis():
    with pytest.raises(ValidationError, match="price_basis"):
        target_contract(price_basis="  ")


def test_target_contract_rejects_naive_resolution_time():
    with pytest.raises(ValidationError, match="timezone-aware"):
        target_contract(resolution_at=datetime(2027, 7, 27))


def test_target_contract_rejects_resolution_before_forecast_origin():
    with pytest.raises(ValidationError, match="after forecast_origin"):
        target_contract(resolution_at=target_payload()["forecast_origin"] - timedelta(seconds=1))


def test_target_contract_rejects_non_http_oracle():
    with pytest.raises(ValidationError, match="http or https"):
        target_contract(oracle_url="file:///private/neodymium.txt")
