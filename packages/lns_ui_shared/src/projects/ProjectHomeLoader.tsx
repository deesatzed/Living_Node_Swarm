import { useEffect, useState } from "react";
import type { EvidenceClassification, JsonObject, VisibleNodeState } from "../api/types";
import { ProjectHome, type ProjectAction, type ProjectHomeItem } from "./ProjectHome";

export interface ProjectHomeClient {
  listProjects(): Promise<{ projects: JsonObject[] }>;
  getTarget(targetId: string): Promise<JsonObject>;
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

function toProjectHomeItem(project: JsonObject, target: JsonObject | undefined): ProjectHomeItem {
  const evidence = text(project.evidence_classification, "fixture_unverified") as EvidenceClassification;
  return {
    id: text(project.id, "unknown-project"),
    name: text(project.name, "Untitled prediction project"),
    target: text(target?.question, text(project.target_id, "Target not yet specified")),
    horizon: horizon(project, target),
    stage: text(project.stage, "idea"),
    activeGraphVersion: typeof project.active_graph_version === "number" ? project.active_graph_version : null,
    freshness: (project.active_graph_version ? "active" : "stale") as VisibleNodeState,
    warningCount: 0,
    evidenceClassification: evidence,
    lastRun: typeof project.last_run === "object" && project.last_run !== null ? `Snapshot ${text((project.last_run as JsonObject).snapshot_id, "unknown")}` : "Not yet run",
    candidateStatus: typeof project.draft_base_version === "number" ? `Draft based on graph v${project.draft_base_version}` : "No saved draft",
  };
}

export function ProjectHomeLoader({ client, onAction }: { client: ProjectHomeClient; onAction: (action: ProjectAction, projectId?: string) => void }) {
  const [projects, setProjects] = useState<ProjectHomeItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await client.listProjects();
        const targets = await Promise.all(result.projects.map(async (project) => {
          const targetId = project.target_id;
          return typeof targetId === "string" ? client.getTarget(targetId).catch(() => undefined) : undefined;
        }));
        if (active) setProjects(result.projects.map((project, index) => toProjectHomeItem(project, targets[index])));
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load prediction projects.");
      }
    })();
    return () => { active = false; };
  }, [client]);

  if (error) return <section aria-label="Project Home"><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Retry loading projects</button></section>;
  if (projects === null) return <section aria-label="Project Home"><p role="status">Loading projects…</p></section>;
  return <ProjectHome projects={projects} onAction={onAction} />;
}
