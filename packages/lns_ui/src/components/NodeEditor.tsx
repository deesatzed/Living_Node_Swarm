import { useEffect, useState } from "react";
import type { LnsNode } from "../api/client";

const FAMILY_FIELDS: Record<string, string[]> = {
  Normal: ["mu", "sigma"],
  LogNormal: ["mu", "sigma"],
  Beta: ["a", "b"],
  Deterministic: ["value"],
};

export function NodeEditor({
  node,
  busy,
  onSave,
  onActivate,
  onReject,
  wireTargets,
  onWire,
}: {
  node: LnsNode;
  busy: boolean;
  onSave: (parameters: Record<string, number>, transform: string, transformParams: Record<string, number>) => void;
  onActivate?: () => void;
  onReject?: () => void;
  /** Other nodes this node can be wired into as a parent */
  wireTargets?: LnsNode[];
  onWire?: (childId: string) => void;
}) {
  const fields = FAMILY_FIELDS[node.distribution_family] || Object.keys(node.parameters);
  const [params, setParams] = useState<Record<string, string>>({});
  const [transform, setTransform] = useState(node.transform);
  const [tp, setTp] = useState<Record<string, string>>({});
  const [wireChild, setWireChild] = useState("");

  useEffect(() => {
    const p: Record<string, string> = {};
    for (const f of fields) {
      p[f] = String(node.parameters[f] ?? "");
    }
    setParams(p);
    setTransform(node.transform);
    const t: Record<string, string> = {};
    for (const [k, v] of Object.entries(node.transform_params || {})) {
      t[k] = String(v);
    }
    if (!t.a0 && node.transform === "affine") t.a0 = "0";
    if (!t.a1 && node.transform === "affine") t.a1 = "1";
    setTp(t);
  }, [node.id, node.version, node.distribution_family]);

  const isProposed = node.status === "proposed";
  const isActive = node.status === "active";
  const targets = (wireTargets || []).filter(
    (t) => t.id !== node.id && !t.depends_on.includes(node.id)
  );

  return (
    <div>
      <h2>Edit node</h2>
      <div className="muted">
        {node.name} <code>{node.id}</code>
        {isProposed && (
          <span className="badge stale" style={{ marginLeft: 8 }}>
            proposed — not in MC
          </span>
        )}
      </div>
      {isProposed && (
        <div className="row" style={{ marginTop: 10, marginBottom: 8 }}>
          <button disabled={busy} onClick={onActivate} title="Include in active ensemble and re-simulate">
            Activate → re-sim
          </button>
          <button className="secondary" disabled={busy} onClick={onReject} title="Delete this proposal">
            Reject / delete
          </button>
        </div>
      )}
      {isActive && targets.length > 0 && onWire && (
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <label>
            Wire this node into chain (as parent of…)
            <select value={wireChild} onChange={(e) => setWireChild(e.target.value)}>
              <option value="">Select downstream node…</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy || !wireChild}
            onClick={() => wireChild && onWire(wireChild)}
            title="Add this node to the child's depends_on and re-simulate"
          >
            Wire into selected → re-sim
          </button>
          <p className="muted" style={{ marginTop: 6 }}>
            Makes downstream nodes feel this factor (e.g. wire capacity → process_stage).
          </p>
        </div>
      )}
      {fields.map((f) => (
        <label key={f}>
          {f}
          <input
            value={params[f] ?? ""}
            onChange={(e) => setParams({ ...params, [f]: e.target.value })}
          />
        </label>
      ))}
      {node.depends_on.length > 0 && (
        <>
          <label>
            transform (composition of parents)
            <select value={transform} onChange={(e) => setTransform(e.target.value)}>
              <option value="affine">affine</option>
              <option value="sum_parents">sum_parents</option>
              <option value="mean_parents">mean_parents</option>
            </select>
          </label>
          {transform === "affine" && (
            <>
              <label>
                a0 (intercept)
                <input value={tp.a0 ?? "0"} onChange={(e) => setTp({ ...tp, a0: e.target.value })} />
              </label>
              <label>
                a1 (weight on first parent)
                <input value={tp.a1 ?? "1"} onChange={(e) => setTp({ ...tp, a1: e.target.value })} />
              </label>
            </>
          )}
        </>
      )}
      <button
        disabled={busy}
        onClick={() => {
          const parameters: Record<string, number> = {};
          for (const f of fields) {
            parameters[f] = Number(params[f]);
          }
          const transform_params: Record<string, number> = {};
          for (const [k, v] of Object.entries(tp)) {
            if (v !== "") transform_params[k] = Number(v);
          }
          onSave(parameters, transform, transform_params);
        }}
      >
        {busy ? "Saving…" : "Save & re-simulate"}
      </button>
      {node.discovery_rationale && (
        <p className="muted" style={{ marginTop: 12 }}>
          Rationale: {node.discovery_rationale}
        </p>
      )}
    </div>
  );
}
