import type { JsonObject, TargetContractInput } from "../api/types";

export interface TargetPersistenceClient {
  createTarget(target: Partial<TargetContractInput>): Promise<JsonObject>;
  patchProject(projectId: string, patch: JsonObject): Promise<JsonObject>;
}

export async function submitTargetToProject(
  client: TargetPersistenceClient,
  projectId: string,
  target: Partial<TargetContractInput>,
): Promise<void> {
  if (!target.id) throw new Error("A target id is required before persistence.");
  await client.createTarget(target);
  await client.patchProject(projectId, { target_id: target.id });
}
