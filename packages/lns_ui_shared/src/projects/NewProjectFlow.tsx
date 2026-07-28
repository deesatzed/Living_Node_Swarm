import { useState } from "react";
import type { JsonObject, WorkspaceProjectInput } from "../api/types";
import { PersistedTargetIntake } from "../intake/PersistedTargetIntake";
import type { TargetPersistenceClient } from "../intake/submitTarget";
import { CandidateMap, type CandidateMapClient } from "../discovery/CandidateMap";
import { VettingConversation, type VettingEntry } from "../discovery/VettingConversation";
import { EvidenceDrawer, type EvidenceDrawerClient } from "../inspectors/EvidenceDrawer";

export interface NewProjectClient extends TargetPersistenceClient, CandidateMapClient {
  createProject(project: WorkspaceProjectInput): Promise<JsonObject>;
  getResearchReview?: EvidenceDrawerClient["getResearchReview"];
  reviewResearchClaim?: EvidenceDrawerClient["reviewResearchClaim"];
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
  const [vetEntries, setVetEntries] = useState<VettingEntry[]>([]);
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
  async function recordVetEntry(entry: VettingEntry) {
    if (!projectId) return;
    const next = [...vetEntries, entry];
    await client.patchProject(projectId, { discovery_ledger: next });
    setVetEntries(next);
  }
  async function recordLocalOnlyResearchPreference() {
    if (!projectId) return;
    await client.patchProject(projectId, { research_consent: { mode: "local_only", provider: "none", model: "none", data_scope: "no content leaves this Mac" } });
  }
  async function proceedToMap() {
    if (!projectId) return;
    try { await client.patchProject(projectId, { stage: "map" }); setBuildStage("map"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to advance to candidate mapping."); }
  }
  if (projectId && targetId) return <section aria-label="Build vet stage">{error && <p role="alert">{error}</p>}<VettingConversation provider="No provider selected" model="No model selected" dataScope="No content will leave this Mac until an explicit provider-routing confirmation is recorded." onRecord={recordVetEntry} onRecordLocalOnly={recordLocalOnlyResearchPreference} onProceed={proceedToMap} />{client.getResearchReview && client.reviewResearchClaim ? <EvidenceDrawer targetId={targetId} client={{ getResearchReview: client.getResearchReview, reviewResearchClaim: client.reviewResearchClaim }} /> : <p>No evidence-review client is available.</p>}</section>;
  if (projectId) return <PersistedTargetIntake client={client} projectId={projectId} onSaved={setTargetId} />;
  return <section aria-labelledby="new-project-title">
    <h1 id="new-project-title">New prediction project</h1>
    <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button onClick={createProject} disabled={busy}>{busy ? "Creating project…" : "Create project"}</button>
  </section>;
}
