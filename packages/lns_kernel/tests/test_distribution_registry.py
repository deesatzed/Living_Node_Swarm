import pytest

from lns_kernel.distributions import REGISTRY, get_family


def test_registry_has_exact_initial_families():
    assert set(REGISTRY) == {
        "Normal",
        "LogNormal",
        "Beta",
        "Poisson",
        "NegativeBinomial",
        "Gamma",
        "StudentT",
        "Deterministic",
    }


def test_lognormal_declares_log_space_parameters_and_positive_support():
    spec = get_family("LogNormal")

    assert tuple(spec.parameters) == ("log_loc", "log_scale")
    assert spec.support.lower == 0
    assert spec.support.lower_open is True


@pytest.mark.parametrize(
    ("alias", "canonical"),
    [("Gaussian", "Normal"), ("Student-t", "StudentT"), ("Negative Binomial", "NegativeBinomial")],
)
def test_aliases_resolve_at_ingestion_only(alias: str, canonical: str):
    assert get_family(alias).id == canonical
