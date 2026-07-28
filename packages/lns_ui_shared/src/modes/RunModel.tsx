import { useState } from "react";
import type { JsonObject } from "../api/types";
import { ScenarioEditor, type ScenarioClient } from "../simulation/ScenarioEditor";

export interface RunModelClient {
  runSimulation(graphId: string): Promise<JsonObject>;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

export function RunModel({ graphId, client, projectId, scenarioClient, onReceipt }: { graphId: string; client: RunModelClient; projectId?: string; scenarioClient?: ScenarioClient; onReceipt?: (result: JsonObject) => Promise<void> }) {
  const [result, setResult] = useState<JsonObject | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  async function run() {
    setRunning(true);
    setError("");
    try { const next = await client.runSimulation(graphId); setResult(next); await onReceipt?.(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Run failed."); }
    finally { setRunning(false); }
  }
  const snapshot = result?.snapshot as JsonObject | undefined;
  const status = result?.sim_status as JsonObject | undefined;
  return <section aria-label="Run approved model controls">
    <p>Run uses the approved graph exactly as selected; it does not create, activate, or edit structure.</p>
    <button onClick={run} disabled={running}>{running ? "Running approved version…" : "Run approved version"}</button>
    {projectId && scenarioClient && <ScenarioEditor projectId={projectId} client={scenarioClient} />}
    {error && <p role="alert">{error}</p>}
    {snapshot && <section aria-label="Run receipt">
      <h2>Run receipt: {text(snapshot.id, "unknown")}</h2>
      <p>Graph version {text(snapshot.graph_version, "unknown")} · seed {text(snapshot.seed, "unknown")} · {text(snapshot.n_samples, "unknown")} samples · {text(status?.freshness, "unknown")}</p>
    </section>}
  </section>;
}
