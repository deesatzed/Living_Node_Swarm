import { useState } from "react";
import type { JsonObject, WorkspaceScenarioInput } from "../api/types";

export interface ScenarioClient {
  createScenario(projectId: string, scenario: WorkspaceScenarioInput): Promise<JsonObject>;
  listScenarios(projectId: string): Promise<{ scenarios: JsonObject[] }>;
}

function scenarioId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `scenario-${Date.now()}`;
}

export function ScenarioEditor({ projectId, client }: { projectId: string; client: ScenarioClient }) {
  const [name, setName] = useState("");
  const [assumption, setAssumption] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  async function save() {
    if (!name.trim() || !assumption.trim()) { setError("Scenario name and assumption are required."); return; }
    try {
      await client.createScenario(projectId, { id: scenarioId(), name: name.trim(), assumptions: { note: assumption.trim() } });
      setStatus(`Scenario ${name.trim()} saved without changing the active graph.`); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save scenario."); }
  }
  return <section aria-label="Scenario editor">
    <h2>Named scenario</h2><p>Scenario assumptions are separate from active graph structure.</p>
    <label>Scenario name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Assumption<input value={assumption} onChange={(event) => setAssumption(event.target.value)} /></label>
    <button onClick={save}>Save named scenario</button>
    {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
  </section>;
}
