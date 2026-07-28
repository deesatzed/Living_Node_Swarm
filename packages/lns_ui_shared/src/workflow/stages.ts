export const WORKFLOW_STAGE_IDS = [
  "idea",
  "vet",
  "map",
  "refine",
  "quantify",
  "simulate",
  "decide",
  "monitor",
] as const;

export type WorkflowStageId = (typeof WORKFLOW_STAGE_IDS)[number];

export interface WorkflowStage {
  id: WorkflowStageId;
  label: string;
}

export const WORKFLOW_STAGES: readonly WorkflowStage[] = [
  { id: "idea", label: "Idea" },
  { id: "vet", label: "Vet" },
  { id: "map", label: "Map" },
  { id: "refine", label: "Refine" },
  { id: "quantify", label: "Quantify" },
  { id: "simulate", label: "Simulate" },
  { id: "decide", label: "Decide" },
  { id: "monitor", label: "Monitor" },
];
