import numpy as np
import pytest

from lns_kernel.ensemble import compare_transforms, run_ensemble
from lns_kernel.models import DistributionFamily, Node, NodeStatus, TransformKind
from lns_kernel.seed import build_seed_graph


def test_reproducible_seed():
    g = build_seed_graph()
    p1, _, s1 = run_ensemble(g.nodes, seed=7, n_samples=500)
    p2, _, s2 = run_ensemble(g.nodes, seed=7, n_samples=500)
    assert np.allclose(s1["outcome"], s2["outcome"])
    assert p1["outcome"].quantiles == p2["outcome"].quantiles


def test_proposed_excluded():
    g = build_seed_graph()
    g.nodes["ghost"] = Node(
        id="ghost",
        name="ghost",
        distribution_family=DistributionFamily.NORMAL,
        parameters={"mu": 100, "sigma": 1},
        status=NodeStatus.PROPOSED,
    )
    pred, _, _ = run_ensemble(g.nodes, seed=1, n_samples=200)
    assert "ghost" not in pred
    assert "outcome" in pred


def test_parent_edit_changes_child():
    g = build_seed_graph()
    p0, _, _ = run_ensemble(g.nodes, seed=1, n_samples=2000)
    q0 = p0["outcome"].quantiles["p50"]
    g.nodes["input_signal"].parameters["mu"] = 5.0
    p1, _, _ = run_ensemble(g.nodes, seed=1, n_samples=2000)
    q1 = p1["outcome"].quantiles["p50"]
    assert abs(q1 - q0) > 1.0


def test_transform_experiment_runs_all_strategies():
    g = build_seed_graph()
    rows = compare_transforms(
        g.nodes,
        "process_stage",
        [TransformKind.AFFINE, TransformKind.SUM_PARENTS, TransformKind.MEAN_PARENTS],
        seed=2,
        n_samples=1000,
    )
    assert len(rows) == 3
    assert all("derived_mean" in r for r in rows)
    # Strategies should not all produce identical means on this seed graph
    means = [r["derived_mean"] for r in rows]
    assert len(set(round(m, 4) for m in means)) >= 2
