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
const RESEARCH_CATEGORIES = ["supply", "demand", "substitution", "recycling", "future uses", "regime risks", "external drivers"] as const;

export function VettingConversation({ provider, model, dataScope, onProceed, onRecord, onRecordLocalOnly, onRecordProviderRouting, onRecordResearchCategories }: {
  provider: string;
  model: string;
  dataScope: string;
  onProceed?: () => void | Promise<void>;
  onRecord?: (entry: VettingEntry) => Promise<void>;
  onRecordLocalOnly?: () => Promise<void>;
  onRecordProviderRouting?: (receipt: { mode: string; provider: string; model: string; data_scope: string; confirmed_at: string }) => Promise<void>;
  onRecordResearchCategories?: (categories: string[]) => Promise<void>;
}) {
  const [paused, setPaused] = useState(false);
  const [action, setAction] = useState<(typeof ACTIONS)[number] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [routingProvider, setRoutingProvider] = useState("none");
  const [routingAuthorized, setRoutingAuthorized] = useState(false);
  const [researchCategories, setResearchCategories] = useState<string[]>([]);
  async function recordLocalOnly() {
    if (!onRecordLocalOnly) return;
    setBusy(true); setError("");
    try { await onRecordLocalOnly(); setStatus("Local-only research preference saved. No content leaves this Mac."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save local-only research preference."); }
    finally { setBusy(false); }
  }
  async function record() {
    if (!action || !text.trim() || !onRecord) return;
    setBusy(true); setError("");
    try {
      await onRecord({ classification: action.classification, text: action.label === "Exclude direction" ? `Excluded: ${text.trim()}` : text.trim() });
      setStatus(`${action.label} saved to the discovery ledger.`); setAction(null); setText("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save discovery entry."); }
    finally { setBusy(false); }
  }
  async function recordProviderRouting() {
    if (!onRecordProviderRouting || routingProvider === "none" || !routingAuthorized) return;
    setBusy(true); setError("");
    try { await onRecordProviderRouting({ mode: "provider_routing_authorized", provider: routingProvider, model: "not selected", data_scope: "No research content has been sent. Future routing is limited to the explicit research brief.", confirmed_at: new Date().toISOString() }); setStatus("Provider-routing consent saved. No research content was sent."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save provider-routing consent."); }
    finally { setBusy(false); }
  }
  async function recordResearchCategories() {
    if (!onRecordResearchCategories || researchCategories.length === 0) return;
    setBusy(true); setError("");
    try { await onRecordResearchCategories(researchCategories); setStatus(`Research brief categories saved: ${researchCategories.join(", ")}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save research categories."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="vetting-title">
    <h2 id="vetting-title">Vet the research brief</h2>
    <p>Record user claims, proposed interpretations, exclusions, scenarios, and unknowns before model structure is proposed.</p>
    <div><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button><button onClick={() => void onProceed?.()} disabled={paused}>Proceed now</button>{ACTIONS.map((candidate) => <button key={candidate.label} onClick={() => { setAction(candidate); setStatus(""); }}>{candidate.label}</button>)}</div>
    {paused && <p role="status">Discovery is paused. No research or routing action is in progress.</p>}
    {action && <section aria-label="Record discovery action"><label>{action.prompt}<input value={text} onChange={(event) => setText(event.target.value)} /></label><button onClick={() => void record()} disabled={busy || !text.trim()}>{busy ? "Saving discovery entry…" : "Save discovery action"}</button></section>}
    <section aria-label="Planned research categories"><h3>Planned research categories</h3>{RESEARCH_CATEGORIES.map((category) => <label key={category}><input aria-label={category[0].toUpperCase() + category.slice(1)} type="checkbox" checked={researchCategories.includes(category)} disabled={!onRecordResearchCategories || busy} onChange={(event) => setResearchCategories((current) => event.target.checked ? [...current, category] : current.filter((item) => item !== category))} />{category}</label>)}<button onClick={() => void recordResearchCategories()} disabled={!onRecordResearchCategories || researchCategories.length === 0 || busy}>Save research categories</button><p>These are a planned brief, not retrieved evidence or a completed research run.</p></section>
    {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
    <aside aria-label="Provider routing preview"><strong>{provider} · {model}</strong><p>{dataScope}</p><button onClick={() => void recordLocalOnly()} disabled={!onRecordLocalOnly || busy}>Keep research local</button><label>Research routing provider<select aria-label="Research routing provider" value={routingProvider} onChange={(event) => { setRoutingProvider(event.target.value); setRoutingAuthorized(false); }} disabled={!onRecordProviderRouting || busy}><option value="none">No provider selected</option><option value="openrouter">OpenRouter</option></select></label><label><input aria-label="I authorize this routing receipt" type="checkbox" checked={routingAuthorized} disabled={routingProvider === "none" || !onRecordProviderRouting || busy} onChange={(event) => setRoutingAuthorized(event.target.checked)} />I authorize this routing receipt</label><button onClick={() => void recordProviderRouting()} disabled={!onRecordProviderRouting || routingProvider === "none" || !routingAuthorized || busy}>Record provider-routing consent</button><p>Recording consent sends no research content. Provider routing requires explicit confirmation; fixture evidence never becomes live research.</p></aside>
  </section>;
}
