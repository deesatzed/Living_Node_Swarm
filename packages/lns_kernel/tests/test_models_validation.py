import pytest

from lns_kernel.models import DistributionFamily, Node, TransformKind
from lns_kernel.validation import ValidationError, validate_node, validate_parameters


def test_normal_params_ok():
    validate_parameters(DistributionFamily.NORMAL, {"mu": 0.0, "sigma": 1.0})


def test_normal_sigma_must_be_positive():
    with pytest.raises(ValidationError):
        validate_parameters(DistributionFamily.NORMAL, {"mu": 0.0, "sigma": 0.0})


def test_dependent_requires_transform():
    n = Node(
        id="x",
        name="x",
        distribution_family=DistributionFamily.NORMAL,
        parameters={"mu": 0, "sigma": 1},
        depends_on=["y"],
        transform=TransformKind.NONE,
    )
    with pytest.raises(ValidationError):
        validate_node(n)


def test_affine_requires_a0():
    n = Node(
        id="x",
        name="x",
        distribution_family=DistributionFamily.NORMAL,
        parameters={"mu": 0, "sigma": 1},
        depends_on=["y"],
        transform=TransformKind.AFFINE,
        transform_params={},
    )
    with pytest.raises(ValidationError):
        validate_node(n)


def test_node_roundtrip():
    n = Node(
        id="a",
        name="A",
        distribution_family=DistributionFamily.BETA,
        parameters={"a": 2.0, "b": 5.0},
    )
    n2 = Node.model_validate_json(n.model_dump_json())
    assert n2.id == "a"
    assert n2.parameters["a"] == 2.0
