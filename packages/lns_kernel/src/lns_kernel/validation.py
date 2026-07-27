"""Parameter and graph validation."""

from __future__ import annotations

from lns_kernel.models import DistributionFamily, Node, TransformKind


class ValidationError(ValueError):
    pass


def validate_parameters(family: DistributionFamily, parameters: dict[str, float]) -> None:
    if family == DistributionFamily.NORMAL:
        if "mu" not in parameters or "sigma" not in parameters:
            raise ValidationError("Normal requires parameters mu, sigma")
        if parameters["sigma"] <= 0:
            raise ValidationError("Normal sigma must be > 0")
    elif family == DistributionFamily.LOGNORMAL:
        if "mu" not in parameters or "sigma" not in parameters:
            raise ValidationError("LogNormal requires parameters mu, sigma")
        if parameters["sigma"] <= 0:
            raise ValidationError("LogNormal sigma must be > 0")
    elif family == DistributionFamily.BETA:
        if "a" not in parameters or "b" not in parameters:
            raise ValidationError("Beta requires parameters a, b")
        if parameters["a"] <= 0 or parameters["b"] <= 0:
            raise ValidationError("Beta a and b must be > 0")
    elif family == DistributionFamily.DETERMINISTIC:
        if "value" not in parameters:
            raise ValidationError("Deterministic requires parameter value")
    else:
        raise ValidationError(f"Unsupported family: {family}")


def validate_node(node: Node) -> None:
    validate_parameters(node.distribution_family, node.parameters)
    if node.depends_on and node.transform == TransformKind.NONE:
        raise ValidationError(
            f"Node {node.id} has depends_on but transform is none; set affine|sum_parents|mean_parents"
        )
    if not node.depends_on and node.transform != TransformKind.NONE:
        # roots may still carry eps family; transform ignored
        pass
    if node.transform == TransformKind.AFFINE and node.depends_on:
        # a0 required; a1.. optional default 1.0 at runtime
        if "a0" not in node.transform_params:
            raise ValidationError(f"Node {node.id} affine transform requires transform_params.a0")


def validate_graph_nodes(nodes: dict[str, Node]) -> None:
    for n in nodes.values():
        validate_node(n)
        for dep in n.depends_on:
            if dep not in nodes:
                raise ValidationError(f"Node {n.id} depends_on missing node {dep}")
