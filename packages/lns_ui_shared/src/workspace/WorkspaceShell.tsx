import type { ReactNode } from "react";
import type { EvidenceClassification, VisibleNodeState } from "../api/types";
import { WORKFLOW_STAGES } from "../workflow/stages";

export function WorkspaceShell({ projectName, target, horizon, graphVersion, freshness, evidenceClassification, currentStage, children }: {
  projectName: string; target: string; horizon: string; graphVersion: number; freshness: VisibleNodeState; evidenceClassification: EvidenceClassification; currentStage?: string; children: ReactNode;
}) {
  return <section aria-label="Prediction workspace">
    <header><strong>{projectName}</strong><p><span>{target}</span> · <span>{horizon}</span> · <span>Graph v{graphVersion}</span> · <span>{freshness}</span></p><p>{evidenceClassification === "fixture_unverified" ? "Fixture evidence — not live research" : evidenceClassification}</p></header>
    <div><nav aria-label="Lifecycle"><p>Current stage: {WORKFLOW_STAGES.find((stage) => stage.id === currentStage)?.label ?? "Not yet selected"}</p><ol>{WORKFLOW_STAGES.map((stage) => <li key={stage.id} aria-current={stage.id === currentStage ? "step" : undefined}>{stage.label}</li>)}</ol></nav><main>{children}</main><aside aria-label="Context inspector">Select a node, relationship, evidence item, or receipt to inspect.</aside></div>
    <footer aria-label="Analysis tray">Comparison, sensitivity, and run receipts appear here.</footer>
  </section>;
}
