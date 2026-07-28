import { useState } from "react";
import type { CandidateGraphFixture } from "../api/types";
import { HopGraph } from "../graph/HopGraph";

export interface CandidateMapClient {
  createFixtureCandidateProposal(targetId: string): Promise<CandidateGraphFixture>;
}

export function CandidateMap({ targetId, client }: { targetId: string; client: CandidateMapClient }) {
  const [fixture, setFixture] = useState<CandidateGraphFixture | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try { setFixture(await client.createFixtureCandidateProposal(targetId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load candidate map."); }
    finally { setLoading(false); }
  }
  return <section aria-label="Candidate map">
    <p>Candidate breadth is proposal-only. It never activates factors or declares live research.</p>
    {!fixture && <button onClick={load} disabled={loading}>{loading ? "Loading fixture candidate map…" : "Load labeled fixture candidate map"}</button>}
    {error && <p role="alert">{error}</p>}
    {fixture && <><p>Fixture candidate map — not live research</p><HopGraph factors={fixture.factors} targetLabel="Private-investor retail neodymium price" /></>}
  </section>;
}
