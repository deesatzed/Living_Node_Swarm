import { useEffect, useState } from "react";
import type { JsonObject, WorkspaceDraftInput } from "../api/types";

export interface EditModelClient {
  createDraft(projectId: string, draft: WorkspaceDraftInput): Promise<JsonObject>;
  listDrafts?(projectId: string): Promise<{ drafts: JsonObject[] }>;
}

function draftId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `draft-${Date.now()}`;
}

export function EditModel({ projectId, activeGraphVersion, client }: { projectId: string; activeGraphVersion: number | null; client: EditModelClient }) {
  const [draft, setDraft] = useState<JsonObject | null>(null);
  const [drafts, setDrafts] = useState<JsonObject[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    let active = true;
    if (!client.listDrafts) return;
    void client.listDrafts(projectId).then((result) => {
      if (active) setDrafts(result.drafts);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load draft history.");
    });
    return () => { active = false; };
  }, [client, projectId]);
  async function createDraft() {
    if (activeGraphVersion === null) { setError("An approved graph version is required before editing."); return; }
    setCreating(true); setError("");
    try {
      const created = await client.createDraft(projectId, { id: draftId(), base_graph_version: activeGraphVersion });
      setDraft(created);
      if (client.listDrafts) setDrafts((await client.listDrafts(projectId)).drafts);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create a version-bound draft."); }
    finally { setCreating(false); }
  }
  return <section aria-label="Edit model controls">
    <p>Editing begins from an exact approved graph version. The active graph remains unchanged until a separate review and approval bind a candidate version.</p>
    <button onClick={createDraft} disabled={creating || activeGraphVersion === null}>{creating ? "Creating draft…" : "Create version-bound draft"}</button>
    {error && <p role="alert">{error}</p>}
    {draft && <p role="status">Draft {String(draft.id ?? "unknown")} is ready for proposed changes.</p>}
    {client.listDrafts && <section aria-label="Draft revision history"><h2>Draft revision history</h2><p>Draft history only; none of these drafts change the active graph.</p>{drafts.length === 0 ? <p>No persisted drafts yet.</p> : <ul>{drafts.map((item) => <li key={String(item.id)}>Draft {String(item.id ?? "unknown")} — base version {String(item.base_graph_version ?? "unknown")}</li>)}</ul>}</section>}
  </section>;
}
