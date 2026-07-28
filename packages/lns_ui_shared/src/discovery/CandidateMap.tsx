import { useState } from "react";
import type { CandidateFactor, CandidateGraphFixture } from "../api/types";
import { HopGraph } from "../graph/HopGraph";
import { WarningCenter } from "../inspectors/WarningCenter";

export interface CandidateMapClient {
  createFixtureCandidateProposal(targetId: string): Promise<CandidateGraphFixture>;
  materializeFixtureCandidateProposal?(targetId: string): Promise<{ graph?: { id?: string }; active_graph_mutated?: boolean }>;
}

type FixtureCandidateRevision = Pick<CandidateGraphFixture, "factors" | "relationships">;

function copyRevision(revision: FixtureCandidateRevision): FixtureCandidateRevision {
  return { factors: revision.factors.map((factor) => ({ ...factor })), relationships: revision.relationships.map((relationship) => ({ ...relationship })) };
}

export function CandidateMap({ targetId, client }: { targetId: string; client: CandidateMapClient }) {
  const [fixture, setFixture] = useState<CandidateGraphFixture | null>(null);
  const [revision, setRevision] = useState<FixtureCandidateRevision | null>(null);
  const [savedRevision, setSavedRevision] = useState<FixtureCandidateRevision | null>(null);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [revisionStatus, setRevisionStatus] = useState("");
  const [error, setError] = useState("");
  const [materializedGraphId, setMaterializedGraphId] = useState("");
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try {
      const loaded = await client.createFixtureCandidateProposal(targetId);
      setFixture(loaded);
      setRevision(copyRevision(loaded));
      setSelectedFactorId(loaded.factors[0]?.id ?? "");
      setSavedRevision(null);
      setRevisionStatus("");
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load candidate map."); }
    finally { setLoading(false); }
  }
  const factors = revision?.factors ?? fixture?.factors ?? [];
  const relationships = revision?.relationships ?? fixture?.relationships ?? [];
  const selectedFactor = factors.find((factor) => factor.id === selectedFactorId);
  const baselineFactors = fixture?.factors ?? [];
  const removedFactors = baselineFactors.filter((factor) => !factors.some((candidate) => candidate.id === factor.id));
  const addedFactors = factors.filter((factor) => !baselineFactors.some((baseline) => baseline.id === factor.id));
  const baselineEdges = new Set((fixture?.relationships ?? []).map((relationship) => `${String(relationship.parent_node_id)}:${String(relationship.child_node_id)}`));
  const addedEdges = relationships.filter((relationship) => !baselineEdges.has(`${String(relationship.parent_node_id)}:${String(relationship.child_node_id)}`));

  function removeSelectedFactor() {
    if (!selectedFactor) return;
    setRevision((current) => current ? {
      factors: current.factors.filter((factor) => factor.id !== selectedFactor.id),
      relationships: current.relationships.filter((relationship) => relationship.parent_node_id !== selectedFactor.id && relationship.child_node_id !== selectedFactor.id),
    } : current);
    setSelectedFactorId((current) => current === selectedFactor.id ? factors.find((factor) => factor.id !== selectedFactor.id)?.id ?? "" : current);
    setRevisionStatus(`Removed ${selectedFactor.label} from this fixture candidate revision.`);
  }

  function extendSelectedBranch() {
    if (!selectedFactor) return;
    const extensionId = `fixture-branch-extension-${selectedFactor.id}`;
    setRevision((current) => {
      if (!current || current.factors.some((factor) => factor.id === extensionId)) return current;
      const extension: CandidateFactor = {
        id: extensionId,
        label: `Fixture branch extension for ${selectedFactor.label}`,
        rank: Math.max(0, ...current.factors.map((factor) => factor.rank)) + 1,
        hop_distance: Math.min(3, selectedFactor.hop_distance + 1),
        state: "proposed",
        evidence_status: "fixture_unverified",
      };
      return { factors: [...current.factors, extension], relationships: [...current.relationships, { parent_node_id: extensionId, child_node_id: selectedFactor.id }] };
    });
    setRevisionStatus(`Extended ${selectedFactor.label} with a fixture-only proposed branch.`);
  }

  function saveFixtureRevision() {
    if (!revision) return;
    setSavedRevision(copyRevision(revision));
    setRevisionStatus("Fixture branch revision saved for replay in this browser session only.");
  }

  function replayFixtureRevision() {
    if (!savedRevision) return;
    setRevision(copyRevision(savedRevision));
    setSelectedFactorId(savedRevision.factors[0]?.id ?? "");
    setRevisionStatus("Replayed fixture branch revision without changing an active graph.");
  }
  async function materialize() {
    if (!client.materializeFixtureCandidateProposal) return;
    try { const result = await client.materializeFixtureCandidateProposal(targetId); setMaterializedGraphId(result.graph?.id ?? "unknown"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to materialize fixture candidate graph."); }
  }

  return <section aria-label="Candidate map">
    <p>Candidate breadth is proposal-only. It never activates factors or declares live research.</p>
    {!fixture && <button onClick={load} disabled={loading}>{loading ? "Loading fixture candidate map…" : "Load labeled fixture candidate map"}</button>}
    {error && <p role="alert">{error}</p>}
    {fixture && <><p>Fixture candidate map — not live research</p><WarningCenter warnings={fixture.limitations.map((message, index) => ({ id: `fixture-limitation-${index}`, severity: "warning" as const, message }))} />
      <section aria-label="Fixture branch refinement">
        <h2>Fixture branch refinement</h2><p>These controls change only the displayed fixture candidate in this browser session. They do not persist, approve, or alter an active graph.</p>
        <label>Candidate factor for fixture refinement<select aria-label="Candidate factor for fixture refinement" value={selectedFactorId} onChange={(event) => setSelectedFactorId(event.target.value)}>{factors.map((factor) => <option key={factor.id} value={factor.id}>{factor.label}</option>)}</select></label>
        <button onClick={removeSelectedFactor} disabled={!selectedFactor}>Remove selected fixture factor</button><button onClick={extendSelectedBranch} disabled={!selectedFactor}>Extend selected fixture branch</button><button onClick={saveFixtureRevision} disabled={!revision}>Request fixture branch revision</button><button onClick={replayFixtureRevision} disabled={!savedRevision}>Replay fixture branch revision</button>
        {client.materializeFixtureCandidateProposal && <button onClick={() => void materialize()}>Materialize fixture proposal for review</button>}
        {materializedGraphId && <p role="status">Fixture candidate graph {materializedGraphId} persisted for separate review; no factor is active.</p>}
        {revisionStatus && <p role="status">{revisionStatus}</p>}
        <section aria-label="Fixture revision delta"><h3>Fixture revision delta</h3>{removedFactors.length === 0 && addedFactors.length === 0 ? <p>No fixture candidate changes staged.</p> : <>{removedFactors.map((factor) => <p key={`removed-${factor.id}`}>Removed factor: {factor.label}.</p>)}{addedFactors.map((factor) => <p key={`added-${factor.id}`}>Added factor: {factor.label}.</p>)}{addedEdges.map((edge) => <p key={`edge-${String(edge.parent_node_id)}-${String(edge.child_node_id)}`}>Added model dependency: {String(edge.parent_node_id)} → {String(edge.child_node_id)}.</p>)}</>}<p>Active graph unchanged: yes.</p></section>
      </section>
      <HopGraph factors={factors} relationships={relationships} targetId={typeof fixture.graph_proposal.target_node_id === "string" ? fixture.graph_proposal.target_node_id : "target"} targetLabel="Private-investor retail neodymium price" />
    </>}
  </section>;
}
