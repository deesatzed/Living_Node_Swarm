import pytest

from lns_kernel.dependencies import assert_acyclic, detect_cycle, downstream, topological_order
from lns_kernel.models import DistributionFamily, Node, TransformKind
from lns_kernel.validation import ValidationError


def _n(id: str, deps: list[str] | None = None) -> Node:
    deps = deps or []
    return Node(
        id=id,
        name=id,
        distribution_family=DistributionFamily.NORMAL,
        parameters={"mu": 0, "sigma": 1},
        depends_on=deps,
        transform=TransformKind.SUM_PARENTS if deps else TransformKind.NONE,
    )


def test_topo_chain():
    nodes = {"a": _n("a"), "b": _n("b", ["a"]), "c": _n("c", ["b"])}
    order = topological_order(nodes)
    assert order.index("a") < order.index("b") < order.index("c")


def test_cycle_detected():
    nodes = {"a": _n("a", ["b"]), "b": _n("b", ["a"])}
    assert detect_cycle(nodes) is not None
    with pytest.raises(ValidationError):
        assert_acyclic(nodes)


def test_downstream_diamond():
    # a -> b, a -> c, b->d, c->d  (depends_on direction: b depends on a)
    nodes = {
        "a": _n("a"),
        "b": _n("b", ["a"]),
        "c": _n("c", ["a"]),
        "d": _n("d", ["b", "c"]),
    }
    assert downstream(nodes, "a") == {"b", "c", "d"}
    assert downstream(nodes, "b") == {"d"}
