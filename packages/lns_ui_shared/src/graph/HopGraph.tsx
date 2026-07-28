import { useId, useMemo, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { CandidateFactor, VisibleNodeState } from "../api/types";
import { layoutHopGraph } from "./layout";

interface GraphRelationship {
  parent_node_id?: string;
  child_node_id?: string;
  state?: string;
  evidence_status?: string;
}

function tracedPath(selected: string | null, targetId: string, relationships: GraphRelationship[]): string[] {
  if (!selected || selected === "target") return [];
  const nextByParent = new Map<string, string>();
  for (const relationship of relationships) {
    if (relationship.parent_node_id && relationship.child_node_id) nextByParent.set(relationship.parent_node_id, relationship.child_node_id);
  }
  const path = [selected];
  while (path.at(-1) !== targetId) {
    const next = nextByParent.get(path.at(-1) ?? "");
    if (!next || path.includes(next)) return [];
    path.push(next);
  }
  return path;
}

export function HopGraph({
  factors,
  targetLabel = "Target outcome",
  targetId = "target",
  relationships = [],
  onSelect,
}: {
  factors: CandidateFactor[];
  targetLabel?: string;
  targetId?: string;
  relationships?: GraphRelationship[];
  onSelect?: (nodeId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | VisibleNodeState>("all");
  const [hopFilter, setHopFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(null);
  const keyboardHelpId = useId();
  const filtered = useMemo(
    () => factors.filter((factor) => factor.label.toLowerCase().includes(query.toLowerCase())
      && (stateFilter === "all" || factor.state === stateFilter)
      && (hopFilter === "all" || factor.hop_distance === Number(hopFilter))),
    [factors, hopFilter, query, stateFilter],
  );
  const graphHeight = Math.max(700, ...[1, 2, 3].map((hop) => filtered.filter((factor) => factor.hop_distance === hop).length * 52 + 100));
  const layout = useMemo(() => layoutHopGraph(filtered, { width: 1200, height: graphHeight }), [filtered, graphHeight]);
  const path = useMemo(() => tracedPath(selected, targetId, relationships), [relationships, selected, targetId]);
  const pathEdges = useMemo(() => new Set(path.slice(0, -1).map((node, index) => `${node}:${path[index + 1]}`)), [path]);
  const visibleIds = useMemo(() => new Set(filtered.map((factor) => factor.id)), [filtered]);
  const names = useMemo(() => new Map([...factors, { id: targetId, label: targetLabel }].map((factor) => [factor.id, factor.label])), [factors, targetId, targetLabel]);
  const orderedIds = ["target", ...filtered.map((factor) => factor.id)];
  const selectedLabel = selected === "target" ? targetLabel : names.get(selected ?? "") ?? selected;

  function select(nodeId: string) { setSelected(nodeId); onSelect?.(nodeId); }
  function navigate(direction: -1 | 1) {
    const current = selected ? Math.max(0, orderedIds.indexOf(selected)) : 0;
    select(orderedIds[(current + direction + orderedIds.length) % orderedIds.length]);
  }
  function onGraphKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); navigate(1); }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); navigate(-1); }
  }
  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragOrigin({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  }
  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (dragOrigin) setPan({ x: event.clientX - dragOrigin.x, y: event.clientY - dragOrigin.y });
  }
  function endPan() { setDragOrigin(null); }
  function startMousePan(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) setDragOrigin({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  }
  function moveMousePan(event: MouseEvent<HTMLDivElement>) {
    if (dragOrigin) setPan({ x: event.clientX - dragOrigin.x, y: event.clientY - dragOrigin.y });
  }
  const targetPoint = { x: 1100, y: Math.round(graphHeight / 2) };
  return <section aria-label="Target-centered dependency graph">
    <label>Search factors<input type="search" aria-label="Search factors" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <label>Filter graph state<select aria-label="Filter graph state" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as "all" | VisibleNodeState)}><option value="all">all</option><option value="active">active</option><option value="proposed">proposed</option><option value="excluded">excluded</option><option value="unsupported">unsupported</option><option value="stale">stale</option></select></label>
    <label>Focus graph hop<select aria-label="Focus graph hop" value={hopFilter} onChange={(event) => setHopFilter(event.target.value as "all" | "1" | "2" | "3")}><option value="all">all hops</option><option value="1">hop 1</option><option value="2">hop 2</option><option value="3">hop 3</option></select></label>
    <button type="button" onClick={() => setZoom((current) => Math.min(2, Number((current + 0.25).toFixed(2))))}>Zoom in</button>
    <button type="button" onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))}>Zoom out</button>
    <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Fit graph to view</button>
    <p id={keyboardHelpId}>{filtered.length} factors shown. Use arrow keys while this graph is focused to select adjacent factors. Textual graph alternative:</p>
    <div className="hop-graph-canvas" role="group" tabIndex={0} aria-label="Visual target-centered graph" aria-describedby={keyboardHelpId} data-zoom={zoom} data-pan={`${pan.x},${pan.y}`} onKeyDown={onGraphKeyDown} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onMouseDown={startMousePan} onMouseMove={moveMousePan} onMouseUp={endPan} style={{ position: "relative", minHeight: graphHeight, overflow: "auto", cursor: dragOrigin ? "grabbing" : "grab" }}>
      <div style={{ position: "relative", width: 1240, minHeight: graphHeight, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "top left" }}>
        <svg aria-hidden="true" width="1240" height={graphHeight} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {relationships.filter((relationship) => relationship.parent_node_id && relationship.child_node_id && visibleIds.has(relationship.parent_node_id) && (visibleIds.has(relationship.child_node_id) || relationship.child_node_id === targetId)).map((relationship) => {
            const from = layout[relationship.parent_node_id ?? ""];
            const to = relationship.child_node_id === targetId ? targetPoint : layout[relationship.child_node_id ?? ""];
            if (!from || !to) return null;
            const highlighted = pathEdges.has(`${relationship.parent_node_id}:${relationship.child_node_id}`);
            return <line key={`${relationship.parent_node_id}:${relationship.child_node_id}`} data-highlighted={highlighted} x1={from.x + 80} y1={from.y + 16} x2={to.x} y2={to.y + 16} stroke={highlighted ? "#facc15" : "#64748b"} strokeWidth={highlighted ? 4 : 2} />;
          })}
        </svg>
        <button type="button" aria-pressed={selected === "target"} onClick={() => select("target")} style={{ position: "absolute", left: targetPoint.x, top: targetPoint.y }}>{targetLabel}</button>
        {filtered.map((factor) => <button key={factor.id} type="button" aria-pressed={selected === factor.id} onClick={() => select(factor.id)} style={{ position: "absolute", left: layout[factor.id]?.x, top: layout[factor.id]?.y, maxWidth: 190 }}>
          {factor.label}
        </button>)}
      </div>
    </div>
    {selected && <p role="status">Selected {selectedLabel}{path.length > 0 && <>. Traced path: {path.map((id) => names.get(id) ?? id).join(" → ")}</>}</p>}
    <ul>{filtered.map((factor) => <li key={factor.id} data-x={layout[factor.id]?.x} data-y={layout[factor.id]?.y}><strong>{factor.label}</strong> — hop {factor.hop_distance}; <span>{factor.state}</span>; {factor.evidence_status}</li>)}</ul>
    <section aria-label="Textual model dependencies"><h2>Textual model dependencies</h2>{relationships.length === 0 ? <p>No model dependencies recorded.</p> : <ul>{relationships.map((relationship, index) => <li key={`${relationship.parent_node_id}-${relationship.child_node_id}-${index}`}>{names.get(relationship.parent_node_id ?? "") ?? "Unknown factor"} → {names.get(relationship.child_node_id ?? "") ?? "Unknown factor"} — {relationship.state ?? "proposed"}; {relationship.evidence_status ?? "fixture_unverified"}</li>)}</ul>}</section>
  </section>;
}
