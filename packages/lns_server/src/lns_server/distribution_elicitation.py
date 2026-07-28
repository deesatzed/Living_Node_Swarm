"""Transparent quantile-to-parameter elicitation for initial continuous priors."""

from __future__ import annotations

from datetime import datetime
from math import log
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
    supplied_median: float
    supplied_p90: float
    quantile_z_score: float
    limitations: tuple[str, ...]


class ElicitationResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    distribution_spec: DistributionSpec
    derived_statistics: dict[str, float | None]
    receipt: ElicitationReceipt


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
