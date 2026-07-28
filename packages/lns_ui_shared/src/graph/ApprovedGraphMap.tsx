import type { CandidateFactor, JsonObject } from "../api/types";
import { HopGraph } from "./HopGraph";

interface ApprovedNode { id: string; name: string; dependsOn: string[]; state: CandidateFactor["state"]; evidence: CandidateFactor["evidence_status"]; }
interface ApprovedRelationship { parentId: string; childId: string; contract: JsonObject; }

function nodesFrom(graph: JsonObject): ApprovedNode[] {
  if (!graph.nodes || typeof graph.nodes !== "object" || Array.isArray(graph.nodes)) return [];
  return Object.entries(graph.nodes as Record<string, unknown>).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const node = raw as Record<string, unknown>;
    const state = node.status === "proposed" || node.status === "excluded" || node.status === "unsupported" || node.status === "stale" ? node.status : "active";
    const evidence = typeof node.evidence_classification === "string" ? node.evidence_classification : "unknown";
    return [{ id, name: typeof node.name === "string" ? node.name : id, dependsOn: Array.isArray(node.depends_on) ? node.depends_on.filter((parent): parent is string => typeof parent === "string") : [], state, evidence: evidence as CandidateFactor["evidence_status"] }];
  });
}

function target(nodes: ApprovedNode[]): ApprovedNode | undefined {
  const parents = new Set(nodes.flatMap((node) => node.dependsOn));
  return nodes.find((node) => !parents.has(node.id)) ?? nodes.at(-1);
}

function factors(nodes: ApprovedNode[], targetId: string): CandidateFactor[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const distances = new Map<string, number>([[targetId, 0]]);
  const queue = [targetId];
  while (queue.length) {
    const id = queue.shift()!;
    const node = byId.get(id);
    for (const parent of node?.dependsOn ?? []) if (!distances.has(parent)) { distances.set(parent, (distances.get(id) ?? 0) + 1); queue.push(parent); }
  }
  return nodes.filter((node) => node.id !== targetId).map((node, index) => ({ id: node.id, label: node.name, rank: index + 1, hop_distance: Math.min(3, distances.get(node.id) ?? 3), state: node.state, evidence_status: node.evidence }));
}

function relationshipsFrom(graph: JsonObject): Map<string, ApprovedRelationship> {
  if (!graph.relationships || typeof graph.relationships !== "object" || Array.isArray(graph.relationships)) return new Map();
  return new Map(Object.values(graph.relationships as Record<string, unknown>).flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const contract = raw as JsonObject;
    return typeof contract.parent_node_id === "string" && typeof contract.child_node_id === "string"
      ? [[`${contract.parent_node_id}:${contract.child_node_id}`, { parentId: contract.parent_node_id, childId: contract.child_node_id, contract }] as const]
      : [];
  }));
}

function recorded(value: unknown): string { return typeof value === "string" && value.trim() ? value : "Not recorded"; }

function coefficientParameters(contract: JsonObject): string {
  const parameters = Array.isArray(contract.coefficient_parameters) ? contract.coefficient_parameters.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const parameter = raw as JsonObject;
    return typeof parameter.id === "string" && typeof parameter.value === "number" ? [`${parameter.id} = ${parameter.value}`] : [];
  }) : [];
  return parameters.length ? parameters.join("; ") : "Not recorded";
}

function evidenceClaims(contract: JsonObject, fallback: string): string {
  const claims = Array.isArray(contract.evidence_claim_ids) ? contract.evidence_claim_ids.filter((claim): claim is string => typeof claim === "string" && Boolean(claim.trim())) : [];
  return claims.length ? claims.join(", ") : contract.evidence_claim_ids ? "none recorded" : fallback;
}

export function ApprovedGraphMap({ graph }: { graph: JsonObject }) {
  const nodes = nodesFrom(graph);
  const targetNode = target(nodes);
  if (!targetNode) return <section aria-label="Approved model dependency graph"><p role="alert">The approved graph has no readable nodes.</p></section>;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const persistedRelationships = relationshipsFrom(graph);
  const relationships = nodes.flatMap((node) => node.dependsOn.map((parent) => ({ parent_node_id: parent, child_node_id: node.id })));
  return <section aria-label="Approved model dependency graph"><h2>Approved graph — read-only</h2><p>Trace the active dependencies before creating a separate draft. The approved graph itself is not edited here.</p><HopGraph factors={factors(nodes, targetNode.id)} targetId={targetNode.id} targetLabel={targetNode.name} relationships={relationships} /><section aria-label="Approved dependency details"><h3>Approved dependency details</h3>{relationships.length === 0 ? <p>No persisted dependency edges were recorded.</p> : <ul>{relationships.map((relationship) => {
    const persisted = persistedRelationships.get(`${relationship.parent_node_id}:${relationship.child_node_id}`)?.contract;
    const fallbackEvidence = byId.get(relationship.child_node_id)?.evidence ?? "unknown";
    return <li key={`${relationship.parent_node_id}:${relationship.child_node_id}`}>
      {byId.get(relationship.child_node_id)?.name ?? relationship.child_node_id} depends on {byId.get(relationship.parent_node_id)?.name ?? relationship.parent_node_id} · relationship type: {persisted ? recorded(persisted.relationship_type) : "Not recorded"} · transform: {persisted ? recorded(persisted.transform) : "Not recorded"} · sign: {persisted ? recorded(persisted.sign) : "Not recorded"} · units: {persisted ? `${recorded(persisted.source_unit)} → ${recorded(persisted.target_unit)}; coefficient units: ${recorded(persisted.coefficient_units)}` : "Not recorded"} · coefficient parameters: {persisted ? coefficientParameters(persisted) : "Not recorded"} · lag: {persisted && typeof persisted.lag_periods === "number" ? `${persisted.lag_periods} ${recorded(persisted.lag_unit)}` : "Not recorded"} · evidence: {persisted ? evidenceClaims(persisted, fallbackEvidence) : fallbackEvidence} · state: {persisted ? recorded(persisted.state) : "Not recorded"}
    </li>;
  })}</ul>}</section></section>;
}
