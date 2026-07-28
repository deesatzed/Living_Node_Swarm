import { useEffect, useState } from "react";
import type { JsonObject, WeightedEnsembleMemberInput } from "../api/types";
import { ScenarioEditor, type ScenarioClient } from "../simulation/ScenarioEditor";

export interface RunModelClient {
  runSimulation(graphId: string): Promise<JsonObject>;
  runLocalSensitivity?(graphId: string, body: { target_node_id: string; perturbation_fraction: number }): Promise<JsonObject>;
  runWeightedEnsemble?(members: WeightedEnsembleMemberInput[]): Promise<JsonObject>;
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
  const [sensitivityFraction, setSensitivityFraction] = useState("0.05");
  const [sensitivity, setSensitivity] = useState<JsonObject | null>(null);
  const [currentWeight, setCurrentWeight] = useState("1");
  const [alternativeGraphId, setAlternativeGraphId] = useState("");
  const [alternativeGraphVersion, setAlternativeGraphVersion] = useState("");
  const [alternativeTargetId, setAlternativeTargetId] = useState("");
  const [alternativeWeight, setAlternativeWeight] = useState("1");
  const [mixture, setMixture] = useState<JsonObject | null>(null);
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
  async function runSensitivity() {
    const fraction = Number(sensitivityFraction);
    if (!targetNodeId || !client.runLocalSensitivity || !Number.isFinite(fraction) || fraction <= 0 || fraction > 1) { setError("Enter a local sensitivity fraction greater than 0 and no more than 1."); return; }
    try { setError(""); setSensitivity(await client.runLocalSensitivity(graphId, { target_node_id: targetNodeId, perturbation_fraction: fraction })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to run local sensitivity analysis."); }
  }
  async function runMixture() {
    const primaryWeight = Number(currentWeight); const secondaryWeight = Number(alternativeWeight); const secondaryVersion = Number(alternativeGraphVersion);
    if (!client.runWeightedEnsemble || !targetNodeId || !activeGraphVersion || !alternativeGraphId.trim() || !alternativeTargetId.trim() || !Number.isInteger(secondaryVersion) || secondaryVersion < 1 || !Number.isFinite(primaryWeight) || primaryWeight < 0 || !Number.isFinite(secondaryWeight) || secondaryWeight < 0 || primaryWeight + secondaryWeight <= 0) { setError("Provide two graph versions, target node IDs, and finite non-negative weights with a positive total."); return; }
    try { setError(""); setMixture(await client.runWeightedEnsemble([{ graph_id: graphId, graph_version: activeGraphVersion, target_node_id: targetNodeId, weight: primaryWeight }, { graph_id: alternativeGraphId.trim(), graph_version: secondaryVersion, target_node_id: alternativeTargetId.trim(), weight: secondaryWeight }])); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to compare weighted model mixture."); }
  }
  const snapshot = result?.snapshot as JsonObject | undefined;
  const status = result?.sim_status as JsonObject | undefined;
  const predictives = object(snapshot?.node_predictives);
  const stability = object(snapshot?.stability_diagnostic);
  const failed = snapshot?.status === "failed";
  const mixtureSummary = mixture ? object(mixture.mixture) : undefined;
  const mixtureMembers = mixture && Array.isArray(mixture.members) ? mixture.members.map(object).filter((member): member is JsonObject => Boolean(member)) : [];
  return <section aria-label="Run approved model controls">
    <p>Run uses the approved graph exactly as selected; it does not create, activate, or edit structure.</p>
    <button onClick={run} disabled={running}>{running ? "Running approved version…" : "Run approved version"}</button>
    {targetNodeId && client.runLocalSensitivity && <section aria-label="Local sensitivity analysis"><h2>Local sensitivity analysis</h2><p>Independently increases each nonzero active parameter by the stated fraction in memory.</p><label>Local sensitivity fraction<input aria-label="Local sensitivity fraction" type="number" min="0" max="1" step="0.01" value={sensitivityFraction} onChange={(event) => setSensitivityFraction(event.target.value)} /></label><button onClick={runSensitivity}>Run local sensitivity</button>{sensitivity && <><p>Method: {text(sensitivity.method, "not recorded")}</p><ul>{Array.isArray(sensitivity.rows) ? sensitivity.rows.map((raw) => { const row = object(raw); return <li key={`${text(row?.node_id, "unknown")}.${text(row?.parameter, "unknown")}`}>{text(row?.node_id, "unknown")}.{text(row?.parameter, "unknown")}: mean delta {number(row?.delta_mean)} · median delta {number(row?.delta_p50)}</li>; }) : <li>No sensitivity rows returned.</li>}</ul>{Array.isArray(sensitivity.limitations) && <ul aria-label="Sensitivity limitations">{sensitivity.limitations.map((item) => <li key={text(item, "unknown")}>{text(item, "unknown")}</li>)}</ul>}<p>Active graph unchanged: {sensitivity.active_graph_mutated === false ? "yes" : "not confirmed"}.</p></>}</section>}
    {targetNodeId && activeGraphVersion && client.runWeightedEnsemble && <section aria-label="Weighted model mixture">
      <h2>Weighted model mixture</h2><p>Compare two explicit approved model versions as a backend-sampled distribution mixture. This is not a recommendation or approval.</p>
      <label>Current model weight<input aria-label="Current model weight" type="number" min="0" value={currentWeight} onChange={(event) => setCurrentWeight(event.target.value)} /></label>
      <label>Alternative graph ID<input aria-label="Alternative graph ID" value={alternativeGraphId} onChange={(event) => setAlternativeGraphId(event.target.value)} /></label>
      <label>Alternative graph version<input aria-label="Alternative graph version" type="number" min="1" value={alternativeGraphVersion} onChange={(event) => setAlternativeGraphVersion(event.target.value)} /></label>
      <label>Alternative target node ID<input aria-label="Alternative target node ID" value={alternativeTargetId} onChange={(event) => setAlternativeTargetId(event.target.value)} /></label>
      <label>Alternative model weight<input aria-label="Alternative model weight" type="number" min="0" value={alternativeWeight} onChange={(event) => setAlternativeWeight(event.target.value)} /></label>
      <button onClick={runMixture}>Compare weighted model mixture</button>
      {mixture && <section aria-label="Weighted mixture receipt">
        <h3>Weighted mixture receipt</h3><p>Mixture mean: {number(mixtureSummary?.derived_mean)} · median: {number(mixtureSummary?.derived_median)}</p>
        <ul>{mixtureMembers.map((member) => <li key={text(member.member_id, "unknown")}>{text(member.member_id, "unknown")} · normalized weight {number(member.normalized_weight)}</li>)}</ul>
        {Array.isArray(mixture.limitations) && <ul aria-label="Weighted mixture limitations">{mixture.limitations.map((item) => <li key={text(item, "unknown")}>{text(item, "unknown")}</li>)}</ul>}
        <p>Active graphs unchanged: {mixture.active_graph_mutated === false ? "yes" : "not confirmed"}.</p>
      </section>}
    </section>}
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
