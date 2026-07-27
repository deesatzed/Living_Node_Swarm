import math

import pytest

from lns_kernel.distributions import distribution_statistics, validate_family_parameters


def test_lognormal_statistics_are_derived_from_log_space_parameters():
    stats = distribution_statistics("LogNormal", {"log_loc": 2.0, "log_scale": 0.5})

    assert stats["mean"] == pytest.approx(math.exp(2.0 + 0.5**2 / 2))
    assert stats["median"] == pytest.approx(math.exp(2.0))
    assert stats["mode"] == pytest.approx(math.exp(2.0 - 0.5**2))


@pytest.mark.parametrize(
    ("family", "parameters", "message"),
    [
        ("Poisson", {"rate": 0}, "rate must be > 0"),
        ("NegativeBinomial", {"n": 2, "p": 1}, "p must be between 0 and 1"),
        ("Gamma", {"shape": 2, "scale": 0}, "scale must be > 0"),
        ("StudentT", {"loc": 0, "scale": 1, "df": 0}, "df must be > 0"),
    ],
)
def test_registry_validation_rejects_invalid_parameters(family, parameters, message):
    with pytest.raises(ValueError, match=message):
        validate_family_parameters(family, parameters)


def test_beta_statistics_report_bounded_mean_and_median_is_explicitly_unknown_when_no_closed_form():
    stats = distribution_statistics("Beta", {"alpha": 2, "beta": 3})

    assert stats["mean"] == pytest.approx(0.4)
    assert stats["median"] is None
    assert stats["support_lower"] == 0
    assert stats["support_upper"] == 1
