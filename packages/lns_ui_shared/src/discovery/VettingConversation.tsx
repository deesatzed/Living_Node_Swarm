import { useState } from "react";

export type VettingEntryKind = "fact" | "user_claim" | "inference" | "scenario" | "unknown";
export interface VettingEntry { classification: VettingEntryKind; text: string; }

const ACTIONS: Array<{ label: string; classification: VettingEntryKind; prompt: string }> = [
  { label: "Ask another question", classification: "unknown", prompt: "Question to resolve" },
  { label: "Add source", classification: "fact", prompt: "Source or known fact" },
  { label: "Add direction", classification: "inference", prompt: "Proposed direction" },
  { label: "Exclude direction", classification: "inference", prompt: "Direction to exclude" },
  { label: "Correct understanding", classification: "user_claim", prompt: "Corrected understanding" },
];

export function VettingConversation({ provider, model, dataScope, onProceed, onRecord }: {
  provider: string;
  model: string;
  dataScope: string;
  onProceed?: () => void;
  onRecord?: (entry: VettingEntry) => Promise<void>;
}) {
  const [paused, setPaused] = useState(false);
  const [action, setAction] = useState<(typeof ACTIONS)[number] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  async function record() {
    if (!action || !text.trim() || !onRecord) return;
    setBusy(true); setError("");
    try {
      await onRecord({ classification: action.classification, text: action.label === "Exclude direction" ? `Excluded: ${text.trim()}` : text.trim() });
      setStatus(`${action.label} saved to the discovery ledger.`); setAction(null); setText("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save discovery entry."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="vetting-title">
    <h2 id="vetting-title">Vet the research brief</h2>
    <p>Record user claims, proposed interpretations, exclusions, scenarios, and unknowns before model structure is proposed.</p>
    <div><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button><button onClick={onProceed} disabled={paused}>Proceed now</button>{ACTIONS.map((candidate) => <button key={candidate.label} onClick={() => { setAction(candidate); setStatus(""); }}>{candidate.label}</button>)}</div>
    {paused && <p role="status">Discovery is paused. No research or routing action is in progress.</p>}
    {action && <section aria-label="Record discovery action"><label>{action.prompt}<input value={text} onChange={(event) => setText(event.target.value)} /></label><button onClick={() => void record()} disabled={busy || !text.trim()}>{busy ? "Saving discovery entry…" : "Save discovery action"}</button></section>}
    {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
    <aside aria-label="Provider routing preview"><strong>{provider} · {model}</strong><p>{dataScope}</p><p>Routing requires explicit confirmation; fixture evidence never becomes live research.</p></aside>
  </section>;
}
