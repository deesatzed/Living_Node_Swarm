import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Graph, type Snapshot, type SimStatus } from "./api/client";
import { DistributionPanel } from "./components/DistributionPanel";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { GraphCanvas } from "./components/GraphCanvas";
import { NodeEditor } from "./components/NodeEditor";

export default function App() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<SimStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>("outcome");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState(() => localStorage.getItem("lns_openrouter_model") || "");
  const [modelOptions, setModelOptions] = useState<Array<{ role: string; id: string }>>([]);
  const [hint, setHint] = useState("Propose one useful intermediate factor for this graph.");
  const [experiment, setExperiment] = useState<string>("");
  const [health, setHealth] = useState<string>("");

  const loadNew = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const h = await api.health();
      setModelOptions(h.models || []);
      const stored = localStorage.getItem("lns_openrouter_model");
      if (stored) {
        setModel(stored);
      } else if (h.default_model) {
        setModel(h.default_model);
      }
      const modelList =
        (h.models || []).map((m) => `${m.role}=${m.id}`).join(", ") || "none in .env";
      setHealth(
        `API ok · key ${h.openrouter_key_configured ? "set" : "MISSING"} · default ${
          h.default_model || "none"
        } · slots: ${modelList}`
      );
      const created = await api.createSeed();
      setGraph(created.graph);
      setSnapshot(created.snapshot);
      setStatus({
        graph_id: created.graph.id,
        freshness: "fresh",
        graph_version: created.graph.graph_version,
        last_snapshot_id: created.snapshot?.id ?? null,
        last_error: null,
        job_running: false,
      });
      setSelectedId("outcome");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadNew();
  }, [loadNew]);

  const selected = useMemo(() => {
    if (!graph || !selectedId) return null;
    return graph.nodes[selectedId] ?? null;
  }, [graph, selectedId]);

  const predictive = useMemo(() => {
    if (!snapshot || !selectedId) return null;
    return snapshot.node_predictives[selectedId] ?? null;
  }, [snapshot, selectedId]);

  async function onSave(
    parameters: Record<string, number>,
    transform: string,
    transform_params: Record<string, number>
  ) {
    if (!graph || !selectedId) return;
    setBusy(true);
    setError(null);
    setStatus((s) => (s ? { ...s, freshness: "updating", job_running: true } : s));
    try {
      const res = await api.patchNode(graph.id, selectedId, {
        parameters,
        transform: graph.nodes[selectedId].depends_on.length ? transform : undefined,
        transform_params: graph.nodes[selectedId].depends_on.length ? transform_params : undefined,
        run_sim: true,
      });
      setGraph(res.graph);
      setSnapshot(res.snapshot);
      setStatus(res.sim_status);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus((s) => (s ? { ...s, freshness: "failed", job_running: false } : s));
    } finally {
      setBusy(false);
    }
  }

  async function runExperiment() {
    if (!graph || !selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.transformExperiment(graph.id, selectedId);
      setExperiment(
        `recommendation=${res.recommendation}\n${res.note}\n\n` +
          res.results
            .map(
              (r) =>
                `${r.transform}: mean=${Number(r.derived_mean).toFixed(4)} std=${Number(
                  r.derived_std
                ).toFixed(4)} q50=${JSON.stringify((r.quantiles as { p50?: number })?.p50)}`
            )
            .join("\n")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function propose() {
    if (!graph) return;
    localStorage.setItem("lns_openrouter_model", model);
    setBusy(true);
    setError(null);
    try {
      const res = await api.proposeNode(graph.id, model, hint);
      setGraph(res.graph);
      setSelectedId(res.node.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function activateSelected() {
    if (!graph || !selectedId) return;
    setBusy(true);
    setError(null);
    setStatus((s) => (s ? { ...s, freshness: "updating", job_running: true } : s));
    try {
      const res = await api.activateNode(graph.id, selectedId);
      setGraph(res.graph);
      setSnapshot(res.snapshot);
      setStatus(res.sim_status);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus((s) => (s ? { ...s, freshness: "failed", job_running: false } : s));
    } finally {
      setBusy(false);
    }
  }

  async function rejectSelected() {
    if (!graph || !selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.rejectNode(graph.id, selectedId);
      setGraph(res.graph);
      setSnapshot(res.snapshot);
      setStatus(res.sim_status);
      setSelectedId("outcome");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>Living Node Swarm</h1>
          <div className="meta">{health || "Connecting…"}</div>
        </div>
        <div className="row">
          {status && <FreshnessBadge freshness={status.freshness} />}
          <button className="secondary" disabled={busy} onClick={loadNew}>
            New seed graph
          </button>
        </div>
      </header>

      {error && (
        <div style={{ padding: "8px 18px" }} className="error">
          {error}
        </div>
      )}

      <div className="layout">
        <div className="panel">
          <h2>Graph</h2>
          {graph ? (
            <GraphCanvas graph={graph} selectedId={selectedId} onSelect={setSelectedId} />
          ) : (
            <p className="muted">Loading graph…</p>
          )}
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button disabled={busy || !selected?.depends_on?.length} onClick={runExperiment}>
              Compare transforms (selected)
            </button>
          </div>
          {experiment && <pre className="raw">{experiment}</pre>}

          <h2 style={{ marginTop: 18 }}>OpenRouter — propose node</h2>
          <p className="muted">
            You choose the model id. Set <code>OPENROUTER_API_KEY</code> in the server env. Optional{" "}
            <code>OPENROUTER_MODEL</code>, or enter model below.
          </p>
          {modelOptions.length > 0 && (
            <label>
              Model from .env
              <select
                value={modelOptions.some((m) => m.id === model) ? model : ""}
                onChange={(e) => {
                  setModel(e.target.value);
                  localStorage.setItem("lns_openrouter_model", e.target.value);
                }}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {modelOptions.map((m) => (
                  <option key={`${m.role}-${m.id}`} value={m.id}>
                    {m.role}: {m.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            OpenRouter model id (override)
            <input
              placeholder="paste any openrouter model id"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          <label>
            Hint
            <textarea rows={2} value={hint} onChange={(e) => setHint(e.target.value)} />
          </label>
          <button disabled={busy || !graph} onClick={propose}>
            Propose node (status=proposed, not in active MC)
          </button>
        </div>

        <div className="panel">
          {selected ? (
            <NodeEditor
              node={selected}
              busy={busy}
              onSave={onSave}
              onActivate={activateSelected}
              onReject={rejectSelected}
            />
          ) : (
            <p className="muted">Select a node to edit parameters.</p>
          )}
          <div style={{ marginTop: 20 }}>
            <DistributionPanel
              predictive={predictive}
              freshness={status?.freshness || "stale"}
              nodeLabel={selected ? `${selected.name} (${selected.id})` : ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
