"""AI-defined dynamic factor nodes for US gas / Kalshi scenarios."""

from __future__ import annotations

import json
from typing import Any

from lns_kernel.models import Node, NodeLayout, NodeStatus
from lns_server.openrouter import OpenRouterClient, OpenRouterError
from lns_server.proposal_normalize import proposal_to_node

# re-export for callers
__all__ = ["expand_gas_factors", "layout_for_new_nodes"]


GAS_EXPAND_SYSTEM = """You are a senior energy markets analyst building an explicit probabilistic
factor graph for US retail gasoline prices (AAA national average style).

Return ONLY a JSON object:
{
  "factors": [
    {
      "id": "snake_case_unique",
      "name": "short name",
      "description": "why it matters for retail gas",
      "distribution_family": "Normal|LogNormal|Beta|Deterministic",
      "parameters": { numeric only },
      "depends_on": ["existing_node_ids_only"],
      "transform": "none|affine|sum_parents|mean_parents",
      "transform_params": {},
      "discovery_rationale": "how this expands the latent space",
      "suggested_wire_to": "model_price_index" 
    }
  ]
}

Rules:
- Propose 3 to 5 NEW factors not already in the graph.
- Prefer real drivers: crude (WTI), crack spreads, inventories, refinery utilization,
  seasonal demand, hurricane risk, RIN/ethanol, geopolitics as Normal shocks in $/gal or unitless.
- parameters must be numbers (Normal: mu, sigma>0; Deterministic: value).
- depends_on must only reference ids that exist in the provided graph.
- suggested_wire_to should usually be model_price_index or aaa_national_avg when active.
- Do not invent Kalshi mid; that node already exists.
"""


def expand_gas_factors(
    or_client: OpenRouterClient,
    *,
    graph_nodes: dict[str, Node],
    ticker: str,
    threshold_usd: float,
    market_yes_mid: float | None,
    model: str | None,
    hint: str = "",
) -> tuple[list[dict[str, Any]], list[Node], list[str]]:
    """
    Call OpenRouter; return (raw_factors, Node objects proposed, errors).
    Nodes are status=proposed.
    """
    summary = [
        {
            "id": n.id,
            "name": n.name,
            "family": n.distribution_family.value,
            "parameters": n.parameters,
            "depends_on": n.depends_on,
            "status": n.status.value,
            "tags": n.tags,
        }
        for n in graph_nodes.values()
    ]
    user = (
        f"Kalshi ticker: {ticker or 'unknown'}\n"
        f"Strike threshold USD/gal: {threshold_usd}\n"
        f"Current YES mid: {market_yes_mid}\n"
        f"Existing graph nodes:\n{json.dumps(summary, indent=2)}\n"
        f"Extra hint: {hint or 'Expand latent multi-hop drivers of retail gas vs strike.'}\n"
        "Propose 3-5 NEW factors as JSON."
    )
    try:
        raw = or_client.chat_json(model=model, system=GAS_EXPAND_SYSTEM, user=user)
    except OpenRouterError:
        raise

    factors = raw.get("factors") if isinstance(raw, dict) else None
    if not isinstance(factors, list):
        # single object fallback
        if isinstance(raw, dict) and "id" in raw:
            factors = [raw]
        else:
            raise OpenRouterError(f"Expected factors array, got: {str(raw)[:400]}")

    existing = set(graph_nodes.keys())
    nodes: list[Node] = []
    accepted_raw: list[dict[str, Any]] = []
    errors: list[str] = []
    for i, fac in enumerate(factors):
        if not isinstance(fac, dict):
            errors.append(f"factor[{i}] not an object")
            continue
        try:
            node = proposal_to_node(
                fac,
                existing_ids=existing | {n.id for n in nodes},
                status=NodeStatus.PROPOSED,
                created_by="openrouter-gas",
                model_tag=model or "default",
            )
            # layout hint stored in tags
            wire = fac.get("suggested_wire_to") or "model_price_index"
            if "ai-dynamic" not in node.tags:
                node.tags = list(node.tags) + ["ai-dynamic", "gas", f"wire_hint:{wire}"]
            nodes.append(node)
            accepted_raw.append(fac)
            existing.add(node.id)
        except Exception as e:  # validation
            errors.append(f"factor[{i}] {fac.get('id')}: {e}")

    return accepted_raw, nodes, errors


def layout_for_new_nodes(existing_layout: dict[str, NodeLayout], new_ids: list[str]) -> dict[str, NodeLayout]:
    """Place new nodes in a column to the right of existing content."""
    max_x = 80.0
    for lay in existing_layout.values():
        max_x = max(max_x, float(lay.x))
    out: dict[str, NodeLayout] = {}
    x = max_x + 180
    y0 = 60.0
    for i, nid in enumerate(new_ids):
        out[nid] = NodeLayout(x=x + (i % 2) * 40, y=y0 + i * 90)
    return out
