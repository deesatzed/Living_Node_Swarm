import { useEffect, useState } from "react";
import type { JsonObject } from "../api/types";
import { ScenarioEditor, type ScenarioClient } from "../simulation/ScenarioEditor";

export interface RunModelClient {
  runSimulation(graphId: string): Promise<JsonObject>;
  listSnapshots?(graphId: string, limit?: number): Promise<{ snapshots: JsonObject[] }>;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function number(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "not recorded";
}

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined;
}

export function RunModel({ graphId, client, projectId, scenarioClient, targetNodeId, activeGraphVersion, onReceipt }: { graphId: string; client: RunModelClient; projectId?: string; scenarioClient?: ScenarioClient; targetNodeId?: string; activeGraphVersion?: number; onReceipt?: (result: JsonObject) => Promise<void> }) {
  const [result, setResult] = useState<JsonObject | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<JsonObject[] | null>(null);
  useEffect(() => {
    let active = true;
    if (!client.listSnapshots) return;
    void client.listSnapshots(graphId, 10).then((response) => {
      if (active) setHistory(response.snapshots);
    }).catch(() => { if (active) setHistory(null); });
    return () => { active = false; };
  }, [client, graphId, result]);
  async function run() {
    setRunning(true);
    setError("");
    try { const next = await client.runSimulation(graphId); setResult(next); await onReceipt?.(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Run failed."); }
    finally { setRunning(false); }
  }
  const snapshot = result?.snapshot as JsonObject | undefined;
  const status = result?.sim_status as JsonObject | undefined;
  const predictives = object(snapshot?.node_predictives);
  const stability = object(snapshot?.stability_diagnostic);
  const failed = snapshot?.status === "failed";
  return <section aria-label="Run approved model controls">
    <p>Run uses the approved graph exactly as selected; it does not create, activate, or edit structure.</p>
    <button onClick={run} disabled={running}>{running ? "Running approved version…" : "Run approved version"}</button>
    {projectId && scenarioClient && <ScenarioEditor projectId={projectId} client={scenarioClient} targetNodeId={targetNodeId} activeGraphVersion={activeGraphVersion} />}
    {error && <p role="alert">{error}</p>}
    {snapshot && <section aria-label="Run receipt">
      <h2>Run receipt: {text(snapshot.id, "unknown")}</h2>
      <p>Graph version {text(snapshot.graph_version, "unknown")} · seed {text(snapshot.seed, "unknown")} · {text(snapshot.n_samples, "unknown")} samples · {text(status?.freshness, "unknown")}</p>
      {failed && <><p role="alert">Run {text(snapshot.id, "unknown")} failed: {text(snapshot.error, "No failure reason was recorded.")}</p><p>No successful outcome summary is available from this failed run.</p></>}
      {!failed && predictives && <section aria-label="Run outcome summaries"><h3>Outcome summaries</h3><ul>{Object.entries(predictives).map(([nodeId, raw]) => { const predictive = object(raw); const quantiles = object(predictive?.quantiles); return <li key={nodeId}>{nodeId} · mean {number(predictive?.derived_mean)} · median {number(predictive?.derived_median)} · p05 {number(quantiles?.p05)} · p95 {number(quantiles?.p95)} · standard deviation {number(predictive?.derived_std)}</li>; })}</ul></section>}
      {!failed && stability && <section aria-label="Run stability diagnostic"><h3>Monte Carlo stability diagnostic</h3><p>Method: {text(stability.method, "not recorded")}</p><p>Seeds: {Array.isArray(stability.seeds) ? stability.seeds.map((value) => text(value, "unknown")).join(", ") : "not recorded"} · sample counts: {Array.isArray(stability.sample_counts) ? stability.sample_counts.map((value) => text(value, "unknown")).join(", ") : "not recorded"}</p><ul>{Object.entries(object(stability.node_metric_ranges) ?? {}).map(([nodeId, raw]) => { const ranges = object(raw); return <li key={nodeId}>{nodeId}: mean range {number(ranges?.mean)} · p50 range {number(ranges?.p50)}</li>; })}</ul><p>{text(stability.limitations, "No stability limitations were recorded.")}</p></section>}
    </section>}
    {history && <section aria-label="Prior run receipts"><h2>Prior run receipts</h2>{history.length === 0 ? <p>No persisted run receipts yet.</p> : <ul>{history.map((receipt) => <li key={text(receipt.id, "unknown")}>{text(receipt.id, "unknown")} · graph v{text(receipt.graph_version, "unknown")} · seed {text(receipt.seed, "unknown")} · {text(receipt.n_samples, "unknown")} samples · {text(receipt.status, "unknown")} · finished {text(receipt.finished_at, "not recorded")}</li>)}</ul>}<p>History is read-only and does not rerun or alter the approved graph.</p></section>}
  </section>;
}
