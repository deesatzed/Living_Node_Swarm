"""Canonical distribution catalog for transparent prediction authoring."""

from __future__ import annotations

from dataclasses import dataclass


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
