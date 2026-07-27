import pytest
from pydantic import ValidationError

from lns_kernel.contracts import RelationshipContract, RelationshipType


def relationship(**overrides):
    values = {
        "id": "rel-demand-price",
        "parent_node_id": "ev_demand",
        "child_node_id": "nd_price",
        "relationship_type": RelationshipType.CAUSAL_HYPOTHESIS,
        "transform": "affine",
        "source_unit": "vehicles/year",
        "target_unit": "USD/kg",
        "sign": "positive",
        "lag_periods": 1,
        "lag_unit": "month",
        "coefficient_units": "USD*year/(kg*vehicles)",
    }
    values.update(overrides)
    return RelationshipContract(**values)


def test_affine_relationship_requires_dimensionally_correct_coefficient_units():
    valid = relationship()

    assert valid.coefficient_units == "USD*year/(kg*vehicles)"

    with pytest.raises(ValidationError, match="coefficient units"):
        relationship(coefficient_units="USD/kg")


@pytest.mark.parametrize("transform", ["sum_parents", "mean_parents"])
def test_aggregate_relationships_require_matching_source_and_target_units(transform):
    with pytest.raises(ValidationError, match="matching source and target units"):
        relationship(
            transform=transform,
            source_unit="kg",
            target_unit="USD/kg",
            coefficient_units=None,
        )

    valid = relationship(
        transform=transform,
        source_unit="USD/kg",
        target_unit="USD/kg",
        coefficient_units=None,
    )
    assert valid.transform == transform
