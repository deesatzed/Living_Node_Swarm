import { useMemo, useState } from "react";
import { api, type Graph, type Node, type Snapshot } from "./api";

function histogram(samples: number[], bins = 22): number[] {
  if (!samples?.length) return Array(bins).fill(0);
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = max - min || 1;
  const counts = Array(bins).fill(0);
  for (const s of samples) {
    let i = Math.floor(((s - min) / span) * bins);
    if (i >= bins) i = bins - 1;
    if (i < 0) i = 0;
    counts[i] += 1;
  }
  return counts;
}

export default function App() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticker, setTicker] = useState("");
  const [threshold, setThreshold] = useState("4.12");
  const [midFallback, setMidFallback] = useState("0.51");
  const [hint, setHint] = useState(
    "Add multi-hop latent drivers: crude, inventories, crack spread, seasonal demand, hurricane risk."
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState("");
  const [freshness, setFreshness] = useState("stale");
  const [paramEdit, setParamEdit] = useState<Record<string, string>>({});

  const nodes = useMemo(() => (graph ? Object.values(graph.nodes) : []), [graph]);
  const selected = selectedId && graph ? graph.nodes[selectedId] : null;
  const predictive =
    selectedId && snapshot ? snapshot.node_predictives[selectedId] : null;
  const modelPred = snapshot?.node_predictives["model_price_index"];
  const marketMid = graph?.nodes["market_implied_yes"]?.parameters?.value;

  const counts = predictive ? histogram(predictive.samples) : [];
  const maxC = Math.max(1, ...counts);

  function applyState(g: Graph, snap: Snapshot | null, fresh = "fresh") {
    setGraph(g);
    setSnapshot(snap);
    setFreshness(fresh);
    if (!selectedId || !g.nodes[selectedId]) {
      setSelectedId(g.nodes["model_price_index"] ? "model_price_index" : Object.keys(g.nodes)[0]);
    }
  }

  async function bootstrap(expandAi: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.bootstrap({
        ticker: ticker || undefined,
        threshold_usd: Number(threshold),
        market_yes_mid: ticker ? null : Number(midFallback),
        expand_ai: expandAi,
        auto_activate_ai: false,
        hint,
      });
      applyState(res.graph, res.snapshot, "fresh");
      setLog(JSON.stringify({ quote: res.quote, expand: res.expand, exit: res.exit_rule }, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function expandMore() {
    if (!graph) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.expand(graph.id, {
        hint,
        auto_activate: false,
        auto_wire: true,
      });
      applyState(res.graph, res.snapshot, res.sim_status?.freshness || "fresh");
      setLog(
        `Added ${res.added_nodes?.length || 0} AI nodes (proposed).\n` +
          JSON.stringify({ added: res.added_nodes, errors: res.errors }, null, 2)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <h1>⛽ LNS Gas Demo</h1>
          <div className="sub">
            Living Node Swarm · US retail gas vs Kalshi threshold · AI dynamic factors · 20% mid exit
          </div>
          <div className="pill-row">
            <span className="pill">Project Kalshi ~$10</span>
            <span className="pill">Exit: |Δmid|/entry ≥ 20%</span>
            <span className="pill">AI nodes start as proposed</span>
          </div>
        </div>
        <div className="row">
          <span className={`badge ${freshness}`}>{freshness}</span>
          {marketMid != null && (
            <span className="pill">YES mid baseline: {(Number(marketMid) * 100).toFixed(1)}¢</span>
          )}
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="grid">
        <div className="card">
          <h2>1 · Market & bootstrap</h2>
          <label>
            Kalshi ticker (paste from contract URL)
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g. GAS-… or AAAGAS… threshold market"
            />
          </label>
          <div className="row" style={{ marginTop: 8 }}>
            <label style={{ flex: 1 }}>
              Strike $/gal
              <input value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              Mid fallback (0–1)
              <input value={midFallback} onChange={(e) => setMidFallback(e.target.value)} />
            </label>
          </div>
          <label>
            AI expand hint
            <textarea rows={2} value={hint} onChange={(e) => setHint(e.target.value)} />
          </label>
          <div className="row">
            <button className="primary" disabled={busy} onClick={() => bootstrap(true)}>
              Bootstrap + AI factors
            </button>
            <button disabled={busy} onClick={() => bootstrap(false)}>
              Graph only (no AI)
            </button>
            <button disabled={busy || !graph} onClick={expandMore}>
              AI expand more
            </button>
            <button
              disabled={busy || !graph}
              onClick={async () => {
                if (!graph) return;
                setBusy(true);
                try {
                  const res = await api.activateAll(graph.id);
                  applyState(res.graph, res.snapshot, "fresh");
                  setLog(`Activated: ${res.activated.join(", ")}`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Activate all proposed + wire
            </button>
          </div>

          <h2 style={{ marginTop: 18 }}>Living graph (dynamic nodes)</h2>
          <div className="canvas">
            {graph && (
              <svg className="edges">
                {nodes.flatMap((n) =>
                  n.depends_on.map((p, i) => {
                    const a = graph.layout[p] || { x: 40, y: 40 };
                    const b = graph.layout[n.id] || { x: 200, y: 40 };
                    return (
                      <line
                        key={`${p}-${n.id}-${i}`}
                        x1={a.x + 70}
                        y1={a.y + 28}
                        x2={b.x + 10}
                        y2={b.y + 28}
                        stroke="#6a5530"
                        strokeWidth={2}
                      />
                    );
                  })
                )}
              </svg>
            )}
            {nodes.map((n) => {
              const pos = graph?.layout[n.id] || { x: 40, y: 40 };
              return (
                <div
                  key={n.id}
                  className={`node ${selectedId === n.id ? "selected" : ""} ${
                    n.status === "proposed" ? "proposed" : ""
                  }`}
                  style={{ left: pos.x, top: pos.y }}
                  onClick={() => {
                    setSelectedId(n.id);
                    const pe: Record<string, string> = {};
                    for (const [k, v] of Object.entries(n.parameters || {})) pe[k] = String(v);
                    setParamEdit(pe);
                  }}
                >
                  <div className="nid">{n.id}</div>
                  <div className="nname">{n.name}</div>
                  <div className="nmeta">
                    {n.distribution_family} · {n.status}
                    {n.tags?.includes("ai-dynamic") ? " · AI" : ""}
                  </div>
                </div>
              );
            })}
            {!graph && <p className="muted" style={{ padding: 16 }}>Bootstrap a graph to begin.</p>}
          </div>
        </div>

        <div className="card">
          <h2>2 · Node detail & distribution</h2>
          {selected ? (
            <>
              <div className="row">
                <strong>{selected.name}</strong>
                <span className={`badge ${selected.status === "proposed" ? "proposed" : "fresh"}`}>
                  {selected.status}
                </span>
              </div>
              <p className="muted">{selected.description}</p>
              {selected.discovery_rationale && (
                <p className="muted">
                  <em>AI rationale:</em> {selected.discovery_rationale}
                </p>
              )}
              {Object.keys(paramEdit).map((k) => (
                <label key={k}>
                  {k}
                  <input
                    value={paramEdit[k] ?? ""}
                    onChange={(e) => setParamEdit({ ...paramEdit, [k]: e.target.value })}
                  />
                </label>
              ))}
              <div className="row">
                <button
                  disabled={busy || !graph}
                  onClick={async () => {
                    if (!graph || !selected) return;
                    setBusy(true);
                    try {
                      const parameters: Record<string, number> = {};
                      for (const [k, v] of Object.entries(paramEdit)) parameters[k] = Number(v);
                      const res = await api.patchNode(graph.id, selected.id, parameters);
                      applyState(res.graph, res.snapshot, res.sim_status?.freshness || "fresh");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save & re-sim
                </button>
                {selected.status === "proposed" && (
                  <>
                    <button
                      className="primary"
                      disabled={busy || !graph}
                      onClick={async () => {
                        if (!graph) return;
                        setBusy(true);
                        try {
                          const res = await api.activateOne(graph.id, selected.id);
                          applyState(res.graph, res.snapshot, "fresh");
                        } catch (e) {
                          setError(e instanceof Error ? e.message : String(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Activate
                    </button>
                    <button
                      className="danger"
                      disabled={busy || !graph}
                      onClick={async () => {
                        if (!graph) return;
                        setBusy(true);
                        try {
                          const res = await api.rejectOne(graph.id, selected.id);
                          setGraph(res.graph);
                          setSelectedId("model_price_index");
                        } catch (e) {
                          setError(e instanceof Error ? e.message : String(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
              {predictive ? (
                <>
                  <div className="quantiles">
                    <div className="qbox">
                      <div className="k">p05</div>
                      <div className="v">{predictive.quantiles.p05?.toFixed(3)}</div>
                    </div>
                    <div className="qbox">
                      <div className="k">p50</div>
                      <div className="v">{predictive.quantiles.p50?.toFixed(3)}</div>
                    </div>
                    <div className="qbox">
                      <div className="k">p95</div>
                      <div className="v">{predictive.quantiles.p95?.toFixed(3)}</div>
                    </div>
                  </div>
                  <div className="hist">
                    {counts.map((c, i) => (
                      <div key={i} className="bar" style={{ height: `${(c / maxC) * 100}%` }} />
                    ))}
                  </div>
                  <p className="muted">
                    mean={predictive.derived_mean?.toFixed(3)} · n={predictive.n_samples}
                  </p>
                </>
              ) : (
                <p className="muted">No predictive (proposed nodes excluded from MC until activated).</p>
              )}
            </>
          ) : (
            <p className="muted">Select a node.</p>
          )}

          {modelPred && (
            <>
              <h2 style={{ marginTop: 16 }}>Model gas level (ensemble)</h2>
              <div className="quantiles">
                <div className="qbox">
                  <div className="k">p05</div>
                  <div className="v">{modelPred.quantiles.p05?.toFixed(3)}</div>
                </div>
                <div className="qbox">
                  <div className="k">p50</div>
                  <div className="v">{modelPred.quantiles.p50?.toFixed(3)}</div>
                </div>
                <div className="qbox">
                  <div className="k">p95</div>
                  <div className="v">{modelPred.quantiles.p95?.toFixed(3)}</div>
                </div>
              </div>
            </>
          )}

          <h2 style={{ marginTop: 16 }}>3 · Kalshi micro-stakes</h2>
          <p className="muted">Preview always first. Live uses project ~$10 account (caps $3 / 3 contracts).</p>
          <div className="row">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setLog(JSON.stringify(await api.balance(), null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Balance
            </button>
            <button
              disabled={busy || !ticker || !graph}
              onClick={async () => {
                if (!graph) return;
                setBusy(true);
                try {
                  const r = await api.refreshMid(graph.id, ticker);
                  applyState(r.graph, r.snapshot, "fresh");
                  setLog("Mid refresh:\n" + JSON.stringify(r.quote, null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Refresh mid
            </button>
            <button
              disabled={busy || !ticker}
              onClick={async () => {
                setBusy(true);
                try {
                  setLog(
                    "PREVIEW:\n" +
                      JSON.stringify(
                        await api.order({
                          ticker,
                          action: "buy",
                          side: "yes",
                          contracts: 1,
                          confirm: false,
                          graph_id: graph?.id,
                        }),
                        null,
                        2
                      )
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Preview BUY
            </button>
            <button
              className="primary"
              disabled={busy || !ticker}
              onClick={async () => {
                if (!window.confirm(`LIVE BUY 1 YES on ${ticker}?`)) return;
                setBusy(true);
                try {
                  setLog(
                    "BUY:\n" +
                      JSON.stringify(
                        await api.order({
                          ticker,
                          action: "buy",
                          side: "yes",
                          contracts: 1,
                          confirm: true,
                          graph_id: graph?.id,
                        }),
                        null,
                        2
                      )
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm BUY
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setLog("AUTO-SELL DRY:\n" + JSON.stringify(await api.autoSell(false), null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              20% exits dry
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm("LIVE auto-sell any 20% mid movers?")) return;
                setBusy(true);
                try {
                  setLog("AUTO-SELL LIVE:\n" + JSON.stringify(await api.autoSell(true), null, 2));
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Auto-SELL 20%
            </button>
          </div>
          {log && <pre className="log">{log}</pre>}
        </div>
      </div>
    </div>
  );
}
