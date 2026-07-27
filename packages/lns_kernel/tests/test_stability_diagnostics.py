import tempfile
from pathlib import Path

from lns_kernel.seed import build_seed_graph
from lns_kernel.simulation import SimulationCoordinator
from lns_kernel.store import GraphStore


def test_successful_simulation_saves_multi_seed_multi_sample_stability_receipt():
    with tempfile.TemporaryDirectory() as td:
        store = GraphStore(Path(td) / "stability.db")
        graph = build_seed_graph()
        store.create_graph(graph)

        snapshot = SimulationCoordinator(store, default_n_samples=120).run_now(graph.id, seed=11)

        assert snapshot.status == "complete"
        assert snapshot.stability_diagnostic is not None
        assert snapshot.stability_diagnostic.seeds == [11, 12]
        assert snapshot.stability_diagnostic.sample_counts == [60, 120]
        assert "outcome" in snapshot.stability_diagnostic.node_metric_ranges
        assert snapshot.stability_diagnostic.method == "multi_seed_multi_sample_quantile_range"
        store.close()
