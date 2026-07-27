"""US retail gas threshold use-case seed graph (Kalshi-aligned)."""

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


def build_gas_graph(
    *,
    name: str = "us-gas-kalshi",
    ticker: str = "",
    threshold_usd: float = 4.12,
    market_yes_mid: float | None = None,
    title: str = "US gas prices threshold market",
) -> Graph:
    """
    Domain-agnostic structure specialized for AAA national avg gas threshold markets.

    Nodes:
      - eia_or_aaa_level: prior on national avg $/gal (Normal)
      - week_shock: short-horizon residual noise
      - threshold: Deterministic strike ($/gal)
      - model_yes_prob: crude P(level+shock > threshold) via MC composition
      - market_implied_yes: Deterministic baseline from Kalshi mid (when known)
    """
    gid = str(uuid.uuid4())
    mid = market_yes_mid if market_yes_mid is not None else 0.5
    # prior around ~$3–4 gas; default mean near threshold
    mu = max(2.5, threshold_usd - 0.05)
    nodes = {
        "aaa_national_avg": Node(
            id="aaa_national_avg",
            name="AAA national avg gas $/gal",
            description="Latent national average retail gasoline price (USD/gal)",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": mu, "sigma": 0.08},
            depends_on=[],
            transform=TransformKind.NONE,
            status=NodeStatus.ACTIVE,
            units="USD/gal",
            created_by="gas_seed",
            last_updated_by="gas_seed",
            tags=["gas", "factor", "aaa"],
        ),
        "week_shock": Node(
            id="week_shock",
            name="Short-horizon shock",
            description="Near-term residual (inventory, demand, refinery) noise in $/gal",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 0.0, "sigma": 0.04},
            depends_on=[],
            transform=TransformKind.NONE,
            status=NodeStatus.ACTIVE,
            units="USD/gal",
            created_by="gas_seed",
            last_updated_by="gas_seed",
            tags=["gas", "factor"],
        ),
        "threshold_usd": Node(
            id="threshold_usd",
            name="Kalshi strike threshold",
            description=f"Contract threshold for YES: gas avg above this level. ticker={ticker}",
            distribution_family=DistributionFamily.DETERMINISTIC,
            parameters={"value": float(threshold_usd)},
            depends_on=[],
            transform=TransformKind.NONE,
            status=NodeStatus.ACTIVE,
            units="USD/gal",
            created_by="gas_seed",
            last_updated_by="gas_seed",
            tags=["gas", "strike", "kalshi"],
        ),
        "model_price_index": Node(
            id="model_price_index",
            name="Model gas level",
            description="aaa_national_avg + week_shock (affine composition)",
            distribution_family=DistributionFamily.NORMAL,
            parameters={"mu": 0.0, "sigma": 0.01},
            depends_on=["aaa_national_avg", "week_shock"],
            transform=TransformKind.SUM_PARENTS,
            transform_params={},
            status=NodeStatus.ACTIVE,
            units="USD/gal",
            created_by="gas_seed",
            last_updated_by="gas_seed",
            tags=["gas", "model"],
        ),
        "market_implied_yes": Node(
            id="market_implied_yes",
            name="Kalshi YES mid (baseline)",
            description=f"Market-implied P(YES) from Kalshi mid. ticker={ticker or 'TBD'}. {title}",
            distribution_family=DistributionFamily.DETERMINISTIC,
            parameters={"value": float(mid)},
            depends_on=[],
            transform=TransformKind.NONE,
            status=NodeStatus.ACTIVE,
            units="probability",
            created_by="gas_seed",
            last_updated_by="gas_seed",
            tags=["gas", "kalshi", "baseline"],
        ),
    }
    layout = {
        "aaa_national_avg": NodeLayout(x=60, y=80),
        "week_shock": NodeLayout(x=60, y=200),
        "threshold_usd": NodeLayout(x=280, y=40),
        "model_price_index": NodeLayout(x=280, y=140),
        "market_implied_yes": NodeLayout(x=500, y=140),
    }
    return Graph(
        id=gid,
        name=name,
        nodes=nodes,
        layout=layout,
        graph_version=1,
    )
