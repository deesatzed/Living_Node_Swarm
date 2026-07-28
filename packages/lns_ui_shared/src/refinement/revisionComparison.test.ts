import { describe, expect, it } from "vitest";
import { compareCandidateRevisions } from "./revisionComparison";

describe("compareCandidateRevisions", () => {
  it("reports durable parameter, state, contract, and node differences without inventing unchanged changes", () => {
    const comparison = compareCandidateRevisions(
      {
        id: "revision-a", base_graph_version: 4,
        candidate_parameter_overrides: { freight: { mu: 1 }, demand: { sigma: 2 } },
        candidate_node_state_overrides: { freight: "excluded" },
        candidate_relationship_state_overrides: { "freight:outcome": "excluded" },
        candidate_relationship_contracts: [{ id: "contract-a", parent_node_id: "freight", child_node_id: "outcome", coefficient_parameters: [{ id: "coefficient", value: 1 }] }],
        candidate_new_nodes: [{ id: "port-delay", name: "Port delay" }],
      },
      {
        id: "revision-b", base_graph_version: 4,
        candidate_parameter_overrides: { freight: { mu: 3 }, demand: { sigma: 2 }, energy: { mu: 4 } },
        candidate_node_state_overrides: { freight: "active", energy: "excluded" },
        candidate_relationship_state_overrides: { "freight:outcome": "active" },
        candidate_relationship_contracts: [{ id: "contract-a", parent_node_id: "freight", child_node_id: "outcome", coefficient_parameters: [{ id: "coefficient", value: 2 }] }, { id: "contract-b", parent_node_id: "energy", child_node_id: "outcome" }],
        candidate_new_nodes: [{ id: "energy-buffer", name: "Energy buffer" }],
      },
    );

    expect(comparison).toEqual([
      { kind: "changed", category: "parameter", label: "freight.mu", before: "1", after: "3" },
      { kind: "added", category: "parameter", label: "energy.mu", before: undefined, after: "4" },
      { kind: "changed", category: "node state", label: "freight", before: "excluded", after: "active" },
      { kind: "added", category: "node state", label: "energy", before: undefined, after: "excluded" },
      { kind: "changed", category: "relationship state", label: "freight:outcome", before: "excluded", after: "active" },
      { kind: "changed", category: "relationship contract", label: "contract-a", before: "freight → outcome", after: "freight → outcome" },
      { kind: "added", category: "relationship contract", label: "contract-b", before: undefined, after: "energy → outcome" },
      { kind: "removed", category: "proposed factor", label: "port-delay", before: "Port delay", after: undefined },
      { kind: "added", category: "proposed factor", label: "energy-buffer", before: undefined, after: "Energy buffer" },
    ]);
  });
});
