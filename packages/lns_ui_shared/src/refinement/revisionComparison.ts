import type { JsonObject } from "../api/types";

export type RevisionDifferenceKind = "added" | "removed" | "changed";

export interface RevisionDifference {
  kind: RevisionDifferenceKind;
  category: "parameter" | "node state" | "relationship state" | "relationship contract" | "proposed factor";
  label: string;
  before?: string;
  after?: string;
}

interface ComparableValue {
  display: string;
  signature: string;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
}

function parameters(revision: JsonObject): Map<string, ComparableValue> {
  const result = new Map<string, ComparableValue>();
  for (const [nodeId, rawParameters] of Object.entries(record(revision.candidate_parameter_overrides))) {
    for (const [parameter, value] of Object.entries(record(rawParameters))) {
      if (typeof value === "number") result.set(`${nodeId}.${parameter}`, { display: String(value), signature: String(value) });
    }
  }
  return result;
}

function states(revision: JsonObject, key: "candidate_node_state_overrides" | "candidate_relationship_state_overrides"): Map<string, ComparableValue> {
  return new Map(Object.entries(record(revision[key])).flatMap(([id, value]) => typeof value === "string" ? [[id, { display: value, signature: value }] as const] : []));
}

function contracts(revision: JsonObject): Map<string, ComparableValue> {
  return new Map((Array.isArray(revision.candidate_relationship_contracts) ? revision.candidate_relationship_contracts : []).flatMap((raw) => {
    const contract = record(raw);
    if (typeof contract.id !== "string") return [];
    const parent = typeof contract.parent_node_id === "string" ? contract.parent_node_id : "unknown";
    const child = typeof contract.child_node_id === "string" ? contract.child_node_id : "unknown";
    return [[contract.id, { display: `${parent} → ${child}`, signature: stable(contract) }] as const];
  }));
}

function proposedNodes(revision: JsonObject): Map<string, ComparableValue> {
  return new Map((Array.isArray(revision.candidate_new_nodes) ? revision.candidate_new_nodes : []).flatMap((raw) => {
    const node = record(raw);
    if (typeof node.id !== "string") return [];
    const name = typeof node.name === "string" ? node.name : node.id;
    return [[node.id, { display: name, signature: stable(node) }] as const];
  }));
}

function differences(category: RevisionDifference["category"], before: Map<string, ComparableValue>, after: Map<string, ComparableValue>): RevisionDifference[] {
  const keys = [...before.keys(), ...[...after.keys()].filter((key) => !before.has(key))];
  return keys.reduce<RevisionDifference[]>((result, label) => {
    const left = before.get(label);
    const right = after.get(label);
    if (!left && right) result.push({ kind: "added", category, label, after: right.display });
    else if (left && !right) result.push({ kind: "removed", category, label, before: left.display });
    else if (left && right && left.signature !== right.signature) result.push({ kind: "changed", category, label, before: left.display, after: right.display });
    return result;
  }, []);
}

/** Returns a deterministic payload delta only; it does not simulate or activate either revision. */
export function compareCandidateRevisions(before: JsonObject, after: JsonObject): RevisionDifference[] {
  return [
    ...differences("parameter", parameters(before), parameters(after)),
    ...differences("node state", states(before, "candidate_node_state_overrides"), states(after, "candidate_node_state_overrides")),
    ...differences("relationship state", states(before, "candidate_relationship_state_overrides"), states(after, "candidate_relationship_state_overrides")),
    ...differences("relationship contract", contracts(before), contracts(after)),
    ...differences("proposed factor", proposedNodes(before), proposedNodes(after)),
  ];
}
