"""Transparent quantile-to-parameter elicitation for initial continuous priors."""

from __future__ import annotations

from datetime import datetime
from math import isfinite, log
from statistics import NormalDist

from pydantic import BaseModel, ConfigDict, Field, model_validator

from lns_kernel.contracts import DistributionSpec, ParameterValue
from lns_kernel.distributions import distribution_statistics


class ElicitDistributionBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    id: str
    family_id: str
    median: float = Field(gt=0)
    p90: float = Field(gt=0)
    evidence_claim_ids: tuple[str, ...] = ()
    as_of: datetime
    confidence_rationale: str

    @model_validator(mode="after")
    def validate_quantiles_and_family(self) -> "ElicitDistributionBody":
        if self.p90 <= self.median:
            raise ValueError("p90 must be greater than median")
        if self.family_id not in {"Normal", "LogNormal"}:
            raise ValueError("quantile elicitation currently supports Normal or LogNormal")
        if self.as_of.tzinfo is None or self.as_of.utcoffset() is None:
            raise ValueError("as_of must be timezone-aware")
        return self


class ElicitationReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    method: str = "median_p90_quantile_match"
    family_id: str
    supplied_median: float | None = None
    supplied_p90: float | None = None
    quantile_z_score: float | None = None
    intuitive_inputs: dict[str, float] = Field(default_factory=dict)
    limitations: tuple[str, ...]


class ElicitationResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    distribution_spec: DistributionSpec
    derived_statistics: dict[str, float | None]
    receipt: ElicitationReceipt


class DeriveDistributionBody(BaseModel):
    """Plain-language values converted server-side into a registered distribution."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    id: str
    family_id: str
    values: dict[str, float]
    evidence_claim_ids: tuple[str, ...] = ()
    as_of: datetime
    confidence_rationale: str

    @model_validator(mode="after")
    def validate_common_fields(self) -> "DeriveDistributionBody":
        if self.family_id not in {"Normal", "LogNormal", "Beta", "Poisson", "NegativeBinomial", "Gamma", "StudentT", "Deterministic"}:
            raise ValueError("family_id must be a registered distribution family")
        if not self.values or any(not isfinite(value) for value in self.values.values()):
            raise ValueError("intuitive values must be finite and non-empty")
        if self.as_of.tzinfo is None or self.as_of.utcoffset() is None:
            raise ValueError("as_of must be timezone-aware")
        return self


def elicit_from_median_p90(body: ElicitDistributionBody) -> ElicitationResult:
    """Fit an initial Normal or LogNormal prior from an intuitive median and P90."""

    z_score = NormalDist().inv_cdf(0.9)
    if body.family_id == "Normal":
        parameters = (
            ParameterValue(id="loc", value=body.median),
            ParameterValue(id="scale", value=(body.p90 - body.median) / z_score),
        )
        support_lower = support_upper = None
        support_lower_open = support_upper_open = False
    else:
        parameters = (
            ParameterValue(id="log_loc", value=log(body.median)),
            ParameterValue(id="log_scale", value=log(body.p90 / body.median) / z_score),
        )
        support_lower, support_upper = 0.0, None
        support_lower_open, support_upper_open = True, False
    spec = DistributionSpec(
        id=body.id,
        family_id=body.family_id,
        parameters=parameters,
        support_lower=support_lower,
        support_upper=support_upper,
        support_lower_open=support_lower_open,
        support_upper_open=support_upper_open,
        elicitation_method="median_p90_quantile_match",
        evidence_claim_ids=body.evidence_claim_ids,
        as_of=body.as_of,
        confidence_rationale=body.confidence_rationale,
    )
    return ElicitationResult(
        distribution_spec=spec,
        derived_statistics=distribution_statistics(spec.family_id, spec.parameter_map),
        receipt=ElicitationReceipt(
            family_id=spec.family_id,
            supplied_median=body.median,
            supplied_p90=body.p90,
            quantile_z_score=z_score,
            limitations=(
                "Two quantiles define an initial parametric prior, not empirical validation.",
                "The operator must review support, evidence, and tail behavior before activation.",
            ),
        ),
    )


def derive_from_intuitive_inputs(body: DeriveDistributionBody) -> ElicitationResult:
    """Derive all registered family parameters from explicitly named human inputs."""

    values = body.values

    def exact(*keys: str) -> None:
        if set(values) != set(keys):
            raise ValueError(f"{body.family_id} requires exactly: {', '.join(keys)}")

    if body.family_id in {"Normal", "LogNormal"}:
        exact("median", "p90")
        return elicit_from_median_p90(ElicitDistributionBody(
            id=body.id, family_id=body.family_id, median=values["median"], p90=values["p90"],
            evidence_claim_ids=body.evidence_claim_ids, as_of=body.as_of, confidence_rationale=body.confidence_rationale,
        ))
    if body.family_id == "Beta":
        exact("mean", "concentration")
        mean, concentration = values["mean"], values["concentration"]
        if not 0 < mean < 1 or concentration <= 0: raise ValueError("Beta mean must be between 0 and 1 and concentration must be positive")
        parameters = {"alpha": mean * concentration, "beta": (1 - mean) * concentration}
    elif body.family_id == "Poisson":
        exact("expected_count")
        if values["expected_count"] <= 0: raise ValueError("Poisson expected_count must be positive")
        parameters = {"rate": values["expected_count"]}
    elif body.family_id == "NegativeBinomial":
        exact("expected_count", "dispersion")
        if values["expected_count"] < 0 or values["dispersion"] <= 0: raise ValueError("NegativeBinomial expected_count must be non-negative and dispersion positive")
        parameters = {"mean": values["expected_count"], "dispersion": values["dispersion"]}
    elif body.family_id == "Gamma":
        exact("mean", "standard_deviation")
        mean, standard_deviation = values["mean"], values["standard_deviation"]
        if mean <= 0 or standard_deviation <= 0: raise ValueError("Gamma mean and standard_deviation must be positive")
        scale = standard_deviation**2 / mean
        parameters = {"shape": mean / scale, "scale": scale}
    elif body.family_id == "StudentT":
        exact("location", "scale", "degrees_of_freedom")
        if values["scale"] <= 0 or values["degrees_of_freedom"] <= 0: raise ValueError("StudentT scale and degrees_of_freedom must be positive")
        parameters = {"loc": values["location"], "scale": values["scale"], "df": values["degrees_of_freedom"]}
    else:
        exact("value")
        parameters = {"value": values["value"]}
    statistics = distribution_statistics(body.family_id, parameters)
    spec = DistributionSpec(
        id=body.id, family_id=body.family_id,
        parameters=tuple(ParameterValue(id=key, value=value) for key, value in parameters.items()),
        support_lower=statistics["support_lower"], support_upper=statistics["support_upper"],
        support_lower_open=body.family_id in {"Beta", "Gamma"}, support_upper_open=body.family_id == "Beta",
        elicitation_method="intuitive_family_derivation", evidence_claim_ids=body.evidence_claim_ids,
        as_of=body.as_of, confidence_rationale=body.confidence_rationale,
    )
    return ElicitationResult(
        distribution_spec=spec, derived_statistics=statistics,
        receipt=ElicitationReceipt(method="intuitive_family_derivation", family_id=body.family_id, intuitive_inputs=values,
            limitations=("Human-friendly inputs define an initial parametric assumption, not empirical validation.", "The operator must review support, evidence, and tail behavior before activation.")),
    )
