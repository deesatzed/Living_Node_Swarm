import tempfile
from pathlib import Path

from lns_kernel.models import Freshness, NodeStatus
from lns_kernel.seed import build_seed_graph
from lns_kernel.simulation import SimulationCoordinator
from lns_kernel.store import GraphStore


def test_patch_event_and_resim():
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / "t.db"
        store = GraphStore(db)
        g = build_seed_graph()
        store.create_graph(g)
        coord = SimulationCoordinator(store, default_n_samples=500)
        snap0 = coord.run_now(g.id, seed=3)
        assert snap0.status == "complete"
        q0 = snap0.node_predictives["outcome"].quantiles["p50"]

        g2, ev = store.patch_node_parameters(
            g.id, "input_signal", {"mu": 4.0}, actor="human", reason="test edit"
        )
        assert ev.new_version == 2
        assert g2.nodes["input_signal"].parameters["mu"] == 4.0
        meta = store.get_sim_meta(g.id)
        assert meta["freshness"] == Freshness.STALE

        snap1 = coord.run_now(g.id, seed=3)
        assert snap1.status == "complete"
        q1 = snap1.node_predictives["outcome"].quantiles["p50"]
        assert abs(q1 - q0) > 1.0
        assert coord.status(g.id).freshness == Freshness.FRESH
        events = store.list_events(g.id)
        assert len(events) == 1
        store.close()


def test_proposed_never_in_snapshot():
    with tempfile.TemporaryDirectory() as td:
        store = GraphStore(Path(td) / "t.db")
        g = build_seed_graph()
        store.create_graph(g)
        from lns_kernel.models import DistributionFamily, Node, TransformKind

        ghost = Node(
            id="ghost",
            name="ghost",
            distribution_family=DistributionFamily.DETERMINISTIC,
            parameters={"value": 999.0},
            status=NodeStatus.PROPOSED,
        )
        store.add_node(g.id, ghost, actor="test", reason="propose")
        snap = SimulationCoordinator(store, default_n_samples=200).run_now(g.id)
        assert "ghost" not in snap.node_predictives
        store.close()


def test_activate_puts_node_in_snapshot():
    with tempfile.TemporaryDirectory() as td:
        store = GraphStore(Path(td) / "t.db")
        g = build_seed_graph()
        store.create_graph(g)
        from lns_kernel.models import DistributionFamily, Node

        ghost = Node(
            id="ghost",
            name="ghost",
            distribution_family=DistributionFamily.DETERMINISTIC,
            parameters={"value": 42.0},
            status=NodeStatus.PROPOSED,
        )
        store.add_node(g.id, ghost, actor="test", reason="propose")
        coord = SimulationCoordinator(store, default_n_samples=100)
        assert "ghost" not in coord.run_now(g.id).node_predictives
        store.set_node_status(g.id, "ghost", NodeStatus.ACTIVE.value, reason="activate")
        snap = coord.run_now(g.id)
        assert "ghost" in snap.node_predictives
        assert abs(snap.node_predictives["ghost"].derived_mean - 42.0) < 1e-6
        store.close()


def test_wire_parent_changes_child_depends_and_predictive():
    with tempfile.TemporaryDirectory() as td:
        store = GraphStore(Path(td) / "t.db")
        g = build_seed_graph()
        store.create_graph(g)
        from lns_kernel.models import DistributionFamily, Node

        cap = Node(
            id="capacity",
            name="Capacity",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 10.0, "sigma": 0.1},
            status=NodeStatus.ACTIVE,
        )
        store.add_node(g.id, cap, actor="test", reason="add")
        before = store.get_graph(g.id)
        assert before is not None
        assert "capacity" not in before.nodes["process_stage"].depends_on
        g2, ev = store.wire_parent(g.id, "capacity", "process_stage", weight=0.5)
        assert "capacity" in g2.nodes["process_stage"].depends_on
        assert ev.diff_summary["wired_parent"] == "capacity"
        snap = SimulationCoordinator(store, default_n_samples=400).run_now(g.id, seed=1)
        assert "capacity" in snap.node_predictives
        assert "process_stage" in snap.node_predictives
        store.close()


def test_reject_deletes_proposed():
    with tempfile.TemporaryDirectory() as td:
        store = GraphStore(Path(td) / "t.db")
        g = build_seed_graph()
        store.create_graph(g)
        from lns_kernel.models import DistributionFamily, Node

        ghost = Node(
            id="ghost",
            name="ghost",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 0, "sigma": 1},
            status=NodeStatus.PROPOSED,
        )
        store.add_node(g.id, ghost, actor="test", reason="propose")
        store.delete_node(g.id, "ghost", reason="reject")
        g2 = store.get_graph(g.id)
        assert g2 is not None
        assert "ghost" not in g2.nodes
        store.close()
