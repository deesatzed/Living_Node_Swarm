import pytest
from pydantic import ValidationError

from lns_kernel.contracts import RelationshipContract, RelationshipType
from lns_kernel.temporal import expand_time_relationships, validate_temporal_relationships


def edge(id: str, parent: str, child: str, lag: int, *, lag_unit: str | None = "month"):
    if lag == 0 and lag_unit == "month":
        lag_unit = None
    return RelationshipContract(
        id=id,
        parent_node_id=parent,
        child_node_id=child,
        relationship_type=RelationshipType.CAUSAL_HYPOTHESIS,
        transform="sum_parents",
        source_unit="USD/kg",
        target_unit="USD/kg",
        sign="positive",
        lag_periods=lag,
        lag_unit=lag_unit,
    )


def test_nonzero_lag_requires_an_explicit_time_unit():
    with pytest.raises(ValidationError, match="lag_unit"):
        edge("demand-price", "demand", "price", 1, lag_unit=None)


def test_lagged_feedback_is_valid_and_expands_across_time():
    relationships = [
        edge("demand-price", "demand", "price", 1),
        edge("price-demand", "price", "demand", 1),
    ]

    validate_temporal_relationships(relationships)
    expanded = expand_time_relationships(relationships, periods=2)

    assert ("demand@1", "price@2", "demand-price") in expanded
    assert ("price@1", "demand@2", "price-demand") in expanded


def test_same_time_cycle_is_rejected():
    with pytest.raises(ValueError, match="same-time cycle"):
        validate_temporal_relationships(
            [edge("a-b", "a", "b", 0), edge("b-a", "b", "a", 0)]
        )
