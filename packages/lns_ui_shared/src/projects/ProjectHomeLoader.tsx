import { useEffect, useState } from "react";
import type { EvidenceClassification, JsonObject, VisibleNodeState } from "../api/types";
import { ProjectHome, type ProjectAction, type ProjectHomeItem } from "./ProjectHome";

export interface ProjectHomeClient {
  listProjects(): Promise<{ projects: JsonObject[] }>;
  getTarget(targetId: string): Promise<JsonObject>;
  getMonitoring?(projectId: string): Promise<JsonObject>;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function horizon(project: JsonObject, target: JsonObject | undefined): string {
  const origin = target?.forecast_origin;
  const resolution = target?.resolution_at;
  if (typeof origin !== "string" || typeof resolution !== "string") return "Not yet specified";
  const days = Math.round((Date.parse(resolution) - Date.parse(origin)) / 86_400_000);
  return Number.isFinite(days) && days >= 0 ? `${days} days` : "Not yet specified";
}

function monitoringStatus(monitoring: JsonObject | undefined): string {
  const config = monitoring?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) return "Not configured";
  const mode = text((config as JsonObject).mode, "unknown");
  if (mode === "fixture") return "Fixture only — no retrieval";
  if (mode === "local") return "Local collector required";
  if (mode === "live") return "Saved live preference — polling not running";
  return `Configured (${mode})`;
}

function unresolvedWarningCount(monitoring: JsonObject | undefined): number {
  const events = monitoring?.events;
  if (!Array.isArray(events)) return 0;
  return events.filter((event) => event && typeof event === "object" && !(event as JsonObject).acknowledged_at && ["warning", "error", "alert"].includes(String((event as JsonObject).severity))).length;
}

function toProjectHomeItem(project: JsonObject, target: JsonObject | undefined, monitoring: JsonObject | undefined): ProjectHomeItem {
  const evidence = text(project.evidence_classification, "fixture_unverified") as EvidenceClassification;
  return {
    id: text(project.id, "unknown-project"),
    name: text(project.name, "Untitled prediction project"),
    target: text(target?.question, text(project.target_id, "Target not yet specified")),
    horizon: horizon(project, target),
    stage: text(project.stage, "idea"),
    activeGraphVersion: typeof project.active_graph_version === "number" ? project.active_graph_version : null,
    freshness: (project.active_graph_version ? "active" : "stale") as VisibleNodeState,
    warningCount: unresolvedWarningCount(monitoring),
    evidenceClassification: evidence,
    lastRun: typeof project.last_run === "object" && project.last_run !== null ? `Snapshot ${text((project.last_run as JsonObject).snapshot_id, "unknown")}` : "Not yet run",
    candidateStatus: typeof project.draft_base_version === "number" ? `Draft based on graph v${project.draft_base_version}` : "No saved draft",
    monitoringStatus: monitoringStatus(monitoring),
  };
}

export function ProjectHomeLoader({ client, onAction }: { client: ProjectHomeClient; onAction: (action: ProjectAction, projectId?: string) => void }) {
  const [projects, setProjects] = useState<ProjectHomeItem[] | null>(null);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await client.listProjects();
        const targets = await Promise.all(result.projects.map(async (project) => {
          const targetId = project.target_id;
          if (typeof targetId !== "string") return { target: undefined, unavailable: false };
          try { return { target: await client.getTarget(targetId), unavailable: false }; }
          catch { return { target: undefined, unavailable: true }; }
        }));
        const monitoring = await Promise.all(result.projects.map(async (project) => {
          const projectId = project.id;
          if (typeof projectId !== "string" || !client.getMonitoring) return { monitoring: undefined, unavailable: false };
          try { return { monitoring: await client.getMonitoring(projectId), unavailable: false }; }
          catch { return { monitoring: undefined, unavailable: true }; }
        }));
        if (active) {
          const unavailableTargets = targets.filter((result) => result.unavailable).length;
          const unavailableMonitoring = monitoring.filter((result) => result.unavailable).length;
          const details = [unavailableTargets ? `${unavailableTargets} target record${unavailableTargets === 1 ? "" : "s"} could not be loaded.` : "", unavailableMonitoring ? `${unavailableMonitoring} monitoring record${unavailableMonitoring === 1 ? "" : "s"} could not be loaded.` : ""].filter(Boolean);
          setPartial(details.length ? `Partial project data: ${details.join(" ")}` : "");
          setProjects(result.projects.map((project, index) => toProjectHomeItem(project, targets[index].target, monitoring[index].monitoring)));
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load prediction projects.");
      }
    })();
    return () => { active = false; };
  }, [client]);

  if (error) return <section aria-label="Project Home"><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Retry loading projects</button></section>;
  if (projects === null) return <section aria-label="Project Home"><p role="status">Loading projects…</p></section>;
  return <section aria-label="Loaded Project Home">{partial && <p role="status">{partial}</p>}<ProjectHome projects={projects} onAction={onAction} /></section>;
}
