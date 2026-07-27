from lns_kernel.distributions import normalize_parameters
from lns_kernel.ensemble import _sample_family
from lns_kernel.models import DistributionFamily, Node


def test_legacy_node_payload_roundtrips_without_relabeling_stored_parameters():
    legacy = {
        "id": "legacy-normal",
        "name": "Legacy normal",
        "distribution_family": "Normal",
        "parameters": {"mu": 12.5, "sigma": 1.2},
    }

    node = Node.model_validate(legacy)

    assert node.model_dump()["parameters"] == {"mu": 12.5, "sigma": 1.2}


def test_legacy_parameter_names_normalize_to_frozen_canonical_registry_names():
    assert normalize_parameters("Normal", {"mu": 12.5, "sigma": 1.2}) == {
        "loc": 12.5,
        "scale": 1.2,
    }
    assert normalize_parameters("LogNormal", {"mu": 2.0, "sigma": 0.3}) == {
        "log_loc": 2.0,
        "log_scale": 0.3,
    }
    assert normalize_parameters("Beta", {"a": 2.0, "b": 3.0}) == {
        "alpha": 2.0,
        "beta": 3.0,
    }


def test_legacy_and_canonical_normal_samples_have_identical_seeded_semantics():
    import numpy as np

    legacy = _sample_family(
        DistributionFamily.NORMAL,
        {"mu": 12.5, "sigma": 1.2},
        100,
        np.random.default_rng(5),
    )
    canonical = _sample_family(
        DistributionFamily.NORMAL,
        {"loc": 12.5, "scale": 1.2},
        100,
        np.random.default_rng(5),
    )

    assert np.array_equal(legacy, canonical)
