import { useEffect, useState } from "react";
import type { JsonObject, ShadowSimulationInput } from "../api/types";

export interface ShadowComparisonClient {
  getGraph(graphId: string): Promise<JsonObject>;
  shadowSimulate(graphId: string, body: ShadowSimulationInput): Promise<JsonObject>;
}

interface GraphNode {
  id: string;
  name: string;
  parameters: Record<string, number>;
  dependsOn: string[];
}

function graphNodes(graph: JsonObject): GraphNode[] {
  if (!graph.nodes || typeof graph.nodes !== "object" || Array.isArray(graph.nodes)) return [];
  return Object.entries(graph.nodes as Record<string, unknown>).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const node = raw as Record<string, unknown>;
    const parameters = Object.fromEntries(Object.entries(node.parameters as Record<string, unknown> | undefined ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
    return [{ id, name: typeof node.name === "string" ? node.name : id, parameters, dependsOn: Array.isArray(node.depends_on) ? node.depends_on.filter((item): item is string => typeof item === "string") : [] }];
  });
}

function targetId(nodes: GraphNode[]): string {
  const parents = new Set(nodes.flatMap((node) => node.dependsOn));
  return nodes.find((node) => !parents.has(node.id))?.id ?? nodes.at(-1)?.id ?? "";
}

function numeric(value: unknown): string {
  return typeof value === "number" ? String(value) : "unknown";
}

export function ShadowComparison({ graphId, client }: { graphId: string; client: ShadowComparisonClient }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedNode, setSelectedNode] = useState("");
  const [selectedParameter, setSelectedParameter] = useState("");
  const [candidateValue, setCandidateValue] = useState("");
  const [result, setResult] = useState<JsonObject | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let active = true;
    void client.getGraph(graphId).then((graph) => {
      if (!active) return;
      const next = graphNodes(graph);
      const editable = next.find((node) => Object.keys(node.parameters).length > 0);
      setNodes(next);
      setSelectedTarget(targetId(next));
      setSelectedNode(editable?.id ?? "");
      const parameter = editable ? Object.keys(editable.parameters)[0] ?? "" : "";
      setSelectedParameter(parameter);
      setCandidateValue(parameter && editable ? String(editable.parameters[parameter]) : "");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load graph for comparison.");
    });
    return () => { active = false; };
  }, [client, graphId]);

  const selected = nodes.find((node) => node.id === selectedNode);
  function chooseNode(id: string) {
    const node = nodes.find((item) => item.id === id);
    const parameter = node ? Object.keys(node.parameters)[0] ?? "" : "";
    setSelectedNode(id);
    setSelectedParameter(parameter);
    setCandidateValue(parameter && node ? String(node.parameters[parameter]) : "");
  }
  function chooseParameter(parameter: string) {
    setSelectedParameter(parameter);
    setCandidateValue(selected ? String(selected.parameters[parameter]) : "");
  }
  async function runComparison() {
    const value = Number(candidateValue);
    if (!selectedTarget || !selectedNode || !selectedParameter || !Number.isFinite(value)) {
      setError("Choose a target, a numeric factor parameter, and a finite candidate value.");
      return;
    }
    setRunning(true); setError("");
    try {
      setResult(await client.shadowSimulate(graphId, { target_node_id: selectedTarget, candidate_parameter_overrides: { [selectedNode]: { [selectedParameter]: value } } }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to run in-memory comparison."); }
    finally { setRunning(false); }
  }
  const active = result?.active_summary as JsonObject | undefined;
  const candidate = result?.candidate_summary as JsonObject | undefined;
  const limitations = Array.isArray(result?.limitations) ? result.limitations.filter((item): item is string => typeof item === "string") : [];
  return <section aria-label="Active versus candidate comparison">
    <h2>Active versus candidate</h2>
    <p>Compare one proposed parameter change in memory. It does not persist, activate, or overwrite the approved graph.</p>
    {nodes.length > 0 && <>
      <label>Target outcome<select aria-label="Target outcome" value={selectedTarget} onChange={(event) => setSelectedTarget(event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
      <label>Candidate factor<select aria-label="Candidate factor" value={selectedNode} onChange={(event) => chooseNode(event.target.value)}>{nodes.filter((node) => Object.keys(node.parameters).length > 0).map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
      <label>Parameter<select aria-label="Candidate parameter" value={selectedParameter} onChange={(event) => chooseParameter(event.target.value)}>{Object.keys(selected?.parameters ?? {}).map((parameter) => <option key={parameter} value={parameter}>{parameter}</option>)}</select></label>
      <label>Candidate value<input aria-label="Candidate value" type="number" value={candidateValue} onChange={(event) => setCandidateValue(event.target.value)} /></label>
      <button onClick={runComparison} disabled={running}>{running ? "Comparing in memory…" : "Run in-memory comparison"}</button>
    </>}
    {nodes.length === 0 && !error && <p role="alert">This graph has no editable numeric node parameters.</p>}
    {error && <p role="alert">{error}</p>}
    {active && candidate && <section aria-label="Comparison receipt"><h3>Comparison receipt</h3><p>Active median: {numeric(active.p50)}</p><p>Candidate median: {numeric(candidate.p50)}</p><p>Active mean: {numeric(active.mean)} · Candidate mean: {numeric(candidate.mean)}</p>{result?.active_graph_mutated === false && <p>Active graph unchanged.</p>}</section>}
    {(limitations.length > 0 || result) && <section aria-label="Comparison limitations"><h3>Limitations</h3><ul>{limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}<li>A distribution shift is structural impact, not evidence of improved forecast accuracy.</li></ul></section>}
  </section>;
}
