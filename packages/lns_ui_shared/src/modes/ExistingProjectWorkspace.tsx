import { useEffect, useState } from "react";
import type { EvidenceClassification, JsonObject, VisibleNodeState } from "../api/types";
import { WorkspaceShell } from "../workspace/WorkspaceShell";
import { RunModel, type RunModelClient } from "./RunModel";
import { MonitoringSetup, type MonitoringClient } from "../monitoring/MonitoringSetup";
import { EditModel, type EditModelClient } from "./EditModel";
import type { ScenarioClient } from "../simulation/ScenarioEditor";
import { ShadowComparison, type ShadowComparisonClient } from "../simulation/ShadowComparison";
import { ApprovedGraphMap } from "../graph/ApprovedGraphMap";

export type ExistingProjectMode = "run" | "edit" | "monitor";

export interface ExistingProjectClient extends RunModelClient, MonitoringClient, EditModelClient, ScenarioClient {
  getProject(projectId: string): Promise<JsonObject>;
  getTarget(targetId: string): Promise<JsonObject>;
  getGraph?(graphId: string): Promise<JsonObject>;
  shadowSimulate?: ShadowComparisonClient["shadowSimulate"];
  shadowStructuralProposal?: ShadowComparisonClient["shadowStructuralProposal"];
  createCandidateProposal?: ShadowComparisonClient["createCandidateProposal"];
  approveCandidateProposal?: ShadowComparisonClient["approveCandidateProposal"];
  approveProjectCandidateProposal?: ShadowComparisonClient["approveProjectCandidateProposal"];
  createStructuralProposal?: ShadowComparisonClient["createStructuralProposal"];
  approveStructuralProposal?: ShadowComparisonClient["approveStructuralProposal"];
  approveProjectStructuralProposal?: ShadowComparisonClient["approveProjectStructuralProposal"];
  createCandidateRevision?: ShadowComparisonClient["createCandidateRevision"];
  listCandidateRevisions?: ShadowComparisonClient["listCandidateRevisions"];
  elicitDistribution?: ShadowComparisonClient["elicitDistribution"];
  validateRelationships?: ShadowComparisonClient["validateRelationships"];
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

export function ExistingProjectWorkspace({ mode, projectId, client, onBack, onBranchToEdit }: { mode: ExistingProjectMode; projectId: string; client: ExistingProjectClient; onBack: () => void; onBranchToEdit?: () => void }) {
  const [project, setProject] = useState<JsonObject | null>(null);
  const [target, setTarget] = useState<JsonObject | undefined>();
  const [approvedGraph, setApprovedGraph] = useState<JsonObject | undefined>();
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
  useEffect(() => {
    let active = true;
    if (mode !== "edit" || !project || typeof project.graph_id !== "string" || !client.getGraph) return;
    void client.getGraph(project.graph_id).then((graph) => { if (active) setApprovedGraph(graph); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load the approved dependency graph.");
    });
    return () => { active = false; };
  }, [client, mode, project]);

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
    currentStage={stringValue(project.stage, "")}
  >
    <h1>{copy.title}</h1>
    <p>{copy.summary}</p>
    {mode === "run" && typeof project.graph_id === "string" && <RunModel graphId={project.graph_id} client={client} projectId={projectId} scenarioClient={client} targetNodeId={typeof target?.target_node_id === "string" ? target.target_node_id : undefined} activeGraphVersion={typeof project.active_graph_version === "number" ? project.active_graph_version : undefined} onReceipt={async (result) => {
      const snapshot = result.snapshot as JsonObject | undefined;
      await client.patchProject?.(projectId, { last_run: { snapshot_id: stringValue(snapshot?.id, "unknown"), graph_version: stringValue(snapshot?.graph_version, "unknown"), freshness: stringValue((result.sim_status as JsonObject | undefined)?.freshness, "unknown") } });
    }} />}
    {mode === "run" && typeof project.graph_id !== "string" && <p role="alert">This project has no approved graph to run yet.</p>}
    {mode === "monitor" && <MonitoringSetup projectId={projectId} client={client} onBranchToEdit={onBranchToEdit} />}
    {mode === "edit" && <EditModel projectId={projectId} activeGraphVersion={typeof project.active_graph_version === "number" ? project.active_graph_version : null} client={client} />}
    {mode === "edit" && approvedGraph && <ApprovedGraphMap graph={approvedGraph} />}
    {mode === "edit" && typeof project.graph_id === "string" && client.getGraph && client.shadowSimulate && <ShadowComparison graphId={project.graph_id} projectId={projectId} activeGraphVersion={typeof project.active_graph_version === "number" ? project.active_graph_version : undefined} client={{ getGraph: client.getGraph, shadowSimulate: client.shadowSimulate, shadowStructuralProposal: client.shadowStructuralProposal, createCandidateProposal: client.createCandidateProposal, approveCandidateProposal: client.approveCandidateProposal, approveProjectCandidateProposal: client.approveProjectCandidateProposal, createStructuralProposal: client.createStructuralProposal, approveStructuralProposal: client.approveStructuralProposal, approveProjectStructuralProposal: client.approveProjectStructuralProposal, createCandidateRevision: client.createCandidateRevision, listCandidateRevisions: client.listCandidateRevisions, elicitDistribution: client.elicitDistribution, validateRelationships: client.validateRelationships }} onApproved={setProject} />}
    <button onClick={onBack}>Back to projects</button>
  </WorkspaceShell>;
}
