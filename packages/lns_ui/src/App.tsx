import { useCallback, useEffect, useMemo, useState } from "react";
import { WORKFLOW_STAGES, WorkspaceShell } from "@lns/ui-shared";
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
  const [gasTicker, setGasTicker] = useState("");
  const [gasThreshold, setGasThreshold] = useState("4.12");
  const [gasMid, setGasMid] = useState("0.51");
  const [journalLog, setJournalLog] = useState<string>("");
  const lifecycleSummary = WORKFLOW_STAGES.map((stage) => stage.label).join(" → ");

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

  async function wireSelected(childId: string) {
    if (!graph || !selectedId) return;
    setBusy(true);
    setError(null);
    setStatus((s) => (s ? { ...s, freshness: "updating", job_running: true } : s));
    try {
      const res = await api.wireNode(graph.id, selectedId, childId, 1.0);
      setGraph(res.graph);
      setSnapshot(res.snapshot);
      setStatus(res.sim_status);
      setSelectedId(childId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus((s) => (s ? { ...s, freshness: "failed", job_running: false } : s));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell
      projectName={graph?.name || "New prediction project"}
      target="Outcome target (legacy seed until a resolution-grade target is saved)"
      horizon="Not yet specified"
      graphVersion={graph?.graph_version || 1}
      freshness={status?.freshness === "stale" ? "stale" : "active"}
      evidenceClassification="fixture_unverified"
    >
    <div className="app">
      <header>
        <div>
          <h1>Living Node Swarm</h1>
          <div className="meta">{health || "Connecting…"}</div>
          <div className="meta">Shared workspace lifecycle: {lifecycleSummary}</div>
        </div>
        <div className="row">
          {status && <FreshnessBadge freshness={status.freshness} />}
          <button className="secondary" disabled={busy} onClick={loadNew}>
            New toy seed
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

          <h2 style={{ marginTop: 18 }}>US gas (Kalshi) + 20% sell rule</h2>
          <p className="muted">
            Threshold markets (e.g. Above 4.120). Exit journal signal when YES mid moves ≥20% from
            entry: |mid_now − entry| / entry ≥ 0.20. Journal does not auto-place orders — place on
            Kalshi, then journal; check-all flags sells.
          </p>
          <label>
            Kalshi market ticker (from Kalshi URL)
            <input
              placeholder="paste exact ticker e.g. GAS-… or AAAGAS…"
              value={gasTicker}
              onChange={(e) => setGasTicker(e.target.value)}
            />
          </label>
          <label>
            Strike threshold $/gal (if not from ticker)
            <input value={gasThreshold} onChange={(e) => setGasThreshold(e.target.value)} />
          </label>
          <label>
            YES mid fallback if no ticker (0–1)
            <input value={gasMid} onChange={(e) => setGasMid(e.target.value)} />
          </label>
          <div className="row">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const res = await api.createGasGraph({
                    ticker: gasTicker || undefined,
                    threshold_usd: Number(gasThreshold),
                    market_yes_mid: gasTicker ? null : Number(gasMid),
                    name: "us-gas-kalshi",
                    title: "US gas prices",
                  });
                  setGraph(res.graph);
                  setSnapshot(res.snapshot);
                  setStatus({
                    graph_id: res.graph.id,
                    freshness: "fresh",
                    graph_version: res.graph.graph_version,
                    last_snapshot_id: res.snapshot?.id ?? null,
                    last_error: null,
                    job_running: false,
                  });
                  setSelectedId("market_implied_yes");
                  setJournalLog(
                    `Gas graph ready. mid=${res.kalshi.yes_mid} strike=${res.kalshi.threshold_usd}\n` +
                      res.exit_rule.description
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Load gas graph
            </button>
            <button
              disabled={busy || !graph || !gasTicker}
              onClick={async () => {
                if (!graph || !gasTicker) return;
                setBusy(true);
                setError(null);
                try {
                  const res = await api.refreshKalshiMid(graph.id, gasTicker);
                  setGraph(res.graph);
                  setSnapshot(res.snapshot);
                  setStatus(res.sim_status);
                  setJournalLog(`Refreshed mid: ${JSON.stringify(res.quote.yes_mid)}`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Refresh Kalshi mid
            </button>
          </div>
          <div className="row">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const res = await api.kalshiBalance();
                  setJournalLog(JSON.stringify(res, null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Kalshi balance
            </button>
            <button
              disabled={busy || !gasTicker}
              onClick={async () => {
                if (!gasTicker) return;
                setBusy(true);
                setError(null);
                try {
                  const prev = await api.kalshiOrder({
                    ticker: gasTicker,
                    action: "buy",
                    side: "yes",
                    contracts: 1,
                    confirm: false,
                    journal: true,
                    graph_id: graph?.id,
                  });
                  setJournalLog("PREVIEW (not executed):\n" + JSON.stringify(prev, null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Preview BUY 1 YES
            </button>
            <button
              disabled={busy || !gasTicker}
              onClick={async () => {
                if (!gasTicker) return;
                if (
                  !window.confirm(
                    `Place REAL order: BUY 1 YES on ${gasTicker}? Uses project Kalshi balance (~$10). Cap ~$3/order.`
                  )
                ) {
                  return;
                }
                setBusy(true);
                setError(null);
                try {
                  const res = await api.kalshiOrder({
                    ticker: gasTicker,
                    action: "buy",
                    side: "yes",
                    contracts: 1,
                    confirm: true,
                    journal: true,
                    graph_id: graph?.id,
                    notes: "live buy; auto-exit rule 20% mid move",
                  });
                  setJournalLog("EXECUTED BUY:\n" + JSON.stringify(res, null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm BUY 1 YES (live)
            </button>
          </div>
          <div className="row">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const dry = await api.kalshiAutoSell20(false);
                  setJournalLog("AUTO-SELL DRY RUN:\n" + JSON.stringify(dry, null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Check 20% exits (dry)
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Sell on Kalshi any open journal positions that hit 20% YES mid move?"
                  )
                ) {
                  return;
                }
                setBusy(true);
                setError(null);
                try {
                  const res = await api.kalshiAutoSell20(true);
                  setJournalLog("AUTO-SELL EXECUTE:\n" + JSON.stringify(res, null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Auto-SELL 20% hits (live)
            </button>
          </div>
          {journalLog && <pre className="raw">{journalLog}</pre>}

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
              wireTargets={graph ? Object.values(graph.nodes) : []}
              onWire={wireSelected}
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
    </WorkspaceShell>
  );
}
