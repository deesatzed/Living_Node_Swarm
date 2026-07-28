import { useState } from "react";
import type { JsonObject, WorkspaceProjectInput } from "../api/types";
import { PersistedTargetIntake } from "../intake/PersistedTargetIntake";
import type { TargetPersistenceClient } from "../intake/submitTarget";
import { CandidateMap, type CandidateMapClient } from "../discovery/CandidateMap";
import { DecisionLedger } from "../discovery/DecisionLedger";
import { VettingConversation } from "../discovery/VettingConversation";

export interface NewProjectClient extends TargetPersistenceClient, CandidateMapClient {
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
  const [targetId, setTargetId] = useState<string | null>(null);
  const [buildStage, setBuildStage] = useState<"vet" | "map">("vet");
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

  if (projectId && targetId && buildStage === "map") return <section aria-label="Build candidate map"><h1>Map proposed factors</h1><p>Target contract saved. Continue through the explicitly labeled candidate map before any approval.</p><CandidateMap targetId={targetId} client={client} /></section>;
  if (projectId && targetId) return <section aria-label="Build vet stage"><VettingConversation provider="No provider selected" model="No model selected" dataScope="No content will leave this Mac until an explicit provider-routing confirmation is recorded." onProceed={() => setBuildStage("map")} /><DecisionLedger projectId={projectId} client={client} /></section>;
  if (projectId) return <PersistedTargetIntake client={client} projectId={projectId} onSaved={setTargetId} />;
  return <section aria-labelledby="new-project-title">
    <h1 id="new-project-title">New prediction project</h1>
    <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button onClick={createProject} disabled={busy}>{busy ? "Creating project…" : "Create project"}</button>
  </section>;
}
