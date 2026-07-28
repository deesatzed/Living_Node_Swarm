export interface RelationshipReview {
  id: string;
  parentLabel: string;
  childLabel: string;
  type: string;
  units: string;
  lagSteps: number;
  evidence: string;
  state: string;
}

export function RelationshipInspector({ relationship, onChange }: { relationship: RelationshipReview; onChange?: (relationship: RelationshipReview) => void }) {
  const update = (patch: Partial<RelationshipReview>) => onChange?.({ ...relationship, ...patch });

  return <section aria-label="Relationship inspector">
    <h2>{relationship.parentLabel} → {relationship.childLabel}</h2>
    <label>Relationship type
      <select value={relationship.type} disabled={!onChange} onChange={(event) => update({ type: event.target.value })}>
        <option value="affine">affine</option><option value="sum">sum</option><option value="mean">mean</option><option value="custom">custom</option>
      </select>
    </label>
    <label>Units<input value={relationship.units} disabled={!onChange} onChange={(event) => update({ units: event.target.value })} /></label>
    <label>Lag steps<input type="number" min="0" value={relationship.lagSteps} disabled={!onChange} onChange={(event) => update({ lagSteps: Number(event.target.value) })} /></label>
    <p>Evidence: <span>{relationship.evidence}</span></p>
    <label>Relationship state
      <select value={relationship.state} disabled={!onChange} onChange={(event) => update({ state: event.target.value })}>
        <option value="proposed">proposed</option><option value="active">active</option><option value="excluded">excluded</option><option value="unsupported">unsupported</option><option value="stale">stale</option>
      </select>
    </label>
  </section>;
}
