import { useEffect, useState } from "react";
import type { JsonObject, MonitoringConfigInput } from "../api/types";

export interface MonitoringClient {
  getMonitoring(projectId: string): Promise<JsonObject>;
  saveMonitoring(projectId: string, config: MonitoringConfigInput): Promise<JsonObject>;
}

const FALLBACK: MonitoringConfigInput = { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" };

export function MonitoringSetup({ projectId, client }: { projectId: string; client: MonitoringClient }) {
  const [config, setConfig] = useState<MonitoringConfigInput | null>(null);
  const [events, setEvents] = useState<JsonObject[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void (async () => {
    try {
      const result = await client.getMonitoring(projectId);
      const saved = result.config as Partial<MonitoringConfigInput> | null;
      setConfig(saved?.cadence && saved.freshness_threshold_days && saved.mode ? saved as MonitoringConfigInput : FALLBACK);
      setEvents(Array.isArray(result.events) ? result.events as JsonObject[] : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load monitoring."); }
  })(); }, [client, projectId]);
  if (error) return <p role="alert">{error}</p>;
  if (!config) return <p role="status">Loading monitoring configuration…</p>;
  async function save() {
    const nextConfig = config;
    if (!nextConfig) return;
    try { await client.saveMonitoring(projectId, nextConfig); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save monitoring."); }
  }
  return <section aria-label="Monitoring configuration">
    <label>Cadence<select value={config.cadence} onChange={(event) => setConfig({ ...config, cadence: event.target.value })}><option value="daily">daily</option><option value="weekly">weekly</option><option value="monthly">monthly</option></select></label>
    <label>Freshness threshold days<input type="number" min="1" value={config.freshness_threshold_days} onChange={(event) => setConfig({ ...config, freshness_threshold_days: Number(event.target.value) })} /></label>
    <label>Monitoring mode<select value={config.mode} onChange={(event) => setConfig({ ...config, mode: event.target.value as MonitoringConfigInput["mode"] })}><option value="fixture">fixture</option><option value="local">local</option><option value="live">live</option></select></label>
    <button onClick={save}>Save monitoring configuration</button>
    <h2>Monitoring events</h2>
    {events.length === 0 ? <p>No monitoring events yet.</p> : <ul>{events.map((event) => <li key={String(event.id)}><strong>{String(event.severity ?? "info")}</strong>: {String(event.message ?? "Unknown event")}<p>{event.evidence_classification === "fixture_unverified" ? "Fixture event — not live monitoring" : String(event.evidence_classification ?? "Unknown evidence state")}</p><button>Inspect event</button><button>Acknowledge event</button><button>Branch to edit</button></li>)}</ul>}
  </section>;
}
