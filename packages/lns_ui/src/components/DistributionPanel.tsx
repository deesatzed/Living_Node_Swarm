import type { Freshness, Predictive } from "../api/client";

function histogram(samples: number[], bins = 24): number[] {
  if (!samples.length) return Array(bins).fill(0);
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = max - min || 1;
  const counts = Array(bins).fill(0);
  for (const s of samples) {
    let i = Math.floor(((s - min) / span) * bins);
    if (i >= bins) i = bins - 1;
    if (i < 0) i = 0;
    counts[i] += 1;
  }
  return counts;
}

export function DistributionPanel({
  predictive,
  freshness,
  nodeLabel,
}: {
  predictive: Predictive | null;
  freshness: Freshness | string;
  nodeLabel: string;
}) {
  const dim = freshness === "stale" || freshness === "updating";
  const counts = predictive ? histogram(predictive.samples) : [];
  const maxC = Math.max(1, ...counts);

  return (
    <div>
      <h2>Predictive distribution</h2>
      <div className="muted">{nodeLabel || "Select a node"}</div>
      {!predictive && <p className="muted">No snapshot predictive for this node yet.</p>}
      {predictive && (
        <>
          <div className="quantiles">
            <div className="qbox">
              <div className="k">p05</div>
              <div className="v">{predictive.quantiles.p05?.toFixed(3)}</div>
            </div>
            <div className="qbox">
              <div className="k">p50</div>
              <div className="v">{predictive.quantiles.p50?.toFixed(3)}</div>
            </div>
            <div className="qbox">
              <div className="k">p95</div>
              <div className="v">{predictive.quantiles.p95?.toFixed(3)}</div>
            </div>
          </div>
          <div className={`hist ${dim ? "dim" : ""}`} title={dim ? "Stale or updating — values may change" : "Fresh"}>
            {counts.map((c, i) => (
              <div key={i} className="bar" style={{ height: `${(c / maxC) * 100}%` }} />
            ))}
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            Derived (not primary): mean={predictive.derived_mean?.toFixed(3)} · median=
            {predictive.derived_median?.toFixed(3)} · std={predictive.derived_std?.toFixed(3)} · n=
            {predictive.n_samples}
          </p>
          {dim && (
            <p className="muted">
              Distributions are marked <strong>{freshness}</strong>. Waiting for re-simulation to finish before
              treating them as current.
            </p>
          )}
        </>
      )}
    </div>
  );
}
