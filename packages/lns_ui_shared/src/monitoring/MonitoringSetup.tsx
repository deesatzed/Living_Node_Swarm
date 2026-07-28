import { useEffect, useState } from "react";
import type { JsonObject, MonitoringConfigInput } from "../api/types";

export interface MonitoringClient {
  getMonitoring(projectId: string): Promise<JsonObject>;
  saveMonitoring(projectId: string, config: MonitoringConfigInput): Promise<JsonObject>;
  acknowledgeMonitoringEvent(projectId: string, eventId: string): Promise<JsonObject>;
}

const FALLBACK: MonitoringConfigInput = { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" };

export function MonitoringSetup({ projectId, client, onBranchToEdit, onOpenRun }: { projectId: string; client: MonitoringClient; onBranchToEdit?: () => void; onOpenRun?: () => void }) {
  const [config, setConfig] = useState<MonitoringConfigInput | null>(null);
  const [events, setEvents] = useState<JsonObject[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [inspectedEvent, setInspectedEvent] = useState<JsonObject | null>(null);
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
    try { await client.saveMonitoring(projectId, nextConfig); setStatus(`Monitoring configuration saved. ${nextConfig.mode === "fixture" ? "Fixture events are not live monitoring." : nextConfig.mode === "live" ? "Live monitoring is not running: this setting is saved locally until an external polling integration is configured." : "Local monitoring requires a configured local collector."}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save monitoring."); }
  }
  async function acknowledge(eventId: string) {
    try {
      const updated = await client.acknowledgeMonitoringEvent(projectId, eventId);
      setEvents((current) => current.map((event) => String(event.id) === eventId ? { ...event, ...updated } : event));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to acknowledge monitoring event."); }
  }
  return <section aria-label="Monitoring configuration">
    <label>Cadence<select value={config.cadence} onChange={(event) => setConfig({ ...config, cadence: event.target.value })}><option value="daily">daily</option><option value="weekly">weekly</option><option value="monthly">monthly</option></select></label>
    <label>Freshness threshold days<input type="number" min="1" value={config.freshness_threshold_days} onChange={(event) => setConfig({ ...config, freshness_threshold_days: Number(event.target.value) })} /></label>
    <label>Monitoring mode<select value={config.mode} onChange={(event) => setConfig({ ...config, mode: event.target.value as MonitoringConfigInput["mode"] })}><option value="fixture">fixture</option><option value="local">local</option><option value="live">live</option></select></label>
    <button onClick={save}>Save monitoring configuration</button>
    {config.mode === "fixture" && <p>Fixture monitoring is for workflow verification and does not retrieve external sources.</p>}
    {config.mode === "local" && <p>Local monitoring requires a configured local collector; no collector is started by this screen.</p>}
    {config.mode === "live" && <p>Live monitoring is not running: this setting is saved locally until an external polling integration is configured.</p>}
    {status && <p role="status">{status}</p>}
    <h2>Monitoring events</h2>
    {inspectedEvent && <section aria-label="Inspected monitoring event"><h3>Event details</h3><p>{String(inspectedEvent.message ?? "Unknown event")}</p><p>Inspection does not change the approved model.</p></section>}
    {events.length === 0 ? <p>No monitoring events yet.</p> : <ul>{events.map((event) => <li key={String(event.id)}><strong>{String(event.severity ?? "info")}</strong>: {String(event.message ?? "Unknown event")}<p>{event.evidence_classification === "fixture_unverified" ? "Fixture event — not live monitoring" : String(event.evidence_classification ?? "Unknown evidence state")}</p>{event.acknowledged_at ? <p>Acknowledged {String(event.acknowledged_at)}</p> : <button onClick={() => void acknowledge(String(event.id))}>Acknowledge event</button>}<button onClick={() => setInspectedEvent(event)}>Inspect event</button><button onClick={onOpenRun}>Open immutable Run workspace</button><button onClick={onBranchToEdit}>Branch to edit</button></li>)}</ul>}
  </section>;
}
