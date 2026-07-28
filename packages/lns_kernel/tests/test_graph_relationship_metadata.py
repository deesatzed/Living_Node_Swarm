from pathlib import Path

from lns_kernel.contracts import RelationshipContract, RelationshipType
from lns_kernel.seed import build_seed_graph
from lns_kernel.store import GraphStore


def test_graph_store_round_trips_active_relationship_metadata(tmp_path: Path):
    graph = build_seed_graph()
    relationship = RelationshipContract(
        id="input-to-process",
        parent_node_id="input_signal",
        child_node_id="process_stage",
        relationship_type=RelationshipType.CAUSAL_HYPOTHESIS,
        transform="affine",
        source_unit="index",
        target_unit="index",
        sign="positive",
        lag_periods=0,
        coefficient_units="1",
        state="active",
    )
    graph.relationships = {relationship.id: relationship}
    graph.nodes["process_stage"].relationship_ids = [relationship.id]

    store = GraphStore(tmp_path / "relationships.db")
    store.create_graph(graph)
    stored = store.get_graph(graph.id)
    store.close()

    assert stored is not None
    assert stored.graph_version == graph.graph_version
    assert stored.relationships == {relationship.id: relationship}
    assert stored.nodes["process_stage"].depends_on == ["input_signal"]
    assert stored.nodes["process_stage"].relationship_ids == [relationship.id]


def test_graph_store_reads_legacy_graph_without_relationship_records(tmp_path: Path):
    graph = build_seed_graph()
    store = GraphStore(tmp_path / "legacy.db")
    store.create_graph(graph)
    stored = store.get_graph(graph.id)
    store.close()

    assert stored is not None
    assert stored.relationships == {}
