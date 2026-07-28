const FAMILY_EXPLANATIONS: Record<string, string> = {
  Normal: "A symmetric continuous range around a central estimate.",
  LogNormal: "A positive-only range with a right tail for upside uncertainty.",
  Beta: "A bounded proportion or probability between explicit limits.",
  Poisson: "A non-negative count over a fixed interval.",
  NegativeBinomial: "A non-negative count with more variability than Poisson allows.",
  Gamma: "A positive continuous quantity with flexible right skew.",
  StudentT: "A continuous estimate with heavier tails than a Normal range.",
  Deterministic: "A fixed value used when no uncertainty is being modeled.",
};

const FAMILY_REVIEW_GUIDANCE: Record<string, { tails: string; alternatives: string; limitations: string }> = {
  Normal: {
    tails: "Symmetric, light tails: equally sized upward and downward deviations are treated alike.",
    alternatives: "Consider Student-t when credible outliers matter, or LogNormal/Gamma when the quantity must stay positive and skewed.",
    limitations: "A symmetric parametric range does not represent discrete regime changes or evidence of forecast accuracy.",
  },
  LogNormal: {
    tails: "Positive-only with a longer upper tail, so unusually large outcomes remain more plausible than equally distant low outcomes.",
    alternatives: "Consider Gamma for another positive skewed shape, or Normal only after a justified log-scale interpretation.",
    limitations: "It cannot represent zero or negative values and does not by itself model separate regimes.",
  },
  Beta: {
    tails: "Bounded at both ends; concentration determines how much mass sits near the middle versus the limits.",
    alternatives: "Consider a bounded transformed model when the quantity is not naturally a probability or proportion, or Deterministic when uncertainty is intentionally excluded.",
    limitations: "Its support is only the unit interval unless the surrounding model explicitly transforms the quantity.",
  },
  Poisson: {
    tails: "Discrete non-negative count tail governed by one rate; expected count and variance are tied together.",
    alternatives: "Consider NegativeBinomial when observed or elicited variation is wider than a single Poisson rate can express.",
    limitations: "It cannot express over-dispersion, zero inflation, or changing count regimes without an explicit separate model choice.",
  },
  NegativeBinomial: {
    tails: "Discrete non-negative count tail with extra spread beyond Poisson, controlled by the dispersion parameter.",
    alternatives: "Consider Poisson when count variance is credibly close to its mean.",
    limitations: "Extra dispersion is not a substitute for explicit zero-inflation, dependence, or regime assumptions.",
  },
  Gamma: {
    tails: "Positive continuous and right-skewed; shape and scale jointly control the mode and upper-tail spread.",
    alternatives: "Consider LogNormal when multiplicative variation is the clearer interpretation.",
    limitations: "It excludes zero and negative values and does not turn a continuous tail into a discrete scenario model.",
  },
  StudentT: {
    tails: "Symmetric with heavier tails than Normal; low degrees of freedom make extreme deviations more plausible.",
    alternatives: "Consider Normal when there is a defensible light-tail assumption and outlier sensitivity is not material.",
    limitations: "Heavier tails do not identify causes, calibration, or discrete regime switches.",
  },
  Deterministic: {
    tails: "No tail behavior: every draw is the same fixed value.",
    alternatives: "Consider an uncertainty-bearing family when the quantity is estimated, variable, or source freshness can change it.",
    limitations: "A fixed value hides uncertainty and should not be interpreted as evidence of certainty or forecast accuracy.",
  },
};

const CURVE_PATHS: Record<string, string> = {
  Normal: "M4 92 C35 92 42 8 80 8 C118 8 125 92 156 92",
  LogNormal: "M4 92 C40 92 47 25 74 18 C108 8 128 45 156 92",
  Beta: "M4 92 C38 40 72 15 80 15 C93 15 120 40 156 92",
  Poisson: "M4 92 L35 92 L35 65 L66 65 L66 38 L97 38 L97 65 L128 65 L128 82 L156 82",
  NegativeBinomial: "M4 92 L35 92 L35 70 L66 70 L66 45 L97 45 L97 62 L128 62 L128 78 L156 78",
  Gamma: "M4 92 C30 92 38 16 70 18 C105 22 120 60 156 92",
  StudentT: "M4 82 C34 72 45 16 80 16 C115 16 126 72 156 82",
  Deterministic: "M80 92 L80 12",
};

export interface DistributionDerivedValues {
  mean?: number;
  median?: number;
  mode?: number;
  standardDeviation?: number;
  interval?: string;
}

export function DistributionInspector({ family, parameters, support, asOf, provenance, derived = {} }: {
  family: string;
  parameters: Record<string, number>;
  support: string;
  asOf: string;
  provenance: string;
  derived?: DistributionDerivedValues;
}) {
  const explanation = FAMILY_EXPLANATIONS[family] ?? "An unrecognized distribution family; inspect the canonical parameters before relying on it.";
  const review = FAMILY_REVIEW_GUIDANCE[family] ?? {
    tails: "Tail behavior is not documented for this unrecognized family.",
    alternatives: "Use a registered family with an explicit review record before relying on this assumption.",
    limitations: "This unrecognized family has not been validated by the canonical review surface.",
  };
  const curve = CURVE_PATHS[family] ?? CURVE_PATHS.Deterministic;
  return <section aria-label="Distribution inspector">
    <h2>{family}</h2>
    <p>Plain-language fit: {explanation}</p>
    <svg role="img" aria-label={`${family} distribution curve`} viewBox="0 0 160 100" width="240" height="120"><path d={curve} fill="none" stroke="currentColor" strokeWidth="3" /></svg>
    <p>Support: {support}</p><p>As of: {asOf}</p><p>Provenance: <span>{provenance}</span></p>
    <section aria-label="Distribution tail behavior"><h3>Dispersion and tail behavior</h3><p>{review.tails}</p></section>
    <section aria-label="Distribution alternatives"><h3>Alternatives to review</h3><p>{review.alternatives}</p></section>
    <section aria-label="Distribution limitations"><h3>Limitations</h3><p>{review.limitations}</p></section>
    {(derived.mean !== undefined || derived.median !== undefined || derived.mode !== undefined || derived.standardDeviation !== undefined || derived.interval !== undefined) && <section aria-label="Derived distribution values">
      {derived.mean !== undefined && <p>Mean: {derived.mean}</p>}
      {derived.median !== undefined && <p>Median: {derived.median}</p>}
      {derived.mode !== undefined && <p>Mode: {derived.mode}</p>}
      {derived.standardDeviation !== undefined && <p>Standard deviation: {derived.standardDeviation}</p>}
      {derived.interval !== undefined && <p>Central interval: {derived.interval}</p>}
    </section>}
    <dl>{Object.entries(parameters).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
}
