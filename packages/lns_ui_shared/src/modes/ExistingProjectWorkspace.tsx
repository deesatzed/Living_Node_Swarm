import { useEffect, useState } from "react";
import type { EvidenceClassification, JsonObject, VisibleNodeState } from "../api/types";
import { WorkspaceShell } from "../workspace/WorkspaceShell";
import { RunModel, type RunModelClient } from "./RunModel";
import { MonitoringSetup, type MonitoringClient } from "../monitoring/MonitoringSetup";
import { EditModel, type EditModelClient } from "./EditModel";
import type { ScenarioClient } from "../simulation/ScenarioEditor";

export type ExistingProjectMode = "run" | "edit" | "monitor";

export interface ExistingProjectClient extends RunModelClient, MonitoringClient, EditModelClient, ScenarioClient {
  getProject(projectId: string): Promise<JsonObject>;
  getTarget(targetId: string): Promise<JsonObject>;
  patchProject?(projectId: string, patch: JsonObject): Promise<JsonObject>;
}

const MODE_COPY: Record<ExistingProjectMode, { title: string; summary: string }> = {
  run: { title: "Run approved model", summary: "Run mode inspects and executes the selected approved model without altering its approved structure." },
  edit: { title: "Edit model through a draft", summary: "Edit mode starts from the selected version and keeps proposed changes separate until explicit approval." },
  monitor: { title: "Monitor model", summary: "Monitor mode surfaces freshness and events; it cannot silently rewrite the model." },
};

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function projectHorizon(target: JsonObject | undefined): string {
  if (typeof target?.forecast_origin !== "string" || typeof target.resolution_at !== "string") return "Not yet specified";
  const days = Math.round((Date.parse(target.resolution_at) - Date.parse(target.forecast_origin)) / 86_400_000);
  return Number.isFinite(days) && days >= 0 ? `${days} days` : "Not yet specified";
}

export function ExistingProjectWorkspace({ mode, projectId, client, onBack }: { mode: ExistingProjectMode; projectId: string; client: ExistingProjectClient; onBack: () => void }) {
  const [project, setProject] = useState<JsonObject | null>(null);
  const [target, setTarget] = useState<JsonObject | undefined>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const loadedProject = await client.getProject(projectId);
        const loadedTarget = typeof loadedProject.target_id === "string" ? await client.getTarget(loadedProject.target_id) : undefined;
        if (active) { setProject(loadedProject); setTarget(loadedTarget); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load selected prediction project.");
      }
    })();
    return () => { active = false; };
  }, [client, projectId]);

  if (error) return <section aria-label="Existing project workspace"><p role="alert">{error}</p><button onClick={onBack}>Back to projects</button></section>;
  if (!project) return <section aria-label="Existing project workspace"><p role="status">Loading selected project…</p></section>;
  const copy = MODE_COPY[mode];
  return <WorkspaceShell
    projectName={stringValue(project.name, "Untitled prediction project")}
    target={stringValue(target?.question, stringValue(project.target_id, "Target not yet specified"))}
    horizon={projectHorizon(target)}
    graphVersion={typeof project.active_graph_version === "number" ? project.active_graph_version : 0}
    freshness={(project.active_graph_version ? "active" : "stale") as VisibleNodeState}
    evidenceClassification={stringValue(project.evidence_classification, "fixture_unverified") as EvidenceClassification}
  >
    <h1>{copy.title}</h1>
    <p>{copy.summary}</p>
    {mode === "run" && typeof project.graph_id === "string" && <RunModel graphId={project.graph_id} client={client} projectId={projectId} scenarioClient={client} onReceipt={async (result) => {
      const snapshot = result.snapshot as JsonObject | undefined;
      await client.patchProject?.(projectId, { last_run: { snapshot_id: stringValue(snapshot?.id, "unknown"), graph_version: stringValue(snapshot?.graph_version, "unknown"), freshness: stringValue((result.sim_status as JsonObject | undefined)?.freshness, "unknown") } });
    }} />}
    {mode === "run" && typeof project.graph_id !== "string" && <p role="alert">This project has no approved graph to run yet.</p>}
    {mode === "monitor" && <MonitoringSetup projectId={projectId} client={client} />}
    {mode === "edit" && <EditModel projectId={projectId} activeGraphVersion={typeof project.active_graph_version === "number" ? project.active_graph_version : null} client={client} />}
    <button onClick={onBack}>Back to projects</button>
  </WorkspaceShell>;
}
