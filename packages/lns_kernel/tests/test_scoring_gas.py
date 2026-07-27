from lns_kernel.gas_seed import build_gas_graph
from lns_kernel.scoring import brier, relative_move, should_exit_on_move
from lns_kernel.simulation import SimulationCoordinator
from lns_kernel.store import GraphStore
import tempfile
from pathlib import Path


def test_brier():
    assert abs(brier(0.7, 1) - 0.09) < 1e-12
    assert abs(brier(0.2, 0) - 0.04) < 1e-12


def test_twenty_percent_exit_rule():
    assert should_exit_on_move(0.50, 0.60, 0.20) is True  # +20%
    assert should_exit_on_move(0.50, 0.40, 0.20) is True  # -20%
    assert should_exit_on_move(0.50, 0.55, 0.20) is False
    assert abs(relative_move(0.50, 0.60) - 0.20) < 1e-9


def test_gas_seed_simulates():
    with tempfile.TemporaryDirectory() as td:
        store = GraphStore(Path(td) / "t.db")
        g = build_gas_graph(ticker="GAS-TEST", threshold_usd=4.12, market_yes_mid=0.51)
        store.create_graph(g)
        snap = SimulationCoordinator(store, default_n_samples=300).run_now(g.id)
        assert snap.status == "complete"
        assert "model_price_index" in snap.node_predictives
        assert "market_implied_yes" in snap.node_predictives
        store.close()
