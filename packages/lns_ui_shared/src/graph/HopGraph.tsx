import { useMemo, useState } from "react";
import type { CandidateFactor } from "../api/types";
import { layoutHopGraph } from "./layout";

export function HopGraph({ factors }: { factors: CandidateFactor[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => factors.filter((factor) => factor.label.toLowerCase().includes(query.toLowerCase())), [factors, query]);
  const layout = useMemo(() => layoutHopGraph(filtered, { width: 1200, height: 700 }), [filtered]);
  return <section aria-label="Target-centered dependency graph">
    <label>Search factors<input type="search" aria-label="Search factors" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <p>{filtered.length} factors shown. Textual graph alternative:</p>
    <ul>{filtered.map((factor) => <li key={factor.id} data-x={layout[factor.id]?.x} data-y={layout[factor.id]?.y}><strong>{factor.label}</strong> — hop {factor.hop_distance}; <span>{factor.state}</span>; {factor.evidence_status}</li>)}</ul>
  </section>;
}
