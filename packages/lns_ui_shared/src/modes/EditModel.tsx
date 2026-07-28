import { useState } from "react";
import type { JsonObject, WorkspaceDraftInput } from "../api/types";

export interface EditModelClient {
  createDraft(projectId: string, draft: WorkspaceDraftInput): Promise<JsonObject>;
}

function draftId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `draft-${Date.now()}`;
}

export function EditModel({ projectId, activeGraphVersion, client }: { projectId: string; activeGraphVersion: number | null; client: EditModelClient }) {
  const [draft, setDraft] = useState<JsonObject | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  async function createDraft() {
    if (activeGraphVersion === null) { setError("An approved graph version is required before editing."); return; }
    setCreating(true); setError("");
    try { setDraft(await client.createDraft(projectId, { id: draftId(), base_graph_version: activeGraphVersion })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create a version-bound draft."); }
    finally { setCreating(false); }
  }
  return <section aria-label="Edit model controls">
    <p>Editing begins from an exact approved graph version. The active graph remains unchanged until a separate review and approval bind a candidate version.</p>
    <button onClick={createDraft} disabled={creating || activeGraphVersion === null}>{creating ? "Creating draft…" : "Create version-bound draft"}</button>
    {error && <p role="alert">{error}</p>}
    {draft && <p role="status">Draft {String(draft.id ?? "unknown")} is ready for proposed changes.</p>}
  </section>;
}
