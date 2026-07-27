"""Canonical distribution catalog for transparent prediction authoring."""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Mapping

import numpy as np


@dataclass(frozen=True)
class SupportDefinition:
    lower: float | None = None
    upper: float | None = None
    lower_open: bool = False
    upper_open: bool = False


@dataclass(frozen=True)
class ParameterDefinition:
    id: str
    label: str
    description: str
    lower: float | None = None
    lower_open: bool = False


@dataclass(frozen=True)
class FamilyDefinition:
    id: str
    label: str
    parameters: tuple[str, ...]
    parameter_definitions: tuple[ParameterDefinition, ...]
    support: SupportDefinition
    plain_language: str


def _parameter(id: str, label: str, description: str, *, lower: float | None = None, lower_open: bool = False) -> ParameterDefinition:
    return ParameterDefinition(id, label, description, lower, lower_open)


def _family(
    id: str,
    plain_language: str,
    support: SupportDefinition,
    *parameters: ParameterDefinition,
) -> FamilyDefinition:
    return FamilyDefinition(
        id=id,
        label=id,
        parameters=tuple(parameter.id for parameter in parameters),
        parameter_definitions=parameters,
        support=support,
        plain_language=plain_language,
    )


REGISTRY: dict[str, FamilyDefinition] = {
    "Normal": _family(
        "Normal", "A symmetric continuous quantity around a central expected value.", SupportDefinition(),
        _parameter("mu", "Mean", "Expected value."),
        _parameter("sigma", "Standard deviation", "Spread around the mean.", lower=0, lower_open=True),
    ),
    "LogNormal": _family(
        "LogNormal", "A positive continuous quantity with right-tail uncertainty, modeled in log space.", SupportDefinition(lower=0, lower_open=True),
        _parameter("log_loc", "Log-space mean", "Mean of the natural logarithm."),
        _parameter("log_scale", "Log-space standard deviation", "Spread in natural-log space.", lower=0, lower_open=True),
    ),
    "Beta": _family(
        "Beta", "A bounded proportion or probability between zero and one.", SupportDefinition(lower=0, upper=1, lower_open=True, upper_open=True),
        _parameter("alpha", "Alpha", "First positive shape parameter.", lower=0, lower_open=True),
        _parameter("beta", "Beta", "Second positive shape parameter.", lower=0, lower_open=True),
    ),
    "Poisson": _family(
        "Poisson", "A non-negative count over a defined exposure period.", SupportDefinition(lower=0),
        _parameter("rate", "Rate", "Expected count for the specified exposure.", lower=0, lower_open=True),
    ),
    "NegativeBinomial": _family(
        "NegativeBinomial", "An over-dispersed non-negative count.", SupportDefinition(lower=0),
        _parameter("n", "Dispersion", "Positive count-dispersion shape.", lower=0, lower_open=True),
        _parameter("p", "Success probability", "Probability strictly between zero and one.", lower=0, lower_open=True),
    ),
    "Gamma": _family(
        "Gamma", "A positive continuous quantity with asymmetric right-tail uncertainty.", SupportDefinition(lower=0, lower_open=True),
        _parameter("shape", "Shape", "Positive shape parameter.", lower=0, lower_open=True),
        _parameter("scale", "Scale", "Positive scale parameter.", lower=0, lower_open=True),
    ),
    "StudentT": _family(
        "StudentT", "A continuous quantity with heavier tails than a normal distribution.", SupportDefinition(),
        _parameter("loc", "Location", "Central location."),
        _parameter("scale", "Scale", "Positive scale.", lower=0, lower_open=True),
        _parameter("df", "Degrees of freedom", "Tail weight; positive values permit heavy tails.", lower=0, lower_open=True),
    ),
    "Deterministic": _family(
        "Deterministic", "A fixed value used only when uncertainty is intentionally excluded.", SupportDefinition(),
        _parameter("value", "Value", "Fixed value."),
    ),
}

ALIASES = {
    "gaussian": "Normal",
    "normal": "Normal",
    "log-normal": "LogNormal",
    "lognormal": "LogNormal",
    "negative binomial": "NegativeBinomial",
    "negativebinomial": "NegativeBinomial",
    "student-t": "StudentT",
    "student t": "StudentT",
    "studentt": "StudentT",
}


def get_family(identifier: str) -> FamilyDefinition:
    """Resolve a canonical id or ingestion alias without persisting the alias."""

    if identifier in REGISTRY:
        return REGISTRY[identifier]
    canonical = ALIASES.get(identifier.strip().lower())
    if canonical is None:
        raise KeyError(f"unknown distribution family: {identifier}")
    return REGISTRY[canonical]


def validate_family_parameters(identifier: str, parameters: Mapping[str, float]) -> FamilyDefinition:
    """Validate a canonical parameter mapping before a distribution is sampled."""

    family = get_family(identifier)
    expected = set(family.parameters)
    supplied = set(parameters)
    missing = expected - supplied
    unexpected = supplied - expected
    if missing or unexpected:
        details = []
        if missing:
            details.append(f"missing: {', '.join(sorted(missing))}")
        if unexpected:
            details.append(f"unexpected: {', '.join(sorted(unexpected))}")
        raise ValueError(f"{family.id} parameters do not match registry ({'; '.join(details)})")
    for parameter_id, value in parameters.items():
        if not math.isfinite(value):
            raise ValueError(f"{parameter_id} must be finite")
    for definition in family.parameter_definitions:
        value = parameters[definition.id]
        if definition.lower is not None:
            if definition.lower_open and value <= definition.lower:
                raise ValueError(f"{definition.id} must be > {definition.lower:g}")
            if not definition.lower_open and value < definition.lower:
                raise ValueError(f"{definition.id} must be >= {definition.lower:g}")
    if family.id == "NegativeBinomial" and parameters["p"] >= 1:
        raise ValueError("p must be between 0 and 1")
    return family


def distribution_statistics(identifier: str, parameters: Mapping[str, float]) -> dict[str, float | None]:
    """Return only analytic statistics that are defined and defensible for the family."""

    family = validate_family_parameters(identifier, parameters)
    stats: dict[str, float | None] = {
        "mean": None,
        "median": None,
        "mode": None,
        "variance": None,
        "support_lower": family.support.lower,
        "support_upper": family.support.upper,
    }
    if family.id == "Normal":
        stats.update(mean=parameters["mu"], median=parameters["mu"], mode=parameters["mu"], variance=parameters["sigma"] ** 2)
    elif family.id == "LogNormal":
        loc, scale = parameters["log_loc"], parameters["log_scale"]
        stats.update(
            mean=math.exp(loc + scale**2 / 2),
            median=math.exp(loc),
            mode=math.exp(loc - scale**2),
            variance=(math.exp(scale**2) - 1) * math.exp(2 * loc + scale**2),
        )
    elif family.id == "Beta":
        alpha, beta = parameters["alpha"], parameters["beta"]
        stats.update(mean=alpha / (alpha + beta), variance=(alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1)))
        if alpha > 1 and beta > 1:
            stats["mode"] = (alpha - 1) / (alpha + beta - 2)
    elif family.id == "Poisson":
        stats.update(mean=parameters["rate"], variance=parameters["rate"])
    elif family.id == "NegativeBinomial":
        n, p = parameters["n"], parameters["p"]
        stats.update(mean=n * (1 - p) / p, variance=n * (1 - p) / p**2)
    elif family.id == "Gamma":
        shape, scale = parameters["shape"], parameters["scale"]
        stats.update(mean=shape * scale, variance=shape * scale**2)
        if shape >= 1:
            stats["mode"] = (shape - 1) * scale
    elif family.id == "StudentT":
        df, loc, scale = parameters["df"], parameters["loc"], parameters["scale"]
        if df > 1:
            stats["mean"] = loc
        if df > 2:
            stats["variance"] = scale**2 * df / (df - 2)
        if df == 1:
            stats["mode"] = loc
    elif family.id == "Deterministic":
        value = parameters["value"]
        stats.update(mean=value, median=value, mode=value, variance=0.0)
    return stats


def sample_distribution(
    identifier: str,
    parameters: Mapping[str, float],
    *,
    size: int,
    seed: int,
) -> np.ndarray:
    """Draw reproducible samples from a validated canonical family."""

    if size <= 0:
        raise ValueError("size must be positive")
    family = validate_family_parameters(identifier, parameters)
    rng = np.random.default_rng(seed)
    if family.id == "Normal":
        return rng.normal(parameters["mu"], parameters["sigma"], size=size)
    if family.id == "LogNormal":
        return rng.lognormal(parameters["log_loc"], parameters["log_scale"], size=size)
    if family.id == "Beta":
        return rng.beta(parameters["alpha"], parameters["beta"], size=size)
    if family.id == "Poisson":
        return rng.poisson(parameters["rate"], size=size).astype(float)
    if family.id == "NegativeBinomial":
        return rng.negative_binomial(parameters["n"], parameters["p"], size=size).astype(float)
    if family.id == "Gamma":
        return rng.gamma(parameters["shape"], parameters["scale"], size=size)
    if family.id == "StudentT":
        return parameters["loc"] + parameters["scale"] * rng.standard_t(parameters["df"], size=size)
    if family.id == "Deterministic":
        return np.full(size, parameters["value"], dtype=float)
    raise AssertionError(f"registry family {family.id} has no sampler")
