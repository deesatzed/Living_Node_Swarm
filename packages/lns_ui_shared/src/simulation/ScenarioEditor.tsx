import { useEffect, useState } from "react";
import type { JsonObject, WorkspaceScenarioInput } from "../api/types";

export interface ScenarioClient {
  createScenario(projectId: string, scenario: WorkspaceScenarioInput): Promise<JsonObject>;
  listScenarios(projectId: string): Promise<{ scenarios: JsonObject[] }>;
  simulateScenario?(projectId: string, scenarioId: string): Promise<JsonObject>;
}

function scenarioId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `scenario-${Date.now()}`;
}

export function ScenarioEditor({ projectId, client, activeGraphVersion, targetNodeId }: { projectId: string; client: ScenarioClient; activeGraphVersion?: number; targetNodeId?: string }) {
  const [name, setName] = useState("");
  const [assumption, setAssumption] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [scenarios, setScenarios] = useState<JsonObject[]>([]);
  const [overrideNodeId, setOverrideNodeId] = useState("");
  const [overrideParameter, setOverrideParameter] = useState("");
  const [overrideValue, setOverrideValue] = useState("");
  const [comparison, setComparison] = useState<JsonObject | null>(null);
  useEffect(() => { void client.listScenarios(projectId).then((result) => setScenarios(result.scenarios)).catch(() => setError("Unable to load saved scenarios.")); }, [client, projectId]);
  async function save() {
    if (!name.trim() || !assumption.trim()) { setError("Scenario name and assumption are required."); return; }
    const hasOverride = overrideNodeId.trim() || overrideParameter.trim() || overrideValue.trim();
    const value = Number(overrideValue);
    if (hasOverride && (!activeGraphVersion || !targetNodeId || !overrideNodeId.trim() || !overrideParameter.trim() || !Number.isFinite(value))) { setError("An executable scenario needs a target, active graph version, node ID, parameter name, and finite override value."); return; }
    try {
      const saved = await client.createScenario(projectId, { id: scenarioId(), name: name.trim(), assumptions: { note: assumption.trim() }, ...(hasOverride ? { base_graph_version: activeGraphVersion, target_node_id: targetNodeId, parameter_overrides: { [overrideNodeId.trim()]: { [overrideParameter.trim()]: value } } } : {}) });
      setScenarios((current) => [...current, saved]);
      setStatus(`Scenario ${name.trim()} saved without changing the active graph.`); setError(""); setComparison(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save scenario."); }
  }
  async function runScenario(id: string) {
    if (!client.simulateScenario) return;
    try { const result = await client.simulateScenario(projectId, id); setComparison(result); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to execute this scenario."); }
  }
  return <section aria-label="Scenario editor">
    <h2>Named scenario</h2><p>Scenario assumptions are separate from active graph structure.</p>
    <label>Scenario name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Assumption<input value={assumption} onChange={(event) => setAssumption(event.target.value)} /></label>
    <fieldset><legend>Optional executable parameter override</legend><p>Uses the current approved graph version only; leave all three fields blank to save narrative assumptions only.</p><label>Override node ID<input aria-label="Override node ID" value={overrideNodeId} onChange={(event) => setOverrideNodeId(event.target.value)} /></label><label>Override parameter<input aria-label="Override parameter" value={overrideParameter} onChange={(event) => setOverrideParameter(event.target.value)} /></label><label>Override value<input aria-label="Override value" type="number" value={overrideValue} onChange={(event) => setOverrideValue(event.target.value)} /></label></fieldset>
    <button onClick={save}>Save named scenario</button>
    {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
    {scenarios.length > 0 && <section aria-label="Saved scenarios"><h3>Saved scenarios</h3><p>Narrative-only scenarios are not applied to the approved run. Executable scenarios run as in-memory comparisons only.</p><ul aria-label="Saved scenarios">{scenarios.map((scenario) => <li key={String(scenario.id)}>{String(scenario.name ?? scenario.id)}{Boolean(scenario.parameter_overrides) && client.simulateScenario && <button onClick={() => void runScenario(String(scenario.id))}>Run saved scenario {String(scenario.name ?? scenario.id)}</button>}</li>)}</ul></section>}
    {comparison && <section aria-label="Scenario comparison receipt"><h3>Scenario comparison receipt</h3><p>Active mean: {String(((comparison.comparison as JsonObject | undefined)?.active_summary as JsonObject | undefined)?.mean ?? "not recorded")} · Scenario mean: {String(((comparison.comparison as JsonObject | undefined)?.candidate_summary as JsonObject | undefined)?.mean ?? "not recorded")}</p><p>Scenario execution is in memory only; it does not activate, approve, or persist a changed graph.</p></section>}
  </section>;
}
