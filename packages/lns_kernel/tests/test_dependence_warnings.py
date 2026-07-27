from lns_kernel.contracts import RelationshipContract, RelationshipType
from lns_kernel.dependence import detect_dependence_warnings


def relation(
    id: str,
    parent: str,
    *,
    relationship_type: RelationshipType = RelationshipType.PROXY_CORRELATION,
    shared_latent_parent_id: str | None = None,
    evidence_claim_ids: tuple[str, ...] = (),
):
    return RelationshipContract(
        id=id,
        parent_node_id=parent,
        child_node_id="nd_price",
        relationship_type=relationship_type,
        transform="sum_parents",
        source_unit="USD/kg",
        target_unit="USD/kg",
        sign="positive",
        lag_periods=0,
        shared_latent_parent_id=shared_latent_parent_id,
        evidence_claim_ids=evidence_claim_ids,
    )


def test_proxy_correlation_without_shared_latent_is_visible_warning():
    warnings = detect_dependence_warnings([relation("freight-price", "freight_index")])

    assert [(warning.code, warning.relationship_ids) for warning in warnings] == [
        ("unresolved_proxy_correlation", ("freight-price",))
    ]


def test_explicit_shared_latent_suppresses_proxy_warning_but_duplicate_evidence_remains_visible():
    warnings = detect_dependence_warnings(
        [
            relation(
                "freight-price",
                "freight_index",
                shared_latent_parent_id="china_export_controls",
                evidence_claim_ids=("claim-export-controls",),
            ),
            relation(
                "energy-price",
                "energy_index",
                shared_latent_parent_id="china_export_controls",
                evidence_claim_ids=("claim-export-controls",),
            ),
        ]
    )

    assert {warning.code for warning in warnings} == {"shared_evidence_possible_duplicate"}


def test_duplicate_parent_child_relationships_are_always_warned():
    warnings = detect_dependence_warnings(
        [
            relation("freight-price-a", "freight_index", relationship_type=RelationshipType.CAUSAL_HYPOTHESIS),
            relation("freight-price-b", "freight_index", relationship_type=RelationshipType.CAUSAL_HYPOTHESIS),
        ]
    )

    assert any(warning.code == "duplicate_parent_child" for warning in warnings)
