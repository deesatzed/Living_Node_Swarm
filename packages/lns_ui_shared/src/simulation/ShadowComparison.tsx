import { useEffect, useState } from "react";
import type { CandidateApprovalInput, CandidateProposalInput, DeriveDistributionInput, DistributionStatisticsResult, ElicitDistributionInput, JsonObject, ShadowSimulationInput, StructuralProposalInput, StructuralShadowSimulationInput, WorkspaceCandidateRevisionInput } from "../api/types";
import { DistributionInspector } from "../inspectors/DistributionInspector";
import { compareCandidateRevisions, type RevisionDifference } from "../refinement/revisionComparison";

export interface ShadowComparisonClient {
  getGraph(graphId: string): Promise<JsonObject>;
  shadowSimulate(graphId: string, body: ShadowSimulationInput): Promise<JsonObject>;
  shadowStructuralProposal?(graphId: string, proposalId: string, body: StructuralShadowSimulationInput): Promise<JsonObject>;
  createCandidateProposal?(graphId: string, body: CandidateProposalInput): Promise<JsonObject>;
  approveCandidateProposal?(graphId: string, proposalId: string, body: CandidateApprovalInput): Promise<JsonObject>;
  approveProjectCandidateProposal?(projectId: string, proposalId: string, body: CandidateApprovalInput): Promise<JsonObject>;
  createStructuralProposal?(graphId: string, body: StructuralProposalInput): Promise<JsonObject>;
  approveStructuralProposal?(graphId: string, proposalId: string, body: CandidateApprovalInput): Promise<JsonObject>;
  approveProjectStructuralProposal?(projectId: string, proposalId: string, body: CandidateApprovalInput): Promise<JsonObject>;
  createCandidateRevision?(projectId: string, revision: WorkspaceCandidateRevisionInput): Promise<JsonObject>;
  listCandidateRevisions?(projectId: string): Promise<{ candidate_revisions: JsonObject[] }>;
  elicitDistribution?(body: ElicitDistributionInput): Promise<JsonObject>;
  deriveDistribution?(body: DeriveDistributionInput): Promise<JsonObject>;
  getDistributionStatistics?(familyId: string, parameters: Record<string, number>): Promise<DistributionStatisticsResult>;
  validateRelationships?(body: JsonObject): Promise<JsonObject>;
}

interface GraphNode {
  id: string;
  name: string;
  family?: string;
  provenance: string;
  asOf: string;
  units: string;
  support: string;
  parameters: Record<string, number>;
  dependsOn: string[];
}
interface StagingSnapshot { overrides: Record<string, Record<string, number>>; distributionSpecs: Record<string, JsonObject>; nodeStates: Record<string, "active" | "excluded">; relationshipStates: Record<string, "active" | "excluded">; relationshipContracts: JsonObject[]; newNodes: JsonObject[]; }

function snapshot(overrides: Record<string, Record<string, number>>, distributionSpecs: Record<string, JsonObject>, nodeStates: Record<string, "active" | "excluded">, relationshipStates: Record<string, "active" | "excluded">, relationshipContracts: JsonObject[], newNodes: JsonObject[]): StagingSnapshot {
  return { overrides: Object.fromEntries(Object.entries(overrides).map(([nodeId, parameters]) => [nodeId, { ...parameters }])), distributionSpecs: Object.fromEntries(Object.entries(distributionSpecs).map(([nodeId, spec]) => [nodeId, { ...spec }])), nodeStates: { ...nodeStates }, relationshipStates: { ...relationshipStates }, relationshipContracts: relationshipContracts.map((relationship) => ({ ...relationship })), newNodes: newNodes.map((node) => ({ ...node, parameters: node.parameters && typeof node.parameters === "object" ? { ...(node.parameters as JsonObject) } : node.parameters })) };
}

function elicitedOverrides(node: GraphNode, spec: JsonObject): Record<string, number> | null {
  const parameterValues = Array.isArray(spec.parameters) ? Object.fromEntries(spec.parameters.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const parameter = item as JsonObject;
    return typeof parameter.id === "string" && typeof parameter.value === "number" ? [[parameter.id, parameter.value] as const] : [];
  })) : {};
  if (node.family === "Normal" && typeof parameterValues.loc === "number" && typeof parameterValues.scale === "number") return "mu" in node.parameters ? { mu: parameterValues.loc, sigma: parameterValues.scale } : { loc: parameterValues.loc, scale: parameterValues.scale };
  if (node.family === "LogNormal" && typeof parameterValues.log_loc === "number" && typeof parameterValues.log_scale === "number") return "mu" in node.parameters ? { mu: parameterValues.log_loc, sigma: parameterValues.log_scale } : { log_loc: parameterValues.log_loc, log_scale: parameterValues.log_scale };
  if (node.family === "Beta" && typeof parameterValues.alpha === "number" && typeof parameterValues.beta === "number") return "a" in node.parameters ? { a: parameterValues.alpha, b: parameterValues.beta } : { alpha: parameterValues.alpha, beta: parameterValues.beta };
  if (node.family === "NegativeBinomial" && typeof parameterValues.mean === "number" && typeof parameterValues.dispersion === "number" && "n" in node.parameters && "p" in node.parameters) return { n: parameterValues.dispersion, p: parameterValues.dispersion / (parameterValues.dispersion + parameterValues.mean) };
  if (node.family && spec.family_id === node.family && Object.keys(node.parameters).every((parameter) => typeof parameterValues[parameter] === "number")) return Object.fromEntries(Object.keys(node.parameters).map((parameter) => [parameter, parameterValues[parameter]]));
  return null;
}

const INTUITIVE_INPUTS: Record<string, Array<{ id: string; label: string }>> = {
  Beta: [{ id: "mean", label: "mean" }, { id: "concentration", label: "concentration" }],
  Poisson: [{ id: "expected_count", label: "expected count" }],
  NegativeBinomial: [{ id: "expected_count", label: "expected count" }, { id: "dispersion", label: "dispersion" }],
  Gamma: [{ id: "mean", label: "mean" }, { id: "standard_deviation", label: "standard deviation" }],
  StudentT: [{ id: "location", label: "location" }, { id: "scale", label: "scale" }, { id: "degrees_of_freedom", label: "degrees of freedom" }],
  Deterministic: [{ id: "value", label: "value" }],
};

function graphNodes(graph: JsonObject): GraphNode[] {
  if (!graph.nodes || typeof graph.nodes !== "object" || Array.isArray(graph.nodes)) return [];
  return Object.entries(graph.nodes as Record<string, unknown>).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const node = raw as Record<string, unknown>;
    const parameters = Object.fromEntries(Object.entries(node.parameters as Record<string, unknown> | undefined ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
    const distributionSpec = node.distribution_spec && typeof node.distribution_spec === "object" && !Array.isArray(node.distribution_spec) ? node.distribution_spec as JsonObject : undefined;
    const supportLower = typeof node.support_lower === "number" ? node.support_lower : typeof distributionSpec?.support_lower === "number" ? distributionSpec.support_lower : undefined;
    const supportUpper = typeof node.support_upper === "number" ? node.support_upper : typeof distributionSpec?.support_upper === "number" ? distributionSpec.support_upper : undefined;
    const support = supportLower !== undefined || supportUpper !== undefined ? `${supportLower ?? "−∞"} to ${supportUpper ?? "∞"}` : SUPPORT[typeof node.distribution_family === "string" ? node.distribution_family : ""] ?? "Not recorded on graph node";
    const evidenceClaims = Array.isArray(distributionSpec?.evidence_claim_ids) ? distributionSpec.evidence_claim_ids.filter((claim): claim is string => typeof claim === "string" && Boolean(claim.trim())) : [];
    const provenance = distributionSpec
      ? [
        typeof distributionSpec.elicitation_method === "string" ? distributionSpec.elicitation_method : "method not recorded",
        typeof distributionSpec.confidence_rationale === "string" ? `Confidence: ${distributionSpec.confidence_rationale}` : "confidence rationale not recorded",
        `Evidence claims: ${evidenceClaims.length ? evidenceClaims.join(", ") : "none recorded"}`,
      ].join(" · ")
      : typeof node.evidence_classification === "string" ? node.evidence_classification : "Not recorded on graph node";
    return [{ id, name: typeof node.name === "string" ? node.name : id, family: typeof node.distribution_family === "string" ? node.distribution_family : undefined, provenance, asOf: typeof distributionSpec?.as_of === "string" ? distributionSpec.as_of : "Not recorded on graph node", units: typeof node.units === "string" ? node.units : "Not recorded on graph node", support, parameters, dependsOn: Array.isArray(node.depends_on) ? node.depends_on.filter((item): item is string => typeof item === "string") : [] }];
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
  const [stagedDistributionSpecs, setStagedDistributionSpecs] = useState<Record<string, JsonObject>>({});
  const [elicitationMedian, setElicitationMedian] = useState("1");
  const [elicitationP90, setElicitationP90] = useState("2");
  const [elicitationAsOf, setElicitationAsOf] = useState("2026-07-28T00:00:00Z");
  const [elicitationConfidence, setElicitationConfidence] = useState("Initial operator range; requires evidence review.");
  const [elicitationReceipt, setElicitationReceipt] = useState<JsonObject | null>(null);
  const [derivationValues, setDerivationValues] = useState<Record<string, string>>({});
  const [stagedNodeStates, setStagedNodeStates] = useState<Record<string, "active" | "excluded">>({});
  const [selectedRelationship, setSelectedRelationship] = useState("");
  const [stagedRelationshipStates, setStagedRelationshipStates] = useState<Record<string, "active" | "excluded">>({});
  const [activeRelationshipIdsByEdge, setActiveRelationshipIdsByEdge] = useState<Record<string, string>>({});
  const [stagedRelationshipContracts, setStagedRelationshipContracts] = useState<JsonObject[]>([]);
  const [relationshipType, setRelationshipType] = useState("scenario_assumption");
  const [relationshipTransform, setRelationshipTransform] = useState("affine");
  const [relationshipSourceUnit, setRelationshipSourceUnit] = useState("index");
  const [relationshipTargetUnit, setRelationshipTargetUnit] = useState("index");
  const [relationshipSign, setRelationshipSign] = useState("positive");
  const [relationshipLagPeriods, setRelationshipLagPeriods] = useState("0");
  const [relationshipLagUnit, setRelationshipLagUnit] = useState("month");
  const [relationshipCoefficientUnits, setRelationshipCoefficientUnits] = useState("1");
  const [relationshipCoefficient, setRelationshipCoefficient] = useState("1");
  const [relationshipEvidenceClaimIds, setRelationshipEvidenceClaimIds] = useState("");
  const [proposedRelationshipParent, setProposedRelationshipParent] = useState("");
  const [proposedRelationshipChild, setProposedRelationshipChild] = useState("");
  const [stagedNewNodes, setStagedNewNodes] = useState<JsonObject[]>([]);
  const [newNodeId, setNewNodeId] = useState("");
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeLocation, setNewNodeLocation] = useState("0");
  const [newNodeScale, setNewNodeScale] = useState("1");
  const [stagingHistory, setStagingHistory] = useState<StagingSnapshot[]>([]);
  const [stagingRedo, setStagingRedo] = useState<StagingSnapshot[]>([]);
  const [result, setResult] = useState<JsonObject | null>(null);
  const [comparedOverrides, setComparedOverrides] = useState<Record<string, Record<string, number>> | null>(null);
  const [comparedTarget, setComparedTarget] = useState("");
  const [proposal, setProposal] = useState<JsonObject | null>(null);
  const [approver, setApprover] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [approval, setApproval] = useState<JsonObject | null>(null);
  const [candidateRevisions, setCandidateRevisions] = useState<JsonObject[]>([]);
  const [baselineRevisionId, setBaselineRevisionId] = useState("");
  const [comparedRevisionId, setComparedRevisionId] = useState("");
  const [revisionComparison, setRevisionComparison] = useState<{ baseline: JsonObject; compared: JsonObject; differences: RevisionDifference[] } | null>(null);
  const [revisionStatus, setRevisionStatus] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [derived, setDerived] = useState<DistributionStatisticsResult | null>(null);
  const [relationshipValidation, setRelationshipValidation] = useState<JsonObject | null>(null);
  const [structuralProposal, setStructuralProposal] = useState<JsonObject | null>(null);
  const [structuralApproval, setStructuralApproval] = useState<JsonObject | null>(null);
  const [structuralComparison, setStructuralComparison] = useState<JsonObject | null>(null);
  const [structuralComparing, setStructuralComparing] = useState(false);
  const [structuralApprover, setStructuralApprover] = useState("");
  const [structuralReviewed, setStructuralReviewed] = useState(false);

  useEffect(() => {
    let active = true;
    void client.getGraph(graphId).then((graph) => {
      if (!active) return;
      const next = graphNodes(graph);
      const activeRelationships = graph.relationships && typeof graph.relationships === "object" && !Array.isArray(graph.relationships)
        ? Object.values(graph.relationships as Record<string, unknown>).flatMap((raw) => {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
          const relationship = raw as JsonObject;
          return relationship.state === "active" && typeof relationship.id === "string" && typeof relationship.parent_node_id === "string" && typeof relationship.child_node_id === "string"
            ? [[`${relationship.parent_node_id}:${relationship.child_node_id}`, relationship.id] as const] : [];
        }) : [];
      setActiveRelationshipIdsByEdge(Object.fromEntries(activeRelationships));
      const editable = next.find((node) => Object.keys(node.parameters).length > 0);
      setNodes(next);
      setSelectedTarget(targetId(next));
      setSelectedRelationship(next.flatMap((node) => node.dependsOn.map((parent) => `${parent}:${node.id}`))[0] ?? "");
      const firstRelationship = next.flatMap((node) => node.dependsOn.map((parent) => `${parent}:${node.id}`))[0] ?? "";
      const [firstParent, firstChild] = firstRelationship.split(":");
      setProposedRelationshipParent(firstParent || next[0]?.id || "");
      setProposedRelationshipChild(firstChild || next[1]?.id || "");
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
  useEffect(() => {
    let active = true;
    setDerived(null);
    if (!selected?.family || !client.getDistributionStatistics) return;
    void client.getDistributionStatistics(selected.family, selected.parameters).then((next) => {
      if (active) setDerived(next);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [client, selected]);
  function captureStaging() { setStagingHistory((current) => [...current, snapshot(stagedOverrides, stagedDistributionSpecs, stagedNodeStates, stagedRelationshipStates, stagedRelationshipContracts, stagedNewNodes)]); setStagingRedo([]); }
  function restoreStaging(next: StagingSnapshot) { setStagedOverrides(next.overrides); setStagedDistributionSpecs(next.distributionSpecs); setStagedNodeStates(next.nodeStates); setStagedRelationshipStates(next.relationshipStates); setStagedRelationshipContracts(next.relationshipContracts); setStagedNewNodes(next.newNodes); setRelationshipValidation(null); setStructuralProposal(null); setStructuralApproval(null); setStructuralComparison(null); }
  function undoStaging() { const previous = stagingHistory.at(-1); if (!previous) return; setStagingHistory((current) => current.slice(0, -1)); setStagingRedo((current) => [...current, snapshot(stagedOverrides, stagedDistributionSpecs, stagedNodeStates, stagedRelationshipStates, stagedRelationshipContracts, stagedNewNodes)]); restoreStaging(previous); }
  function redoStaging() { const next = stagingRedo.at(-1); if (!next) return; setStagingRedo((current) => current.slice(0, -1)); setStagingHistory((current) => [...current, snapshot(stagedOverrides, stagedDistributionSpecs, stagedNodeStates, stagedRelationshipStates, stagedRelationshipContracts, stagedNewNodes)]); restoreStaging(next); }
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
    captureStaging();
    setStagedOverrides((current) => ({ ...current, [selectedNode]: { ...current[selectedNode], [selectedParameter]: value } }));
  }
  function removeStagedChange(nodeId: string, parameter: string) {
    captureStaging();
    setStagedOverrides((current) => {
      const next = { ...current, [nodeId]: { ...current[nodeId] } };
      delete next[nodeId][parameter];
      if (Object.keys(next[nodeId]).length === 0) delete next[nodeId];
      return next;
    });
  }
  function stageSelectedNodeState(state: "active" | "excluded") {
    if (!selectedNode) return;
    captureStaging();
    setStagedNodeStates((current) => ({ ...current, [selectedNode]: state }));
  }
  function removeStagedNodeState(nodeId: string) {
    captureStaging();
    setStagedNodeStates((current) => { const next = { ...current }; delete next[nodeId]; return next; });
  }
  function stageSelectedRelationshipState(state: "active" | "excluded") { if (selectedRelationship) { captureStaging(); setStagedRelationshipStates((current) => ({ ...current, [selectedRelationship]: state })); } }
  function removeStagedRelationshipState(relationship: string) { captureStaging(); setStagedRelationshipStates((current) => { const next = { ...current }; delete next[relationship]; return next; }); }
  function stageRelationshipContract() {
    const parentNodeId = proposedRelationshipParent;
    const childNodeId = proposedRelationshipChild;
    const lagPeriods = Number(relationshipLagPeriods);
    const coefficient = Number(relationshipCoefficient);
    if (!parentNodeId || !childNodeId || parentNodeId === childNodeId || !Number.isFinite(coefficient) || !Number.isInteger(lagPeriods) || lagPeriods < 0 || !relationshipSourceUnit.trim() || !relationshipTargetUnit.trim() || !relationshipCoefficientUnits.trim()) { setError("Choose distinct relationship factors and provide a finite coefficient, relationship units, and a non-negative whole lag."); return; }
    const id = `proposal-${parentNodeId}-to-${childNodeId}`;
    const evidenceClaimIds = [...new Set(relationshipEvidenceClaimIds.split(",").map((claimId) => claimId.trim()).filter(Boolean))];
    const contract: JsonObject = { id, parent_node_id: parentNodeId, child_node_id: childNodeId, relationship_type: relationshipType, transform: relationshipTransform, source_unit: relationshipSourceUnit.trim(), target_unit: relationshipTargetUnit.trim(), sign: relationshipSign, lag_periods: lagPeriods, coefficient_units: relationshipCoefficientUnits.trim(), coefficient_parameters: [{ id: "coefficient", value: coefficient }], evidence_claim_ids: evidenceClaimIds, state: "proposed" };
    if (lagPeriods > 0) contract.lag_unit = relationshipLagUnit;
    captureStaging(); setStagedRelationshipContracts((current) => [...current.filter((item) => item.id !== id), contract]); setRelationshipValidation(null); setStructuralProposal(null); setStructuralApproval(null); setStructuralComparison(null); setError("");
  }
  function removeStagedRelationshipContract(id: string) { captureStaging(); setStagedRelationshipContracts((current) => current.filter((relationship) => relationship.id !== id)); setRelationshipValidation(null); setStructuralProposal(null); setStructuralApproval(null); setStructuralComparison(null); }
  async function validateRelationshipContracts() {
    if (!client.validateRelationships || stagedRelationshipContracts.length === 0) return;
    try { setError(""); setRelationshipValidation(await client.validateRelationships({ relationships: stagedRelationshipContracts })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to validate proposed relationships."); }
  }
  async function createStructuralProposal() {
    const relationshipRemovalIds = Object.entries(stagedRelationshipStates)
      .filter(([, state]) => state === "excluded")
      .flatMap(([edge]) => activeRelationshipIdsByEdge[edge] ?? []);
    const excludedNodeIds = Object.entries(stagedNodeStates)
      .filter(([, state]) => state === "excluded")
      .map(([nodeId]) => nodeId);
    const retirementEdges = excludedNodeIds.flatMap((nodeId) => nodes.flatMap((child) => child.dependsOn
      .filter((parent) => parent === nodeId || child.id === nodeId)
      .map((parent) => `${parent}:${child.id}`)));
    const incompleteRetirement = excludedNodeIds.find((nodeId) => nodeId === selectedTarget || retirementEdges
      .filter((edge) => edge.startsWith(`${nodeId}:`) || edge.endsWith(`:${nodeId}`))
      .some((edge) => !activeRelationshipIdsByEdge[edge]));
    if (incompleteRetirement) { setError(`Node exclusion for ${incompleteRetirement} needs a non-target node with complete persisted incident relationship metadata.`); return; }
    const retiredNodeIds = excludedNodeIds;
    const removedRelationshipIds = [...new Set([...relationshipRemovalIds, ...retirementEdges.map((edge) => activeRelationshipIdsByEdge[edge]).filter(Boolean)])];
    if (!client.createStructuralProposal || (stagedRelationshipContracts.length === 0 && removedRelationshipIds.length === 0 && retiredNodeIds.length === 0)) return;
    setError("");
    try {
      const response = await client.createStructuralProposal(graphId, { relationships: stagedRelationshipContracts, removed_relationship_ids: removedRelationshipIds, retired_node_ids: retiredNodeIds, target_node_id: selectedTarget });
      const saved = response.proposal;
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Server did not return a structural proposal.");
      setStructuralProposal(saved as JsonObject); setStructuralApproval(null); setStructuralComparison(null); setStructuralReviewed(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create structural proposal."); }
  }
  async function approveStructuralProposal() {
    const proposalId = typeof structuralProposal?.id === "string" ? structuralProposal.id : "";
    const bindingHash = typeof structuralProposal?.binding_hash === "string" ? structuralProposal.binding_hash : "";
    if (!(client.approveStructuralProposal || (projectId && client.approveProjectStructuralProposal)) || !proposalId || !bindingHash || !structuralApprover.trim() || !structuralReviewed) return;
    setError("");
    try {
      const body = { approved_by: structuralApprover.trim(), binding_hash: bindingHash };
      const response = projectId && client.approveProjectStructuralProposal
        ? await client.approveProjectStructuralProposal(projectId, proposalId, body)
        : await client.approveStructuralProposal!(graphId, proposalId, body);
      setStructuralApproval(response); setStructuralComparison(null); setStructuralProposal(null); setStructuralReviewed(false); setStructuralApprover("");
      setStagedRelationshipContracts([]); setStagedRelationshipStates({}); setRelationshipValidation(null);
      if (response.project && typeof response.project === "object" && !Array.isArray(response.project)) onApproved?.(response.project as JsonObject);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to approve structural proposal."); }
  }
  async function runStructuralComparison() {
    const proposalId = typeof structuralProposal?.id === "string" ? structuralProposal.id : "";
    if (!client.shadowStructuralProposal || !proposalId || !selectedTarget) return;
    setStructuralComparing(true); setError("");
    try { setStructuralComparison(await client.shadowStructuralProposal(graphId, proposalId, { target_node_id: selectedTarget })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to run structural in-memory comparison."); }
    finally { setStructuralComparing(false); }
  }
  function stageNewNode() {
    const location = Number(newNodeLocation); const scale = Number(newNodeScale); const id = newNodeId.trim(); const name = newNodeName.trim();
    if (!id || !name || !/^[a-z][a-z0-9_]*$/.test(id) || !Number.isFinite(location) || !Number.isFinite(scale) || scale <= 0 || nodes.some((node) => node.id === id) || stagedNewNodes.some((node) => node.id === id)) { setError("Use a unique snake_case factor ID, a name, a finite location, and a positive scale."); return; }
    captureStaging(); setStagedNewNodes((current) => [...current, { id, name, description: "Operator-staged proposed factor.", distribution_family: "Normal", parameters: { mu: location, sigma: scale }, depends_on: [], transform: "none", status: "proposed", requires_human_approval: true, created_by: "operator_candidate", last_updated_by: "operator_candidate", discovery_rationale: "Added in Edit as a proposed factor." }]); setNewNodeId(""); setNewNodeName(""); setError("");
  }
  function removeStagedNewNode(id: string) { captureStaging(); setStagedNewNodes((current) => current.filter((node) => node.id !== id)); }
  async function stageElicitedDistribution() {
    if (!selected || !client.elicitDistribution || (selected.family !== "Normal" && selected.family !== "LogNormal")) return;
    const median = Number(elicitationMedian); const p90 = Number(elicitationP90);
    if (!Number.isFinite(median) || !Number.isFinite(p90) || median <= 0 || p90 <= median || !elicitationAsOf.trim() || !elicitationConfidence.trim()) { setError("Provide a positive median, a larger P90, an as-of timestamp, and a confidence rationale."); return; }
    setError("");
    try {
      const response = await client.elicitDistribution({ id: `${selected.id}-median-p90`, family_id: selected.family, median, p90, as_of: elicitationAsOf.trim(), confidence_rationale: elicitationConfidence.trim() });
      const spec = response.distribution_spec;
      if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new Error("Server did not return an elicited distribution specification.");
      const typedSpec = spec as JsonObject;
      const overrides = elicitedOverrides(selected, typedSpec);
      if (!overrides) throw new Error("The elicited distribution does not match this factor's persisted parameterization.");
      captureStaging(); setStagedDistributionSpecs((current) => ({ ...current, [selected.id]: typedSpec })); setStagedOverrides((current) => ({ ...current, [selected.id]: { ...current[selected.id], ...overrides } })); setElicitationReceipt(response.receipt && typeof response.receipt === "object" && !Array.isArray(response.receipt) ? response.receipt as JsonObject : null); setResult(null); setComparedOverrides(null); setProposal(null); setApproval(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to elicit a candidate distribution."); }
  }
  async function stageDerivedDistribution() {
    if (!selected?.family || !client.deriveDistribution || !INTUITIVE_INPUTS[selected.family]) return;
    const values = Object.fromEntries(INTUITIVE_INPUTS[selected.family].map(({ id }) => [id, Number(derivationValues[id])]));
    if (Object.values(values).some((value) => !Number.isFinite(value)) || !elicitationAsOf.trim() || !elicitationConfidence.trim()) { setError("Provide finite distribution inputs, an as-of timestamp, and a confidence rationale."); return; }
    setError("");
    try {
      const response = await client.deriveDistribution({ id: `${selected.id}-intuitive-prior`, family_id: selected.family as DeriveDistributionInput["family_id"], values, as_of: elicitationAsOf.trim(), confidence_rationale: elicitationConfidence.trim() });
      const spec = response.distribution_spec;
      if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new Error("Server did not return a derived distribution specification.");
      const typedSpec = spec as JsonObject; const overrides = elicitedOverrides(selected, typedSpec);
      if (!overrides) throw new Error("The derived distribution does not match this factor's persisted parameterization.");
      captureStaging(); setStagedDistributionSpecs((current) => ({ ...current, [selected.id]: typedSpec })); setStagedOverrides((current) => ({ ...current, [selected.id]: { ...current[selected.id], ...overrides } })); setElicitationReceipt(response.receipt && typeof response.receipt === "object" && !Array.isArray(response.receipt) ? response.receipt as JsonObject : null); setResult(null); setComparedOverrides(null); setProposal(null); setApproval(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to derive a candidate distribution."); }
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
  const structuralActive = structuralComparison?.active_summary as JsonObject | undefined;
  const structuralCandidate = structuralComparison?.candidate_summary as JsonObject | undefined;
  const structuralLimitations = Array.isArray(structuralComparison?.limitations) ? structuralComparison.limitations.filter((item): item is string => typeof item === "string") : [];
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
      const response = await client.createCandidateProposal(graphId, {
        candidate_parameter_overrides: comparedOverrides,
        ...(Object.keys(stagedDistributionSpecs).length > 0 ? { candidate_distribution_specs: stagedDistributionSpecs } : {}),
      });
      const saved = response.proposal;
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Server did not return a candidate proposal.");
      setProposal(saved as JsonObject); setApproval(null); setReviewed(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save candidate for review."); }
  }
  async function saveCandidateRevision() {
    const parameterOverrides = comparedOverrides ?? stagedOverrides;
    if (!projectId || !activeGraphVersion || !client.createCandidateRevision || (!Object.keys(parameterOverrides).length && !Object.keys(stagedDistributionSpecs).length && !Object.keys(stagedNodeStates).length && !Object.keys(stagedRelationshipStates).length && !stagedRelationshipContracts.length && !stagedNewNodes.length)) return;
    setError("");
    try {
      const revision = await client.createCandidateRevision(projectId, {
        id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `candidate-revision-${Date.now()}`,
        base_graph_version: activeGraphVersion,
        candidate_parameter_overrides: parameterOverrides,
        ...(Object.keys(stagedDistributionSpecs).length > 0 ? { candidate_distribution_specs: stagedDistributionSpecs } : {}),
        candidate_node_state_overrides: stagedNodeStates,
        candidate_relationship_state_overrides: stagedRelationshipStates,
        candidate_relationship_contracts: stagedRelationshipContracts,
        candidate_new_nodes: stagedNewNodes,
      });
      setCandidateRevisions((current) => [...current, revision]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save durable candidate revision."); }
  }
  function loadCandidateRevision(revision: JsonObject) {
    if (typeof activeGraphVersion !== "number" || revision.base_graph_version !== activeGraphVersion) { setError(`Revision ${numeric(revision.id)} is based on graph version ${numeric(revision.base_graph_version)} and cannot be loaded onto active graph version ${numeric(activeGraphVersion)}.`); return; }
    const parameterOverrides = revision.candidate_parameter_overrides && typeof revision.candidate_parameter_overrides === "object" && !Array.isArray(revision.candidate_parameter_overrides) ? revision.candidate_parameter_overrides as Record<string, Record<string, number>> : {};
    const distributionSpecs = revision.candidate_distribution_specs && typeof revision.candidate_distribution_specs === "object" && !Array.isArray(revision.candidate_distribution_specs) ? revision.candidate_distribution_specs as Record<string, JsonObject> : {};
    const nodeStates = revision.candidate_node_state_overrides && typeof revision.candidate_node_state_overrides === "object" && !Array.isArray(revision.candidate_node_state_overrides) ? revision.candidate_node_state_overrides as Record<string, "active" | "excluded"> : {};
    const relationshipStates = revision.candidate_relationship_state_overrides && typeof revision.candidate_relationship_state_overrides === "object" && !Array.isArray(revision.candidate_relationship_state_overrides) ? revision.candidate_relationship_state_overrides as Record<string, "active" | "excluded"> : {};
    const relationshipContracts = Array.isArray(revision.candidate_relationship_contracts) ? revision.candidate_relationship_contracts.filter((relationship): relationship is JsonObject => Boolean(relationship && typeof relationship === "object" && !Array.isArray(relationship))) : [];
    const newNodes = Array.isArray(revision.candidate_new_nodes) ? revision.candidate_new_nodes.filter((node): node is JsonObject => Boolean(node && typeof node === "object" && !Array.isArray(node))) : [];
    setStagedOverrides(parameterOverrides); setStagedDistributionSpecs(distributionSpecs); setStagedNodeStates(nodeStates); setStagedRelationshipStates(relationshipStates); setStagedRelationshipContracts(relationshipContracts); setStagedNewNodes(newNodes); setStagingHistory([]); setStagingRedo([]); setRelationshipValidation(null); setResult(null); setComparedOverrides(null); setProposal(null); setApproval(null); setReviewed(false); setError(""); setRevisionStatus(`Revision ${numeric(revision.id)} loaded into local staging. The active graph is unchanged.`);
  }
  function compareDurableRevisions() {
    const baseline = candidateRevisions.find((revision) => revision.id === baselineRevisionId);
    const compared = candidateRevisions.find((revision) => revision.id === comparedRevisionId);
    if (!baseline || !compared || baseline.id === compared.id) { setError("Choose two distinct durable candidate revisions to compare."); return; }
    if (baseline.base_graph_version !== compared.base_graph_version) { setError(`Revisions ${numeric(baseline.id)} and ${numeric(compared.id)} cannot be compared because their base graph versions differ.`); return; }
    setError("");
    setRevisionComparison({ baseline, compared, differences: compareCandidateRevisions(baseline, compared) });
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
      if (response.graph && typeof response.graph === "object" && !Array.isArray(response.graph) && "nodes" in response.graph) {
        setNodes(graphNodes(response.graph as JsonObject));
      }
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
      <button onClick={undoStaging} disabled={stagingHistory.length === 0}>Undo staged change</button><button onClick={redoStaging} disabled={stagingRedo.length === 0}>Redo staged change</button>
      <button onClick={() => stageSelectedNodeState("excluded")}>Exclude selected factor in candidate</button>
      <button onClick={() => stageSelectedNodeState("active")}>Include selected factor in candidate</button>
      <button onClick={runComparison} disabled={running}>{running ? "Comparing in memory…" : "Run in-memory comparison"}</button>
      <section aria-label="Candidate change set"><h3>Candidate change set</h3>{stagedChanges.length === 0 ? <p>No local candidate changes staged.</p> : <ul>{stagedChanges.map((change) => <li key={`${change.nodeId}-${change.parameter}`}>{change.name} · {change.parameter}: {change.value} <button onClick={() => removeStagedChange(change.nodeId, change.parameter)}>Remove {change.name} {change.parameter}</button></li>)}</ul>}</section>
      {selected && (selected.family === "Normal" || selected.family === "LogNormal") && client.elicitDistribution && <section aria-label="Distribution quantile elicitation"><h3>Distribution quantile elicitation</h3><p>Use a median and P90 to derive this factor’s existing {selected.family} parameters. This creates a non-active candidate distribution with its method and rationale.</p><label>Elicitation median<input aria-label="Elicitation median" type="number" min="0" value={elicitationMedian} onChange={(event) => setElicitationMedian(event.target.value)} /></label><label>Elicitation P90<input aria-label="Elicitation P90" type="number" min="0" value={elicitationP90} onChange={(event) => setElicitationP90(event.target.value)} /></label><label>Elicitation as of<input aria-label="Elicitation as of" value={elicitationAsOf} onChange={(event) => setElicitationAsOf(event.target.value)} /></label><label>Elicitation confidence rationale<input aria-label="Elicitation confidence rationale" value={elicitationConfidence} onChange={(event) => setElicitationConfidence(event.target.value)} /></label><button onClick={stageElicitedDistribution}>Stage elicited distribution candidate</button>{elicitationReceipt && <section aria-label="Elicited distribution candidate"><h4>Elicited distribution candidate</h4><p>Method: {numeric(elicitationReceipt.method)}. The active graph is unchanged.</p><ul>{Array.isArray(elicitationReceipt.limitations) ? elicitationReceipt.limitations.map((limitation) => <li key={numeric(limitation)}>{numeric(limitation)}</li>) : null}</ul></section>}{Object.keys(stagedDistributionSpecs).length > 0 && <p>This candidate carries distribution provenance and must be included in the exact review binding.</p>}</section>}
      {selected?.family && INTUITIVE_INPUTS[selected.family] && client.deriveDistribution && <section aria-label="Distribution intuitive derivation"><h3>Distribution intuitive derivation</h3><p>Use named inputs for this factor’s existing {selected.family} family. The server derives canonical parameters and returns read-only statistics.</p>{INTUITIVE_INPUTS[selected.family].map(({ id, label }) => <label key={id}>{selected.family} {label}<input aria-label={`${selected.family} ${label}`} type="number" value={derivationValues[id] ?? ""} onChange={(event) => setDerivationValues((current) => ({ ...current, [id]: event.target.value }))} /></label>)}<label>Derivation as of<input aria-label="Derivation as of" value={elicitationAsOf} onChange={(event) => setElicitationAsOf(event.target.value)} /></label><label>Derivation confidence rationale<input aria-label="Derivation confidence rationale" value={elicitationConfidence} onChange={(event) => setElicitationConfidence(event.target.value)} /></label><button onClick={stageDerivedDistribution}>Stage derived distribution candidate</button>{elicitationReceipt && <section aria-label="Derived distribution candidate"><h4>Derived distribution candidate</h4><p>Method: {numeric(elicitationReceipt.method)}. The active graph is unchanged.</p><ul>{Array.isArray(elicitationReceipt.limitations) ? elicitationReceipt.limitations.map((limitation) => <li key={numeric(limitation)}>{numeric(limitation)}</li>) : null}</ul></section>}{Object.keys(stagedDistributionSpecs).length > 0 && <p>This candidate carries distribution provenance and must be included in the exact review binding.</p>}</section>}
      <section aria-label="Candidate structural change set"><h3>Candidate structural change set</h3>{Object.keys(stagedNodeStates).length === 0 ? <p>No local candidate node-state changes staged.</p> : <ul>{Object.entries(stagedNodeStates).map(([nodeId, state]) => <li key={nodeId}>{nodes.find((node) => node.id === nodeId)?.name ?? nodeId}: {state} <button onClick={() => removeStagedNodeState(nodeId)}>Remove {nodes.find((node) => node.id === nodeId)?.name ?? nodeId} state change</button></li>)}</ul>}<p>Node-state changes are revision-only and cannot be shadow-simulated or approved until a structural proposal contract exists.</p></section>
      <section aria-label="Candidate relationship change set"><h3>Candidate relationship change set</h3><label>Candidate dependency<select aria-label="Candidate dependency" value={selectedRelationship} onChange={(event) => setSelectedRelationship(event.target.value)}>{nodes.flatMap((node) => node.dependsOn.map((parent) => <option key={`${parent}:${node.id}`} value={`${parent}:${node.id}`}>{nodes.find((item) => item.id === parent)?.name ?? parent} → {node.name}</option>))}</select></label><button onClick={() => stageSelectedRelationshipState("excluded")}>Exclude selected dependency in candidate</button><button onClick={() => stageSelectedRelationshipState("active")}>Include selected dependency in candidate</button>{Object.keys(stagedRelationshipStates).length === 0 ? <p>No local candidate relationship-state changes staged.</p> : <ul>{Object.entries(stagedRelationshipStates).map(([relationship, state]) => <li key={relationship}>{relationship}: {state} <button onClick={() => removeStagedRelationshipState(relationship)}>Remove {relationship} state change</button></li>)}</ul>}<p>Relationship-state changes are revision-only and cannot be shadow-simulated or approved until a structural proposal contract exists.</p></section>
      <section aria-label="Proposed relationship contracts"><h3>Proposed relationship contracts</h3><label>Proposed relationship parent<select aria-label="Proposed relationship parent" value={proposedRelationshipParent} onChange={(event) => setProposedRelationshipParent(event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>Proposed relationship child<select aria-label="Proposed relationship child" value={proposedRelationshipChild} onChange={(event) => setProposedRelationshipChild(event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>Proposed relationship type<select aria-label="Proposed relationship type" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}><option value="causal_hypothesis">causal hypothesis</option><option value="accounting_identity">accounting identity</option><option value="observed_relation">observed relation</option><option value="proxy_correlation">proxy correlation</option><option value="scenario_assumption">scenario assumption</option></select></label><label>Proposed relationship transform<input aria-label="Proposed relationship transform" value={relationshipTransform} onChange={(event) => setRelationshipTransform(event.target.value)} /></label><label>Proposed relationship source unit<input aria-label="Proposed relationship source unit" value={relationshipSourceUnit} onChange={(event) => setRelationshipSourceUnit(event.target.value)} /></label><label>Proposed relationship target unit<input aria-label="Proposed relationship target unit" value={relationshipTargetUnit} onChange={(event) => setRelationshipTargetUnit(event.target.value)} /></label><label>Proposed relationship sign<input aria-label="Proposed relationship sign" value={relationshipSign} onChange={(event) => setRelationshipSign(event.target.value)} /></label><label>Proposed relationship lag periods<input aria-label="Proposed relationship lag periods" type="number" min="0" value={relationshipLagPeriods} onChange={(event) => setRelationshipLagPeriods(event.target.value)} /></label><label>Proposed relationship lag unit<input aria-label="Proposed relationship lag unit" value={relationshipLagUnit} onChange={(event) => setRelationshipLagUnit(event.target.value)} /></label><label>Proposed relationship coefficient units<input aria-label="Proposed relationship coefficient units" value={relationshipCoefficientUnits} onChange={(event) => setRelationshipCoefficientUnits(event.target.value)} /></label><label>Proposed relationship coefficient<input aria-label="Proposed relationship coefficient" type="number" value={relationshipCoefficient} onChange={(event) => setRelationshipCoefficient(event.target.value)} /></label><label>Proposed relationship evidence claim IDs<input aria-label="Proposed relationship evidence claim IDs" value={relationshipEvidenceClaimIds} onChange={(event) => setRelationshipEvidenceClaimIds(event.target.value)} /></label><button onClick={stageRelationshipContract}>Stage proposed relationship contract</button>{stagedRelationshipContracts.length === 0 ? <p>No proposed relationship contracts staged.</p> : <ul>{stagedRelationshipContracts.map((relationship) => <li key={numeric(relationship.id)}>{numeric(relationship.parent_node_id)} → {numeric(relationship.child_node_id)} · {numeric(relationship.relationship_type)} · {numeric(relationship.state)} <button onClick={() => removeStagedRelationshipContract(numeric(relationship.id))}>Remove proposed relationship {numeric(relationship.parent_node_id)} to {numeric(relationship.child_node_id)}</button></li>)}</ul>}<p>Relationship contracts are proposed-only until the server validates and approves an exact structural proposal.</p></section>
      {stagedRelationshipContracts.length > 0 && client.validateRelationships && <section aria-label="Relationship validation"><button onClick={validateRelationshipContracts}>Validate proposed relationships</button>{relationshipValidation && <>{Array.isArray(relationshipValidation.dependence_warnings) && (relationshipValidation.dependence_warnings.length > 0 ? <ul aria-label="Relationship validation warnings">{relationshipValidation.dependence_warnings.map((raw, index) => { const warning = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as JsonObject : {}; return <li key={numeric(warning.code) + index}>{numeric(warning.message)}</li>; })}</ul> : <p>No dependence warnings returned for this proposed relationship set.</p>)}<p>Active graph unchanged: {relationshipValidation.active_graph_mutated === false ? "yes" : "not confirmed"}.</p></>}</section>}
      {(stagedRelationshipContracts.length > 0 || Object.entries(stagedRelationshipStates).some(([edge, state]) => state === "excluded" && Boolean(activeRelationshipIdsByEdge[edge])) || Object.values(stagedNodeStates).includes("excluded")) && client.createStructuralProposal && !structuralProposal && <button onClick={createStructuralProposal}>Create structural proposal for review</button>}
      {structuralProposal && <section aria-label="Structural proposal review"><h3>Structural proposal review</h3><p>Proposal {numeric(structuralProposal.id)} · graph version {numeric(structuralProposal.graph_version)}</p><p>Binding hash: {numeric(structuralProposal.binding_hash)}</p><p>This review concerns structural impact, not forecast accuracy. The active graph remains unchanged until exact approval.</p>{client.shadowStructuralProposal && <button onClick={runStructuralComparison} disabled={structuralComparing || !selectedTarget}>{structuralComparing ? "Comparing structural proposal in memory…" : "Run structural in-memory comparison"}</button>}<label>Structural approver identity<input aria-label="Structural approver identity" value={structuralApprover} onChange={(event) => setStructuralApprover(event.target.value)} /></label><label><input aria-label="I reviewed this structural binding" type="checkbox" checked={structuralReviewed} onChange={(event) => setStructuralReviewed(event.target.checked)} />I reviewed this structural binding</label>{(client.approveStructuralProposal || (projectId && client.approveProjectStructuralProposal)) && <button onClick={approveStructuralProposal} disabled={!structuralApprover.trim() || !structuralReviewed || typeof structuralProposal.binding_hash !== "string"}>Approve structural proposal</button>}</section>}
      {structuralComparison && <section aria-label="Structural comparison receipt"><h3>Structural comparison receipt</h3><p>Added relationships: {Array.isArray(structuralComparison.candidate_relationship_ids) ? structuralComparison.candidate_relationship_ids.map(numeric).join(", ") || "none" : "not reported"}.</p><p>Removed relationships: {Array.isArray(structuralComparison.removed_relationship_ids) ? structuralComparison.removed_relationship_ids.map(numeric).join(", ") || "none" : "not reported"}.</p><p>Retired nodes: {Array.isArray(structuralComparison.retired_node_ids) ? structuralComparison.retired_node_ids.map(numeric).join(", ") || "none" : "not reported"}.</p><p>Active mean: {numeric(structuralActive?.mean)} · p50: {numeric(structuralActive?.p50)}</p><p>Candidate mean: {numeric(structuralCandidate?.mean)} · p50: {numeric(structuralCandidate?.p50)}</p><p>Active graph unchanged: {structuralComparison.active_graph_mutated === false ? "yes" : "not confirmed"}.</p><h4>Limitations</h4><ul>{structuralLimitations.map((limitation) => <li key={limitation}>{limitation}</li>)}<li>A distribution shift is structural impact, not evidence of improved forecast accuracy.</li></ul></section>}
      {structuralApproval && <section aria-label="Structural approval receipt"><h3>Structural approval receipt</h3><p>Approval receipt: {numeric((structuralApproval.approval_receipt as JsonObject | undefined)?.id)}</p><p>Approved graph version: {numeric((structuralApproval.graph as JsonObject | undefined)?.graph_version)}</p><p>The server applied only the reviewed structural proposal binding.</p></section>}
      <section aria-label="Candidate new-factor set"><h3>Candidate new-factor set</h3><label>New factor ID<input aria-label="New factor ID" value={newNodeId} onChange={(event) => setNewNodeId(event.target.value)} /></label><label>New factor name<input aria-label="New factor name" value={newNodeName} onChange={(event) => setNewNodeName(event.target.value)} /></label><label>New factor location<input aria-label="New factor location" type="number" value={newNodeLocation} onChange={(event) => setNewNodeLocation(event.target.value)} /></label><label>New factor scale<input aria-label="New factor scale" type="number" min="0" value={newNodeScale} onChange={(event) => setNewNodeScale(event.target.value)} /></label><button onClick={stageNewNode}>Stage proposed Normal factor</button>{stagedNewNodes.length === 0 ? <p>No proposed new factors staged.</p> : <ul>{stagedNewNodes.map((node) => <li key={numeric(node.id)}>{numeric(node.name)} · proposed Normal root factor <button onClick={() => removeStagedNewNode(numeric(node.id))}>Remove proposed factor {numeric(node.id)}</button></li>)}</ul>}<p>New factors are proposed-only, require human approval, and cannot be simulated or approved until a complete structural proposal exists.</p></section>
      {selected?.family && <DistributionInspector family={selected.family} parameters={selected.parameters} support={selected.support} asOf={selected.asOf} provenance={`${selected.provenance} · Units: ${selected.units}`} derived={derived ? { mean: derived.statistics.mean ?? undefined, median: derived.statistics.median ?? undefined, mode: derived.statistics.mode ?? undefined, standardDeviation: derived.statistics.variance === null ? undefined : Math.sqrt(derived.statistics.variance) } : undefined} />}
    </>}
    {nodes.length === 0 && !error && <p role="alert">This graph has no editable numeric node parameters.</p>}
    {error && <p role="alert">{error}</p>}{revisionStatus && <p role="status">{revisionStatus}</p>}
    {active && candidate && <section aria-label="Comparison receipt"><h3>Comparison receipt</h3><p>Active median: {numeric(active.p50)}</p><p>Candidate median: {numeric(candidate.p50)}</p><p>Active mean: {numeric(active.mean)} · Candidate mean: {numeric(candidate.mean)}</p>{path.length > 0 ? <p>Affected path: {path.map((node) => node.name).join(" → ")}</p> : <p>No directed path from the selected factor to the selected target was found.</p>}{result?.active_graph_mutated === false && <p>Active graph unchanged.</p>}</section>}
    {(comparedOverrides || Object.keys(stagedDistributionSpecs).length > 0 || Object.keys(stagedNodeStates).length > 0 || Object.keys(stagedRelationshipStates).length > 0 || stagedRelationshipContracts.length > 0 || stagedNewNodes.length > 0) && projectId && activeGraphVersion && client.createCandidateRevision && <button onClick={saveCandidateRevision}>Save durable candidate revision</button>}
    {candidateRevisions.length > 0 && <section aria-label="Persisted candidate revisions"><h3>Persisted candidate revisions</h3><ul>{candidateRevisions.map((revision) => { const overrides = revision.candidate_parameter_overrides as Record<string, Record<string, number>> | undefined; const distributionSpecs = revision.candidate_distribution_specs && typeof revision.candidate_distribution_specs === "object" && !Array.isArray(revision.candidate_distribution_specs) ? revision.candidate_distribution_specs as Record<string, JsonObject> : {}; const nodeStates = revision.candidate_node_state_overrides as Record<string, string> | undefined; const relationshipStates = revision.candidate_relationship_state_overrides as Record<string, string> | undefined; const relationshipContracts = Array.isArray(revision.candidate_relationship_contracts) ? revision.candidate_relationship_contracts : []; const newNodes = Array.isArray(revision.candidate_new_nodes) ? revision.candidate_new_nodes : []; const changes = Object.values(overrides ?? {}).reduce((count, parameters) => count + Object.keys(parameters).length, 0); const distributionChanges = Object.keys(distributionSpecs).length; const nodeChanges = Object.keys(nodeStates ?? {}).length; const relationshipChanges = Object.keys(relationshipStates ?? {}).length; const baseMatches = revision.base_graph_version === activeGraphVersion; return <li key={numeric(revision.id)}>Revision {numeric(revision.id)} · base graph version {numeric(revision.base_graph_version)} · {changes} parameter change{changes === 1 ? "" : "s"}{distributionChanges > 0 ? <> · {distributionChanges} elicited distribution candidate{distributionChanges === 1 ? "" : "s"}</> : null} · {nodeChanges} node-state change{nodeChanges === 1 ? "" : "s"} · {relationshipChanges} relationship-state change{relationshipChanges === 1 ? "" : "s"} · {relationshipContracts.length} proposed relationship contract{relationshipContracts.length === 1 ? "" : "s"} · {newNodes.length} proposed new factor{newNodes.length === 1 ? "" : "s"} <button onClick={() => loadCandidateRevision(revision)} disabled={!baseMatches}>Load revision {numeric(revision.id)}</button>{!baseMatches && <span> (base version is stale)</span>}</li>; })}</ul><p>Candidate revision saved without changing the active graph.</p></section>}
    {candidateRevisions.length > 1 && <section aria-label="Compare persisted candidate revisions"><h3>Compare persisted candidate revisions</h3><label>Baseline candidate revision<select aria-label="Baseline candidate revision" value={baselineRevisionId} onChange={(event) => setBaselineRevisionId(event.target.value)}><option value="">Choose a revision</option>{candidateRevisions.map((revision) => <option key={numeric(revision.id)} value={numeric(revision.id)}>Revision {numeric(revision.id)} · graph version {numeric(revision.base_graph_version)}</option>)}</select></label><label>Compared candidate revision<select aria-label="Compared candidate revision" value={comparedRevisionId} onChange={(event) => setComparedRevisionId(event.target.value)}><option value="">Choose a revision</option>{candidateRevisions.map((revision) => <option key={numeric(revision.id)} value={numeric(revision.id)}>Revision {numeric(revision.id)} · graph version {numeric(revision.base_graph_version)}</option>)}</select></label><button onClick={compareDurableRevisions} disabled={!baselineRevisionId || !comparedRevisionId}>Compare durable revisions</button></section>}
    {revisionComparison && <section aria-label="Candidate revision comparison"><h3>Candidate revision comparison</h3><p>Comparing revision {numeric(revisionComparison.baseline.id)} to revision {numeric(revisionComparison.compared.id)} on active graph version {numeric(revisionComparison.baseline.base_graph_version)}.</p>{revisionComparison.differences.length === 0 ? <p>No durable differences were recorded between these revisions.</p> : <ul>{revisionComparison.differences.map((difference) => <li key={`${difference.category}:${difference.label}`}>{difference.kind === "added" ? `Added ${difference.category}: ${difference.label} is ${difference.after}.` : difference.kind === "removed" ? `Removed ${difference.category}: ${difference.label} was ${difference.before}.` : `Changed ${difference.category}: ${difference.label} from ${difference.before} to ${difference.after}.`}</li>)}</ul>}<p>Active graph unchanged: yes. This is a durable payload comparison, not a simulation or approval.</p></section>}
    {result && client.createCandidateProposal && !proposal && <button onClick={saveCandidate}>Save candidate for review</button>}
    {proposal && <section aria-label="Candidate approval"><h3>Candidate approval</h3><p>Proposal {proposalId} · graph version {numeric(proposal.graph_version)}</p><p>Binding hash: {bindingHash || "unavailable"}</p><p>Approval applies this exact proposal to the active graph. Review the binding before continuing.</p><label>Approver identity<input aria-label="Approver identity" value={approver} onChange={(event) => setApprover(event.target.value)} /></label><label><input aria-label="I reviewed this exact binding" type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I reviewed this exact binding</label>{(client.approveCandidateProposal || (projectId && client.approveProjectCandidateProposal)) && <button onClick={approveCandidate} disabled={!approver.trim() || !reviewed || !bindingHash}>Approve candidate version</button>}</section>}
    {approval && <section aria-label="Approval receipt"><h3>Approval receipt: {numeric((approval.approval_receipt as JsonObject | undefined)?.id)}</h3><p>Approved graph version: {numeric((approval.graph as JsonObject | undefined)?.graph_version)}</p>{approvedProject && <p>Project lifecycle: {numeric(approvedProject.stage)} · active graph version {numeric(approvedProject.active_graph_version)}</p>}<p>The server validated the proposal binding before applying this version.</p></section>}
    {(limitations.length > 0 || result) && <section aria-label="Comparison limitations"><h3>Limitations</h3><ul>{limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}<li>A distribution shift is structural impact, not evidence of improved forecast accuracy.</li></ul></section>}
  </section>;
}
