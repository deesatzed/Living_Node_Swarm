"""Visible first-release warnings for unresolved graph dependence."""

from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Iterable

from lns_kernel.contracts import RelationshipContract, RelationshipType


@dataclass(frozen=True)
class DependenceWarning:
    code: str
    relationship_ids: tuple[str, ...]
    message: str


def detect_dependence_warnings(
    relationships: Iterable[RelationshipContract],
) -> tuple[DependenceWarning, ...]:
    """Return reviewable warnings; never silently assume independent mechanisms."""

    items = tuple(relationships)
    warnings: list[DependenceWarning] = []
    for relationship in items:
        if (
            relationship.relationship_type == RelationshipType.PROXY_CORRELATION
            and relationship.shared_latent_parent_id is None
        ):
            warnings.append(
                DependenceWarning(
                    "unresolved_proxy_correlation",
                    (relationship.id,),
                    "Proxy correlation requires a shared latent parent or remains an unresolved-dependence warning.",
                )
            )
    for left, right in combinations(items, 2):
        ids = tuple(sorted((left.id, right.id)))
        if left.parent_node_id == right.parent_node_id and left.child_node_id == right.child_node_id:
            warnings.append(
                DependenceWarning(
                    "duplicate_parent_child",
                    ids,
                    "Multiple relationships connect the same parent and child; review for duplicate mechanism counting.",
                )
            )
        if left.child_node_id == right.child_node_id and set(left.evidence_claim_ids).intersection(right.evidence_claim_ids):
            warnings.append(
                DependenceWarning(
                    "shared_evidence_possible_duplicate",
                    ids,
                    "Relationships affecting one target share evidence; do not treat them as independent corroboration.",
                )
            )
    return tuple(sorted(warnings, key=lambda warning: (warning.code, warning.relationship_ids)))
