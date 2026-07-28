import { useEffect, useState } from "react";
import type { CandidateApprovalInput, CandidateProposalInput, JsonObject, ShadowSimulationInput, WorkspaceCandidateRevisionInput } from "../api/types";
import { DistributionInspector } from "../inspectors/DistributionInspector";

export interface ShadowComparisonClient {
  getGraph(graphId: string): Promise<JsonObject>;
  shadowSimulate(graphId: string, body: ShadowSimulationInput): Promise<JsonObject>;
  createCandidateProposal?(graphId: string, body: CandidateProposalInput): Promise<JsonObject>;
  approveCandidateProposal?(graphId: string, proposalId: string, body: CandidateApprovalInput): Promise<JsonObject>;
  approveProjectCandidateProposal?(projectId: string, proposalId: string, body: CandidateApprovalInput): Promise<JsonObject>;
  createCandidateRevision?(projectId: string, revision: WorkspaceCandidateRevisionInput): Promise<JsonObject>;
  listCandidateRevisions?(projectId: string): Promise<{ candidate_revisions: JsonObject[] }>;
}

interface GraphNode {
  id: string;
  name: string;
  family?: string;
  provenance: string;
  parameters: Record<string, number>;
  dependsOn: string[];
}

function graphNodes(graph: JsonObject): GraphNode[] {
  if (!graph.nodes || typeof graph.nodes !== "object" || Array.isArray(graph.nodes)) return [];
  return Object.entries(graph.nodes as Record<string, unknown>).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const node = raw as Record<string, unknown>;
    const parameters = Object.fromEntries(Object.entries(node.parameters as Record<string, unknown> | undefined ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
    return [{ id, name: typeof node.name === "string" ? node.name : id, family: typeof node.distribution_family === "string" ? node.distribution_family : undefined, provenance: typeof node.evidence_classification === "string" ? node.evidence_classification : "Not recorded on graph node", parameters, dependsOn: Array.isArray(node.depends_on) ? node.depends_on.filter((item): item is string => typeof item === "string") : [] }];
  });
}

function targetId(nodes: GraphNode[]): string {
  const parents = new Set(nodes.flatMap((node) => node.dependsOn));
  return nodes.find((node) => !parents.has(node.id))?.id ?? nodes.at(-1)?.id ?? "";
}

function affectedPath(nodes: GraphNode[], startId: string, endId: string): GraphNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  for (const node of nodes) for (const parent of node.dependsOn) children.set(parent, [...(children.get(parent) ?? []), node.id]);
  const queue: string[][] = [[startId]];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path.at(-1)!;
    if (current === endId) return path.flatMap((id) => byId.get(id) ?? []);
    if (visited.has(current)) continue;
    visited.add(current);
    for (const child of children.get(current) ?? []) queue.push([...path, child]);
  }
  return [];
}

function numeric(value: unknown): string {
  return typeof value === "number" || typeof value === "string" ? String(value) : "unknown";
}

const SUPPORT: Record<string, string> = {
  Normal: "real", LogNormal: "positive", Beta: "[0, 1]", Poisson: "non-negative integers",
  NegativeBinomial: "non-negative integers", Gamma: "positive", StudentT: "real", Deterministic: "one value",
};

export function ShadowComparison({ graphId, projectId, activeGraphVersion, client, onApproved }: { graphId: string; projectId?: string; activeGraphVersion?: number; client: ShadowComparisonClient; onApproved?: (project: JsonObject) => void }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedNode, setSelectedNode] = useState("");
  const [selectedParameter, setSelectedParameter] = useState("");
  const [candidateValue, setCandidateValue] = useState("");
  const [stagedOverrides, setStagedOverrides] = useState<Record<string, Record<string, number>>>({});
  const [stagedNodeStates, setStagedNodeStates] = useState<Record<string, "active" | "excluded">>({});
  const [result, setResult] = useState<JsonObject | null>(null);
  const [comparedOverrides, setComparedOverrides] = useState<Record<string, Record<string, number>> | null>(null);
  const [comparedTarget, setComparedTarget] = useState("");
  const [proposal, setProposal] = useState<JsonObject | null>(null);
  const [approver, setApprover] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [approval, setApproval] = useState<JsonObject | null>(null);
  const [candidateRevisions, setCandidateRevisions] = useState<JsonObject[]>([]);
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

  useEffect(() => {
    let active = true;
    if (!projectId || !client.listCandidateRevisions) return;
    void client.listCandidateRevisions(projectId).then((response) => {
      if (active) setCandidateRevisions(response.candidate_revisions);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load durable candidate revisions.");
    });
    return () => { active = false; };
  }, [client, projectId]);

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
  function addSelectedChange() {
    const value = Number(candidateValue);
    if (!selectedNode || !selectedParameter || !Number.isFinite(value)) {
      setError("Choose a numeric factor parameter before adding a candidate change.");
      return;
    }
    setError("");
    setStagedOverrides((current) => ({ ...current, [selectedNode]: { ...current[selectedNode], [selectedParameter]: value } }));
  }
  function removeStagedChange(nodeId: string, parameter: string) {
    setStagedOverrides((current) => {
      const next = { ...current, [nodeId]: { ...current[nodeId] } };
      delete next[nodeId][parameter];
      if (Object.keys(next[nodeId]).length === 0) delete next[nodeId];
      return next;
    });
  }
  function stageSelectedNodeState(state: "active" | "excluded") {
    if (!selectedNode) return;
    setStagedNodeStates((current) => ({ ...current, [selectedNode]: state }));
  }
  function removeStagedNodeState(nodeId: string) {
    setStagedNodeStates((current) => { const next = { ...current }; delete next[nodeId]; return next; });
  }
  async function runComparison() {
    const value = Number(candidateValue);
    if (!selectedTarget || !selectedNode || !selectedParameter || !Number.isFinite(value)) {
      setError("Choose a target, a numeric factor parameter, and a finite candidate value.");
      return;
    }
    setRunning(true); setError("");
    try {
      const overrides = Object.keys(stagedOverrides).length > 0 ? stagedOverrides : { [selectedNode]: { [selectedParameter]: value } };
      setResult(await client.shadowSimulate(graphId, { target_node_id: selectedTarget, candidate_parameter_overrides: overrides }));
      setComparedOverrides(overrides); setComparedTarget(selectedTarget); setProposal(null); setApproval(null); setReviewed(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to run in-memory comparison."); }
    finally { setRunning(false); }
  }
  const active = result?.active_summary as JsonObject | undefined;
  const candidate = result?.candidate_summary as JsonObject | undefined;
  const limitations = Array.isArray(result?.limitations) ? result.limitations.filter((item): item is string => typeof item === "string") : [];
  const comparedNode = comparedOverrides ? Object.keys(comparedOverrides)[0] ?? "" : "";
  const path = comparedNode && comparedTarget ? affectedPath(nodes, comparedNode, comparedTarget) : [];
  const stagedChanges = Object.entries(stagedOverrides).flatMap(([nodeId, parameters]) => Object.entries(parameters).map(([parameter, value]) => ({ nodeId, parameter, value, name: nodes.find((node) => node.id === nodeId)?.name ?? nodeId })));
  const proposalId = typeof proposal?.id === "string" ? proposal.id : "";
  const bindingHash = typeof proposal?.binding_hash === "string" ? proposal.binding_hash : "";
  const approvedProject = approval?.project && typeof approval.project === "object" && !Array.isArray(approval.project)
    ? approval.project as JsonObject
    : undefined;
  async function saveCandidate() {
    if (!client.createCandidateProposal || !comparedOverrides) return;
    setError("");
    try {
      const response = await client.createCandidateProposal(graphId, { candidate_parameter_overrides: comparedOverrides });
      const saved = response.proposal;
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Server did not return a candidate proposal.");
      setProposal(saved as JsonObject); setApproval(null); setReviewed(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save candidate for review."); }
  }
  async function saveCandidateRevision() {
    const parameterOverrides = comparedOverrides ?? stagedOverrides;
    if (!projectId || !activeGraphVersion || !client.createCandidateRevision || (!Object.keys(parameterOverrides).length && !Object.keys(stagedNodeStates).length)) return;
    setError("");
    try {
      const revision = await client.createCandidateRevision(projectId, {
        id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `candidate-revision-${Date.now()}`,
        base_graph_version: activeGraphVersion,
        candidate_parameter_overrides: parameterOverrides,
        candidate_node_state_overrides: stagedNodeStates,
      });
      setCandidateRevisions((current) => [...current, revision]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save durable candidate revision."); }
  }
  async function approveCandidate() {
    if ((!projectId || !client.approveProjectCandidateProposal) && !client.approveCandidateProposal) return;
    if (!proposalId || !bindingHash || !approver.trim() || !reviewed) return;
    setError("");
    try {
      const body = { approved_by: approver.trim(), binding_hash: bindingHash };
      const response = projectId && client.approveProjectCandidateProposal
        ? await client.approveProjectCandidateProposal(projectId, proposalId, body)
        : await client.approveCandidateProposal!(graphId, proposalId, body);
      setApproval(response);
      if (response.project && typeof response.project === "object" && !Array.isArray(response.project)) onApproved?.(response.project as JsonObject);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to approve this candidate version."); }
  }
  return <section aria-label="Active versus candidate comparison">
    <h2>Active versus candidate</h2>
    <p>Compare one proposed parameter change in memory. It does not persist, activate, or overwrite the approved graph.</p>
    {nodes.length > 0 && <>
      <label>Target outcome<select aria-label="Target outcome" value={selectedTarget} onChange={(event) => setSelectedTarget(event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
      <label>Candidate factor<select aria-label="Candidate factor" value={selectedNode} onChange={(event) => chooseNode(event.target.value)}>{nodes.filter((node) => Object.keys(node.parameters).length > 0).map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
      <label>Parameter<select aria-label="Candidate parameter" value={selectedParameter} onChange={(event) => chooseParameter(event.target.value)}>{Object.keys(selected?.parameters ?? {}).map((parameter) => <option key={parameter} value={parameter}>{parameter}</option>)}</select></label>
      <label>Candidate value<input aria-label="Candidate value" type="number" value={candidateValue} onChange={(event) => setCandidateValue(event.target.value)} /></label>
      <button onClick={addSelectedChange}>Add selected candidate change</button>
      <button onClick={() => stageSelectedNodeState("excluded")}>Exclude selected factor in candidate</button>
      <button onClick={() => stageSelectedNodeState("active")}>Include selected factor in candidate</button>
      <button onClick={runComparison} disabled={running}>{running ? "Comparing in memory…" : "Run in-memory comparison"}</button>
      <section aria-label="Candidate change set"><h3>Candidate change set</h3>{stagedChanges.length === 0 ? <p>No local candidate changes staged.</p> : <ul>{stagedChanges.map((change) => <li key={`${change.nodeId}-${change.parameter}`}>{change.name} · {change.parameter}: {change.value} <button onClick={() => removeStagedChange(change.nodeId, change.parameter)}>Remove {change.name} {change.parameter}</button></li>)}</ul>}</section>
      <section aria-label="Candidate structural change set"><h3>Candidate structural change set</h3>{Object.keys(stagedNodeStates).length === 0 ? <p>No local candidate node-state changes staged.</p> : <ul>{Object.entries(stagedNodeStates).map(([nodeId, state]) => <li key={nodeId}>{nodes.find((node) => node.id === nodeId)?.name ?? nodeId}: {state} <button onClick={() => removeStagedNodeState(nodeId)}>Remove {nodes.find((node) => node.id === nodeId)?.name ?? nodeId} state change</button></li>)}</ul>}<p>Node-state changes are revision-only and cannot be shadow-simulated or approved until a structural proposal contract exists.</p></section>
      {selected?.family && <DistributionInspector family={selected.family} parameters={selected.parameters} support={SUPPORT[selected.family] ?? "not recorded"} asOf="Not recorded on graph node" provenance={selected.provenance} />}
    </>}
    {nodes.length === 0 && !error && <p role="alert">This graph has no editable numeric node parameters.</p>}
    {error && <p role="alert">{error}</p>}
    {active && candidate && <section aria-label="Comparison receipt"><h3>Comparison receipt</h3><p>Active median: {numeric(active.p50)}</p><p>Candidate median: {numeric(candidate.p50)}</p><p>Active mean: {numeric(active.mean)} · Candidate mean: {numeric(candidate.mean)}</p>{path.length > 0 ? <p>Affected path: {path.map((node) => node.name).join(" → ")}</p> : <p>No directed path from the selected factor to the selected target was found.</p>}{result?.active_graph_mutated === false && <p>Active graph unchanged.</p>}</section>}
    {(comparedOverrides || Object.keys(stagedNodeStates).length > 0) && projectId && activeGraphVersion && client.createCandidateRevision && <button onClick={saveCandidateRevision}>Save durable candidate revision</button>}
    {candidateRevisions.length > 0 && <section aria-label="Persisted candidate revisions"><h3>Persisted candidate revisions</h3><ul>{candidateRevisions.map((revision) => { const overrides = revision.candidate_parameter_overrides as Record<string, Record<string, number>> | undefined; const nodeStates = revision.candidate_node_state_overrides as Record<string, string> | undefined; const changes = Object.values(overrides ?? {}).reduce((count, parameters) => count + Object.keys(parameters).length, 0); const structuralChanges = Object.keys(nodeStates ?? {}).length; return <li key={numeric(revision.id)}>Revision {numeric(revision.id)} · base graph version {numeric(revision.base_graph_version)} · {changes} parameter change{changes === 1 ? "" : "s"} · {structuralChanges} node-state change{structuralChanges === 1 ? "" : "s"}</li>; })}</ul><p>Candidate revision saved without changing the active graph.</p></section>}
    {result && client.createCandidateProposal && !proposal && <button onClick={saveCandidate}>Save candidate for review</button>}
    {proposal && <section aria-label="Candidate approval"><h3>Candidate approval</h3><p>Proposal {proposalId} · graph version {numeric(proposal.graph_version)}</p><p>Binding hash: {bindingHash || "unavailable"}</p><p>Approval applies this exact proposal to the active graph. Review the binding before continuing.</p><label>Approver identity<input aria-label="Approver identity" value={approver} onChange={(event) => setApprover(event.target.value)} /></label><label><input aria-label="I reviewed this exact binding" type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I reviewed this exact binding</label>{(client.approveCandidateProposal || (projectId && client.approveProjectCandidateProposal)) && <button onClick={approveCandidate} disabled={!approver.trim() || !reviewed || !bindingHash}>Approve candidate version</button>}</section>}
    {approval && <section aria-label="Approval receipt"><h3>Approval receipt: {numeric((approval.approval_receipt as JsonObject | undefined)?.id)}</h3><p>Approved graph version: {numeric((approval.graph as JsonObject | undefined)?.graph_version)}</p>{approvedProject && <p>Project lifecycle: {numeric(approvedProject.stage)} · active graph version {numeric(approvedProject.active_graph_version)}</p>}<p>The server validated the proposal binding before applying this version.</p></section>}
    {(limitations.length > 0 || result) && <section aria-label="Comparison limitations"><h3>Limitations</h3><ul>{limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}<li>A distribution shift is structural impact, not evidence of improved forecast accuracy.</li></ul></section>}
  </section>;
}
