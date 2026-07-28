import { useMemo, useState } from "react";
import type { CandidateFactor, VisibleNodeState } from "../api/types";
import { layoutHopGraph } from "./layout";

export function HopGraph({ factors, targetLabel = "Target outcome" }: { factors: CandidateFactor[]; targetLabel?: string }) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | VisibleNodeState>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(() => factors.filter((factor) => factor.label.toLowerCase().includes(query.toLowerCase()) && (stateFilter === "all" || factor.state === stateFilter)), [factors, query, stateFilter]);
  const layout = useMemo(() => layoutHopGraph(filtered, { width: 1200, height: 700 }), [filtered]);
  return <section aria-label="Target-centered dependency graph">
    <label>Search factors<input type="search" aria-label="Search factors" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <label>Filter graph state<select aria-label="Filter graph state" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as "all" | VisibleNodeState)}><option value="all">all</option><option value="active">active</option><option value="proposed">proposed</option><option value="excluded">excluded</option><option value="unsupported">unsupported</option><option value="stale">stale</option></select></label>
    <p>{filtered.length} factors shown. Textual graph alternative:</p>
    <div role="group" aria-label="Visual target-centered graph" style={{ position: "relative", minHeight: 700, overflow: "auto" }}>
      <button type="button" aria-pressed={selected === "target"} onClick={() => setSelected("target")} style={{ position: "absolute", left: 1100, top: 330 }}>{targetLabel}</button>
      {filtered.map((factor) => <button key={factor.id} type="button" aria-pressed={selected === factor.id} onClick={() => setSelected(factor.id)} style={{ position: "absolute", left: layout[factor.id]?.x, top: layout[factor.id]?.y }}>
        {factor.label}
      </button>)}
    </div>
    {selected && <p role="status">Selected {selected === "target" ? targetLabel : factors.find((factor) => factor.id === selected)?.label ?? selected}</p>}
    <ul>{filtered.map((factor) => <li key={factor.id} data-x={layout[factor.id]?.x} data-y={layout[factor.id]?.y}><strong>{factor.label}</strong> — hop {factor.hop_distance}; <span>{factor.state}</span>; {factor.evidence_status}</li>)}</ul>
  </section>;
}
