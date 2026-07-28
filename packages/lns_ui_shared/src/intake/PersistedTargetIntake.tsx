import { useState } from "react";
import type { TargetContractInput } from "../api/types";
import { TargetIntake } from "./TargetIntake";
import { submitTargetToProject, type TargetPersistenceClient } from "./submitTarget";

export function PersistedTargetIntake({ client, projectId, onSaved }: { client: TargetPersistenceClient; projectId: string; onSaved?: (targetId: string) => void }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function persist(target: Partial<TargetContractInput>) {
    setStatus("saving");
    setError("");
    try {
      await submitTargetToProject(client, projectId, target);
      setStatus("saved");
      onSaved?.(target.id!);
    } catch (reason) {
      setStatus("error");
      setError(reason instanceof Error ? reason.message : "Unable to save the target contract.");
    }
  }

  return <section aria-label="Persisted target intake">
    <TargetIntake onSubmit={persist} />
    {status === "saving" && <p role="status">Saving target contract…</p>}
    {status === "saved" && <p role="status">Target contract saved to this workspace.</p>}
    {status === "error" && <p role="alert">{error}</p>}
  </section>;
}
