import numpy as np
import pytest

from lns_kernel.ensemble import compare_transforms, run_ensemble, weighted_outcome_mixture
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


def test_runtime_ensemble_samples_every_registered_distribution_family():
    parameters = {
        DistributionFamily.NORMAL: {"loc": 0, "scale": 1},
        DistributionFamily.LOGNORMAL: {"log_loc": 0, "log_scale": 0.2},
        DistributionFamily.BETA: {"alpha": 2, "beta": 3},
        DistributionFamily.POISSON: {"rate": 4},
        DistributionFamily.NEGATIVE_BINOMIAL: {"mean": 4, "dispersion": 2},
        DistributionFamily.GAMMA: {"shape": 2, "scale": 3},
        DistributionFamily.STUDENT_T: {"loc": 0, "scale": 1, "df": 5},
        DistributionFamily.DETERMINISTIC: {"value": 7},
    }
    nodes = {
        family.value: Node(id=family.value, name=family.value, distribution_family=family, parameters=family_parameters, status=NodeStatus.ACTIVE)
        for family, family_parameters in parameters.items()
    }

    predictives, _, samples = run_ensemble(nodes, seed=29, n_samples=300)

    assert set(predictives) == {family.value for family in DistributionFamily}
    assert all(len(samples[family.value]) == 300 for family in DistributionFamily)
    assert np.all(samples[DistributionFamily.POISSON.value] >= 0)
    assert np.all(samples[DistributionFamily.GAMMA.value] > 0)
    assert np.all(samples[DistributionFamily.DETERMINISTIC.value] == 7)


def test_weighted_outcome_mixture_is_reproducible_and_mixes_distributions_not_means():
    members = {"low": np.zeros(500), "high": np.full(500, 10.0)}
    first, normalized = weighted_outcome_mixture(members, {"low": 1, "high": 3}, seed=8)
    second, _ = weighted_outcome_mixture(members, {"low": 1, "high": 3}, seed=8)

    assert normalized == {"low": 0.25, "high": 0.75}
    assert first.samples == second.samples
    assert set(first.samples).issubset({0.0, 10.0})
    assert 6 < first.derived_mean < 9


def test_weighted_outcome_mixture_rejects_invalid_members_or_weights():
    with pytest.raises(ValueError, match="exactly"):
        weighted_outcome_mixture({"one": np.ones(2)}, {"other": 1}, seed=1)
    with pytest.raises(ValueError, match="non-negative"):
        weighted_outcome_mixture({"one": np.ones(2)}, {"one": -1}, seed=1)
