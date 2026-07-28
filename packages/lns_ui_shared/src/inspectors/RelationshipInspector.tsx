export interface RelationshipReview {
  id: string;
  parentLabel: string;
  childLabel: string;
  type: "causal_hypothesis" | "accounting_identity" | "observed_relation" | "proxy_correlation" | "scenario_assumption" | "unknown";
  units: string;
  lagSteps?: number;
  sign?: "positive" | "negative" | "unknown";
  transform?: string;
  coefficientDistribution?: string;
  sourceUnit?: string;
  targetUnit?: string;
  lagUnit?: string;
  validityRange?: string;
  evidence: string;
  evidenceLinks?: string[];
  warnings?: string[];
  state: string;
}

export function RelationshipInspector({ relationship, onChange }: { relationship: RelationshipReview; onChange?: (relationship: RelationshipReview) => void }) {
  const update = (patch: Partial<RelationshipReview>) => onChange?.({ ...relationship, ...patch });

  return <section aria-label="Relationship inspector">
    <h2>{relationship.parentLabel} → {relationship.childLabel}</h2>
    {onChange && <p>Draft-only changes: active model structure is unchanged until separate review and approval.</p>}
    <label>Relationship type
      <select value={relationship.type} disabled={!onChange} onChange={(event) => update({ type: event.target.value as RelationshipReview["type"] })}>
        <option value="unknown">Not recorded</option><option value="causal_hypothesis">causal hypothesis</option><option value="accounting_identity">accounting identity</option><option value="observed_relation">observed relation</option><option value="proxy_correlation">proxy correlation</option><option value="scenario_assumption">scenario assumption</option>
      </select>
    </label>
    <label>Units<input value={relationship.units} disabled={!onChange} onChange={(event) => update({ units: event.target.value })} /></label>
    <label>Source unit<input value={relationship.sourceUnit ?? ""} disabled={!onChange} onChange={(event) => update({ sourceUnit: event.target.value })} /></label>
    <label>Target unit<input value={relationship.targetUnit ?? ""} disabled={!onChange} onChange={(event) => update({ targetUnit: event.target.value })} /></label>
    <label>Transform<input value={relationship.transform ?? "affine"} disabled={!onChange} onChange={(event) => update({ transform: event.target.value })} /></label>
    <label>Coefficient distribution<input value={relationship.coefficientDistribution ?? "Unspecified"} disabled={!onChange} onChange={(event) => update({ coefficientDistribution: event.target.value })} /></label>
    <label>Sign<select value={relationship.sign ?? "unknown"} disabled={!onChange} onChange={(event) => update({ sign: event.target.value as RelationshipReview["sign"] })}><option value="positive">positive</option><option value="negative">negative</option><option value="unknown">unknown</option></select></label>
    <label>Lag steps<input type="number" min="0" value={relationship.lagSteps ?? ""} placeholder="Not recorded" disabled={!onChange} onChange={(event) => update({ lagSteps: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
    <label>Lag unit<input value={relationship.lagUnit ?? "steps"} disabled={!onChange} onChange={(event) => update({ lagUnit: event.target.value })} /></label>
    <label>Validity range<input value={relationship.validityRange ?? "Not specified"} disabled={!onChange} onChange={(event) => update({ validityRange: event.target.value })} /></label>
    <p>Evidence: <span>{relationship.evidence}</span></p>
    {relationship.evidenceLinks?.length ? <ul aria-label="Relationship evidence links">{relationship.evidenceLinks.map((link) => <li key={link}>{link}</li>)}</ul> : <p>Evidence links: none recorded.</p>}
    {relationship.warnings?.length ? <ul aria-label="Relationship warnings">{relationship.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p>No relationship warnings.</p>}
    <label>Relationship state
      <select value={relationship.state} disabled={!onChange} onChange={(event) => update({ state: event.target.value })}>
        <option value="proposed">proposed</option><option value="active">active</option><option value="excluded">excluded</option><option value="unsupported">unsupported</option><option value="stale">stale</option>
      </select>
    </label>
  </section>;
}
