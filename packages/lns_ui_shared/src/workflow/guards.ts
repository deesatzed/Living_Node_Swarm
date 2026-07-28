import { WORKFLOW_STAGE_IDS, type WorkflowStageId } from "./stages";

export interface StageTransitionContext {
  current: WorkflowStageId;
  targetComplete: boolean;
}

export function canMoveToStage(
  { current, targetComplete }: StageTransitionContext,
  destination: WorkflowStageId,
): { allowed: boolean; reason?: string } {
  const currentIndex = WORKFLOW_STAGE_IDS.indexOf(current);
  const destinationIndex = WORKFLOW_STAGE_IDS.indexOf(destination);
  if (destinationIndex <= currentIndex || targetComplete) return { allowed: true };
  return { allowed: false, reason: "Complete the target contract first." };
}
