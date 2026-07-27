from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

import lns_kernel.contracts as contracts


def contract_type(name: str):
    value = getattr(contracts, name, None)
    assert value is not None, f"lns_kernel.contracts must define {name}"
    return value


def distribution_spec(**overrides):
    DistributionSpec = contract_type("DistributionSpec")
    ParameterValue = contract_type("ParameterValue")
    payload = {
        "id": "nd-price-prior",
        "family_id": "LogNormal",
        "parameters": (
            ParameterValue(id="log_loc", value=5.2),
            ParameterValue(id="log_scale", value=0.35),
        ),
        "support_lower": 0.0,
        "support_lower_open": True,
        "elicitation_method": "expert_judgment",
        "evidence_claim_ids": ("claim-retail-price",),
        "as_of": datetime(2026, 7, 27, 12, 0, tzinfo=timezone.utc),
        "confidence_rationale": "Sparse retail series; wider uncertainty retained.",
    }
    return DistributionSpec(**(payload | overrides))


def test_distribution_spec_round_trips_parameters_and_provenance():
    DistributionSpec = contract_type("DistributionSpec")
    spec = distribution_spec()

    restored = DistributionSpec.model_validate_json(spec.model_dump_json())

    assert restored.family_id == "LogNormal"
    assert restored.parameter_map == {"log_loc": 5.2, "log_scale": 0.35}
    assert restored.evidence_claim_ids == ("claim-retail-price",)
    assert restored.schema_version == 1


def test_distribution_spec_rejects_duplicate_parameter_ids():
    ParameterValue = contract_type("ParameterValue")

    with pytest.raises(ValidationError, match="parameter ids must be unique"):
        distribution_spec(
            parameters=(
                ParameterValue(id="loc", value=1.0),
                ParameterValue(id="loc", value=2.0),
            )
        )


def test_distribution_spec_rejects_invalid_support_range():
    with pytest.raises(ValidationError, match="support_lower must be less than support_upper"):
        distribution_spec(support_lower=10.0, support_upper=10.0)


def test_distribution_spec_rejects_naive_as_of_time():
    with pytest.raises(ValidationError, match="timezone-aware"):
        distribution_spec(as_of=datetime(2026, 7, 27, 12, 0))
