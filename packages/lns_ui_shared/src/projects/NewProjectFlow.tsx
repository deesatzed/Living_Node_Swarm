import { useState } from "react";
import type { JsonObject, WorkspaceProjectInput } from "../api/types";
import { PersistedTargetIntake } from "../intake/PersistedTargetIntake";
import type { TargetPersistenceClient } from "../intake/submitTarget";

export interface NewProjectClient extends TargetPersistenceClient {
  createProject(project: WorkspaceProjectInput): Promise<JsonObject>;
}

function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `project-${Date.now()}`;
}

export function NewProjectFlow({ client, onCreated }: { client: NewProjectClient; onCreated: (projectId: string) => void }) {
  const [name, setName] = useState("New prediction project");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createProject() {
    const id = newId();
    setBusy(true);
    setError("");
    try {
      await client.createProject({ id, name: name.trim() || "New prediction project", stage: "idea", evidence_classification: "fixture_unverified" });
      setProjectId(id);
      onCreated(id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create prediction project.");
    } finally {
      setBusy(false);
    }
  }

  if (projectId) return <PersistedTargetIntake client={client} projectId={projectId} />;
  return <section aria-labelledby="new-project-title">
    <h1 id="new-project-title">New prediction project</h1>
    <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button onClick={createProject} disabled={busy}>{busy ? "Creating project…" : "Create project"}</button>
  </section>;
}
