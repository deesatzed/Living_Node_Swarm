"""Domain-agnostic seed graph for v0.1 demos."""

from __future__ import annotations

import uuid

from lns_kernel.models import (
    DistributionFamily,
    Graph,
    Node,
    NodeLayout,
    NodeStatus,
    TransformKind,
)


def build_seed_graph(name: str = "seed-demo") -> Graph:
    """
    Three-node chain:
      input_signal ~ Normal(mu, sigma)  [root]
      process_stage = affine(input) + eps
      outcome = affine(process) + eps
    """
    gid = str(uuid.uuid4())
    nodes = {
        "input_signal": Node(
            id="input_signal",
            name="Input signal",
            description="Root uncertain input",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 0.0, "sigma": 1.0},
            depends_on=[],
            transform=TransformKind.NONE,
            status=NodeStatus.ACTIVE,
            created_by="seed",
            last_updated_by="seed",
            tags=["seed", "root"],
        ),
        "process_stage": Node(
            id="process_stage",
            name="Process stage",
            description="Intermediate process (affine over parents + noise)",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 0.0, "sigma": 0.3},
            depends_on=["input_signal"],
            transform=TransformKind.AFFINE,
            transform_params={"a0": 0.0, "a1": 1.2},
            status=NodeStatus.ACTIVE,
            created_by="seed",
            last_updated_by="seed",
            tags=["seed"],
        ),
        "outcome": Node(
            id="outcome",
            name="Outcome",
            description="Downstream outcome of interest",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 0.0, "sigma": 0.2},
            depends_on=["process_stage"],
            transform=TransformKind.AFFINE,
            transform_params={"a0": 0.5, "a1": 0.8},
            status=NodeStatus.ACTIVE,
            created_by="seed",
            last_updated_by="seed",
            tags=["seed", "target"],
        ),
    }
    layout = {
        "input_signal": NodeLayout(x=80, y=120),
        "process_stage": NodeLayout(x=280, y=120),
        "outcome": NodeLayout(x=480, y=120),
    }
    return Graph(id=gid, name=name, nodes=nodes, layout=layout, graph_version=1)
