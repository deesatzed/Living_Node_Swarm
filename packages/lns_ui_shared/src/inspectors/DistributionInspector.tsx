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
  const curve = CURVE_PATHS[family] ?? CURVE_PATHS.Deterministic;
  return <section aria-label="Distribution inspector">
    <h2>{family}</h2>
    <p>Plain-language fit: {explanation}</p>
    <svg role="img" aria-label={`${family} distribution curve`} viewBox="0 0 160 100" width="240" height="120"><path d={curve} fill="none" stroke="currentColor" strokeWidth="3" /></svg>
    <p>Support: {support}</p><p>As of: {asOf}</p><p>Provenance: <span>{provenance}</span></p>
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
