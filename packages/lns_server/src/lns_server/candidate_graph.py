"""Deterministic, visibly fixture-only candidate graph for authoring demonstrations."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict

from lns_kernel.contracts import GraphProposal, RelationshipContract, RelationshipType, TargetContract


class CandidateFactor(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    label: str
    rank: int
    hop_distance: int
    evidence_score: float
    expected_relevance: float
    observability: float
    uncertainty: float
    nonduplication_score: float
    state: str = "proposed"
    evidence_status: str = "fixture_unverified"


class CandidateGraphFixture(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    generation_basis: str = "deterministic_fixture"
    active_graph_mutated: bool = False
    limitations: tuple[str, ...] = (
        "This fixture demonstrates authoring mechanics and does not represent live Neodymium research.",
        "All proposed factors remain inactive until reviewed, validated, and approved.",
    )
    graph_proposal: GraphProposal
    factors: tuple[CandidateFactor, ...]
    relationships: tuple[RelationshipContract, ...]


_FACTOR_SEED = (
    ("weather_disruption", "Weather disruption", 3),
    ("freight_capacity", "Freight capacity", 2),
    ("refining_throughput", "Rare-earth refining throughput", 1),
    ("china_export_controls", "Export-control regime", 2),
    ("mining_supply", "Primary mine supply", 1),
    ("recycling_rate", "Magnet recycling rate", 1),
    ("ev_demand", "Electric-vehicle demand", 1),
    ("wind_turbine_demand", "Wind-turbine demand", 1),
    ("chip_demand", "Semiconductor demand", 2),
    ("substitution_pressure", "Substitution pressure", 1),
    ("magnet_efficiency", "Magnet efficiency", 2),
    ("energy_prices", "Industrial energy prices", 2),
    ("fx_usd_cny", "USD/CNY exchange-rate regime", 1),
    ("geopolitical_risk", "Geopolitical disruption risk", 2),
    ("inventory_policy", "Downstream inventory policy", 1),
)


def _edge(
    edge_id: str, parent: str, child: str, *, child_is_target: bool, sign: str = "positive"
) -> RelationshipContract:
    return RelationshipContract(
        id=edge_id,
        parent_node_id=parent,
        child_node_id=child,
        relationship_type=RelationshipType.SCENARIO_ASSUMPTION,
        transform="affine",
        source_unit="index",
        target_unit="USD/kg" if child_is_target else "index",
        sign=sign,
        lag_periods=0,
        coefficient_units="USD/(kg*index)" if child_is_target else "1",
        coefficient_parameters=({"id": "coefficient", "value": -0.2 if sign == "negative" else 0.2},),
        state="proposed",
    )


def build_neodymium_fixture(target: TargetContract) -> CandidateGraphFixture:
    """Return a ranked inactive 15-factor proposal with one explicit three-hop path."""

    factors = tuple(
        CandidateFactor(
            id=factor_id,
            label=label,
            rank=rank,
            hop_distance=hop_distance,
            evidence_score=round(0.96 - rank * 0.03, 2),
            expected_relevance=round(0.93 - rank * 0.02, 2),
            observability=round(0.88 - rank * 0.015, 2),
            uncertainty=round(0.2 + rank * 0.025, 2),
            nonduplication_score=round(0.92 - rank * 0.02, 2),
        )
        for rank, (factor_id, label, hop_distance) in enumerate(_FACTOR_SEED, start=1)
    )
    chained = {"weather_disruption", "freight_capacity", "refining_throughput"}
    relationships = (
        _edge("weather_to_freight", "weather_disruption", "freight_capacity", child_is_target=False, sign="negative"),
        _edge("freight_to_refining", "freight_capacity", "refining_throughput", child_is_target=False),
        _edge("refining_to_target", "refining_throughput", target.target_node_id, child_is_target=True, sign="negative"),
        *tuple(
            _edge(f"{factor.id}_to_target", factor.id, target.target_node_id, child_is_target=True)
            for factor in factors
            if factor.id not in chained
        ),
    )
    proposal = GraphProposal(
        id=f"fixture-proposal:{target.id}",
        graph_id=f"fixture-graph:{target.id}",
        graph_version=1,
        target_contract_id=target.id,
        node_ids=(target.target_node_id, *(factor.id for factor in factors)),
        relationship_ids=tuple(relationship.id for relationship in relationships),
        created_at=datetime.now(timezone.utc),
    )
    return CandidateGraphFixture(graph_proposal=proposal, factors=factors, relationships=relationships)
