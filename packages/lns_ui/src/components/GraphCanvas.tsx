import type { Graph, LnsNode } from "../api/client";

export function GraphCanvas({
  graph,
  selectedId,
  onSelect,
}: {
  graph: Graph;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes = Object.values(graph.nodes);
  const edges: Array<{ from: string; to: string }> = [];
  for (const n of nodes) {
    for (const p of n.depends_on) {
      edges.push({ from: p, to: n.id });
    }
  }

  const pos = (n: LnsNode) => {
    const l = graph.layout[n.id];
    return { x: l?.x ?? 40, y: l?.y ?? 40 };
  };

  return (
    <div className="canvas">
      <svg className="edges">
        {edges.map((e, i) => {
          const a = graph.nodes[e.from];
          const b = graph.nodes[e.to];
          if (!a || !b) return null;
          const pa = pos(a);
          const pb = pos(b);
          const x1 = pa.x + 60;
          const y1 = pa.y + 28;
          const x2 = pb.x + 10;
          const y2 = pb.y + 28;
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4a668f" strokeWidth={2} />
              <polygon
                points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`}
                fill="#4a668f"
              />
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => {
        const p = pos(n);
        return (
          <div
            key={n.id}
            className={`node ${selectedId === n.id ? "selected" : ""} ${
              n.status === "proposed" ? "proposed" : ""
            }`}
            style={{ left: p.x, top: p.y }}
            onClick={() => onSelect(n.id)}
          >
            <div className="nid">{n.id}</div>
            <div className="nname">{n.name}</div>
            <div className="nmeta">
              {n.distribution_family} · v{n.version} · {n.status}
            </div>
          </div>
        );
      })}
    </div>
  );
}
