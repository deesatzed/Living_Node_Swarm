import type { EvidenceClassification, VisibleNodeState } from "../api/types";

export type ProjectAction = "new" | "run" | "edit" | "monitor";

export interface ProjectHomeItem {
  id: string;
  name: string;
  target: string;
  horizon: string;
  stage: string;
  activeGraphVersion: number | null;
  freshness: VisibleNodeState;
  warningCount: number;
  evidenceClassification: EvidenceClassification;
  lastRun: string;
}

export function ProjectHome({ projects, onAction }: { projects: ProjectHomeItem[]; onAction: (action: ProjectAction, projectId?: string) => void }) {
  const selectedProjectId = projects[0]?.id;
  return <section aria-labelledby="project-home-title">
    <h1 id="project-home-title">Prediction projects</h1>
    <p>Choose a guided build path or operate an approved model without silently changing it.</p>
    <div>
      <button onClick={() => onAction("new")}>New project</button>
      <button onClick={() => onAction("run", selectedProjectId)} disabled={!selectedProjectId}>Run model</button>
      <button onClick={() => onAction("edit", selectedProjectId)} disabled={!selectedProjectId}>Edit model</button>
      <button onClick={() => onAction("monitor", selectedProjectId)} disabled={!selectedProjectId}>Monitor</button>
    </div>
    {projects.length === 0 ? <p>No projects yet. Start a new resolution-grade target.</p> : <ul>
      {projects.map((project) => <li key={project.id}>
        <h2>{project.name}</h2>
        <p><span>{project.target}</span> · <span>{project.horizon}</span></p>
        <p>Stage: {project.stage} · Graph v{project.activeGraphVersion ?? "—"} · {project.freshness}</p>
        <p>{project.evidenceClassification === "fixture_unverified" ? "Fixture evidence — not live research" : project.evidenceClassification}</p>
        <p><span>{project.warningCount} unresolved warnings</span> · Last run: {project.lastRun}</p>
      </li>)}
    </ul>}
  </section>;
}
