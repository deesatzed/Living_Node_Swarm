"""Time-expanded relationship validation for lagged prediction graphs."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable

from lns_kernel.contracts import RelationshipContract


def validate_temporal_relationships(relationships: Iterable[RelationshipContract]) -> None:
    """Allow delayed feedback while rejecting cycles that occur in one time slice."""

    edges = tuple(relationships)
    lag_units = {relationship.lag_unit for relationship in edges if relationship.lag_periods > 0}
    if len(lag_units) > 1:
        raise ValueError("time-expanded graph requires one shared lag_unit")
    adjacency: dict[str, list[str]] = defaultdict(list)
    for relationship in edges:
        if relationship.lag_periods == 0:
            adjacency[relationship.parent_node_id].append(relationship.child_node_id)

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node_id: str) -> None:
        if node_id in visiting:
            raise ValueError("same-time cycle detected; use an explicit nonzero lag")
        if node_id in visited:
            return
        visiting.add(node_id)
        for child_id in adjacency[node_id]:
            visit(child_id)
        visiting.remove(node_id)
        visited.add(node_id)

    for node_id in tuple(adjacency):
        visit(node_id)


def expand_time_relationships(
    relationships: Iterable[RelationshipContract], *, periods: int
) -> set[tuple[str, str, str]]:
    """Materialize parent@t -> child@t relationships after temporal validation."""

    if periods < 0:
        raise ValueError("periods must be non-negative")
    edges = tuple(relationships)
    validate_temporal_relationships(edges)
    expanded: set[tuple[str, str, str]] = set()
    for relationship in edges:
        for period in range(relationship.lag_periods, periods + 1):
            parent = f"{relationship.parent_node_id}@{period - relationship.lag_periods}"
            child = f"{relationship.child_node_id}@{period}"
            expanded.add((parent, child, relationship.id))
    return expanded
