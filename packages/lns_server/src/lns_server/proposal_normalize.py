"""Normalize messy LLM node proposals into kernel-valid Node fields."""

from __future__ import annotations

import re
from typing import Any

from lns_kernel.models import DistributionFamily, Node, NodeStatus, TransformKind
from lns_kernel.validation import ValidationError


def strip_json_fences(text: str) -> str:
    s = text.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def _to_float(v: Any, field: str) -> float:
    if isinstance(v, bool):
        raise ValidationError(f"{field} must be a number, not bool")
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.strip())
        except ValueError as e:
            raise ValidationError(
                f"{field} must be numeric, got {v!r}. "
                "Use numbers only in parameters (parent links go in depends_on)."
            ) from e
    raise ValidationError(f"{field} must be numeric, got {type(v).__name__}")


def normalize_parameters(family: DistributionFamily, raw: dict[str, Any] | None) -> dict[str, float]:
    raw = dict(raw or {})
    # Common LLM aliases
    aliases = {
        "mean": "mu",
        "std": "sigma",
        "stddev": "sigma",
        "standard_deviation": "sigma",
        "alpha": "a",
        "beta": "b",
        "val": "value",
        "constant": "value",
    }
    out: dict[str, float] = {}
    for k, v in raw.items():
        key = aliases.get(str(k).lower(), str(k))
        # skip non-numeric symbolic junk
        try:
            out[key] = _to_float(v, key)
        except ValidationError:
            # if model put expression strings, skip and let validate fail with missing keys
            continue
    # Beta often only has alpha/beta already mapped
    if family == DistributionFamily.BETA:
        if "a" not in out and "alpha" in raw:
            out["a"] = _to_float(raw["alpha"], "a")
        if "b" not in out and "beta" in raw:
            out["b"] = _to_float(raw["beta"], "b")
    return out


def normalize_transform(raw: Any, has_parents: bool) -> TransformKind:
    if not has_parents:
        return TransformKind.NONE
    if raw is None:
        return TransformKind.AFFINE
    s = str(raw).strip().lower().replace("-", "_").replace(" ", "_")
    mapping = {
        "none": TransformKind.NONE,
        "affine": TransformKind.AFFINE,
        "linear": TransformKind.AFFINE,
        "lin": TransformKind.AFFINE,
        "sum": TransformKind.SUM_PARENTS,
        "sum_parents": TransformKind.SUM_PARENTS,
        "mean": TransformKind.MEAN_PARENTS,
        "mean_parents": TransformKind.MEAN_PARENTS,
        "average": TransformKind.MEAN_PARENTS,
    }
    if s not in mapping:
        # default safe composition for dependents
        return TransformKind.AFFINE
    t = mapping[s]
    if t == TransformKind.NONE and has_parents:
        return TransformKind.AFFINE
    return t


def normalize_depends_on(raw: Any, existing_ids: set[str]) -> list[str]:
    if not raw:
        return []
    if not isinstance(raw, list):
        raw = [raw]
    deps: list[str] = []
    for d in raw:
        did = str(d).strip()
        if did in existing_ids:
            deps.append(did)
    return deps


def unique_id(proposed_id: str, existing_ids: set[str]) -> str:
    base = re.sub(r"[^a-z0-9_]+", "_", proposed_id.strip().lower()) or "proposed_node"
    base = re.sub(r"_+", "_", base).strip("_")
    if base not in existing_ids:
        return base
    for i in range(2, 100):
        cand = f"{base}_{i}"
        if cand not in existing_ids:
            return cand
    raise ValidationError(f"Could not allocate unique id for {proposed_id}")


def proposal_to_node(
    proposal: dict[str, Any],
    *,
    existing_ids: set[str],
    status: NodeStatus,
    created_by: str,
    model_tag: str | None,
) -> Node:
    if not isinstance(proposal, dict):
        raise ValidationError("proposal must be a JSON object")

    fam_raw = proposal.get("distribution_family") or proposal.get("family") or "Normal"
    fam_s = str(fam_raw).strip()
    # case-insensitive family
    fam_map = {f.value.lower(): f for f in DistributionFamily}
    fam = fam_map.get(fam_s.lower())
    if fam is None:
        raise ValidationError(
            f"Unknown distribution_family {fam_raw!r}; use Normal|LogNormal|Beta|Deterministic"
        )

    depends_on = normalize_depends_on(proposal.get("depends_on"), existing_ids)
    transform = normalize_transform(proposal.get("transform"), bool(depends_on))
    parameters = normalize_parameters(fam, proposal.get("parameters"))
    # Defaults if model omitted required params
    if fam == DistributionFamily.NORMAL and not parameters:
        parameters = {"mu": 0.0, "sigma": 1.0}
    if fam == DistributionFamily.NORMAL:
        parameters.setdefault("mu", 0.0)
        parameters.setdefault("sigma", 1.0)
    if fam == DistributionFamily.LOGNORMAL:
        parameters.setdefault("mu", 0.0)
        parameters.setdefault("sigma", 0.5)
    if fam == DistributionFamily.BETA:
        parameters.setdefault("a", 2.0)
        parameters.setdefault("b", 2.0)
    if fam == DistributionFamily.DETERMINISTIC:
        parameters.setdefault("value", 0.0)

    tp_raw = proposal.get("transform_params") or {}
    transform_params: dict[str, float] = {}
    if isinstance(tp_raw, dict):
        for k, v in tp_raw.items():
            try:
                transform_params[str(k)] = _to_float(v, str(k))
            except ValidationError:
                continue
    if transform == TransformKind.AFFINE and depends_on:
        transform_params.setdefault("a0", 0.0)
        transform_params.setdefault("a1", 1.0)

    pid = unique_id(str(proposal.get("id") or proposal.get("name") or "proposed_node"), existing_ids)
    tags = ["ai-proposed"]
    if model_tag:
        tags.append(f"model:{model_tag}")

    return Node(
        id=pid,
        name=str(proposal.get("name") or pid),
        description=str(proposal.get("description") or ""),
        distribution_family=fam,
        parameters=parameters,
        depends_on=depends_on,
        transform=transform,
        transform_params=transform_params,
        status=status,
        created_by=created_by,
        last_updated_by=created_by,
        discovery_rationale=str(proposal.get("discovery_rationale") or ""),
        tags=tags,
    )
