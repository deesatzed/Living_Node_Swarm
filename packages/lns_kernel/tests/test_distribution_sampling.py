import numpy as np
import pytest

from lns_kernel.distributions import sample_distribution


@pytest.mark.parametrize(
    ("family", "parameters", "minimum", "maximum"),
    [
        ("Normal", {"mu": 4, "sigma": 1}, None, None),
        ("LogNormal", {"log_loc": 1, "log_scale": 0.3}, 0, None),
        ("Beta", {"alpha": 2, "beta": 3}, 0, 1),
        ("Poisson", {"rate": 4}, 0, None),
        ("NegativeBinomial", {"n": 3, "p": 0.4}, 0, None),
        ("Gamma", {"shape": 2, "scale": 3}, 0, None),
        ("StudentT", {"loc": 0, "scale": 1, "df": 4}, None, None),
        ("Deterministic", {"value": 7.5}, 7.5, 7.5),
    ],
)
def test_all_registered_families_sample_reproducibly_within_support(family, parameters, minimum, maximum):
    first = sample_distribution(family, parameters, size=2_000, seed=17)
    second = sample_distribution(family, parameters, size=2_000, seed=17)

    assert np.array_equal(first, second)
    assert first.shape == (2_000,)
    if minimum is not None:
        assert first.min() >= minimum
    if maximum is not None:
        assert first.max() <= maximum


def test_gamma_sample_mean_converges_to_analytic_mean():
    values = sample_distribution("Gamma", {"shape": 2, "scale": 3}, size=100_000, seed=3)

    assert values.mean() == pytest.approx(6, abs=0.08)
