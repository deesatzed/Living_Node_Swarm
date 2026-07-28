import { useState } from "react";
import type { JsonObject } from "../api/types";

export interface DecisionLedgerClient {
  patchProject(projectId: string, patch: JsonObject): Promise<JsonObject>;
}

type LedgerEntry = { classification: "fact" | "user_claim" | "inference" | "scenario" | "unknown"; text: string };

export function DecisionLedger({ projectId, client }: { projectId: string; client: DecisionLedgerClient }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [text, setText] = useState("");
  const [classification, setClassification] = useState<LedgerEntry["classification"]>("user_claim");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  async function save() {
    const trimmed = text.trim();
    if (!trimmed) { setError("A discovery entry is required."); return; }
    const next = [...entries, { classification, text: trimmed }];
    setError("");
    try { await client.patchProject(projectId, { discovery_ledger: next }); setEntries(next); setText(""); setStatus("Discovery entry saved."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save discovery entry."); }
  }
  return <section aria-label="Discovery ledger">
    <h3>Discovery ledger</h3>
    <label>Discovery entry<input value={text} onChange={(event) => setText(event.target.value)} /></label>
    <label>Entry classification<select value={classification} onChange={(event) => setClassification(event.target.value as LedgerEntry["classification"])}><option value="fact">fact</option><option value="user_claim">user claim</option><option value="inference">proposed interpretation</option><option value="scenario">scenario assumption</option><option value="unknown">unknown</option></select></label>
    <button onClick={save}>Save discovery entry</button>
    {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
    {entries.length > 0 && <ul>{entries.map((entry, index) => <li key={`${entry.classification}-${index}`}><strong>{entry.classification}</strong>: {entry.text}</li>)}</ul>}
  </section>;
}
