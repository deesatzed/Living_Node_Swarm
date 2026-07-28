import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShadowComparison } from "./ShadowComparison";

afterEach(cleanup);

describe("ShadowComparison", () => {
  it("stages multiple reversible parameter changes before comparing them", async () => {
    const user = userEvent.setup();
    const shadowSimulate = vi.fn(async () => ({ active_graph_mutated: false, active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 7, p50: 7 } }));
    render(<ShadowComparison graphId="graph-1" client={{
      getGraph: async () => ({ nodes: {
        input_signal: { id: "input_signal", name: "Input signal", parameters: { mu: 0, sigma: 1 }, depends_on: [] },
        outcome: { id: "outcome", name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] },
      }}),
      shadowSimulate,
    }} />);

    await screen.findByLabelText("Candidate value");
    await user.clear(screen.getByLabelText("Candidate value"));
    await user.type(screen.getByLabelText("Candidate value"), "5");
    await user.click(screen.getByRole("button", { name: "Add selected candidate change" }));
    await user.selectOptions(screen.getByLabelText("Candidate parameter"), "sigma");
    await user.clear(screen.getByLabelText("Candidate value"));
    await user.type(screen.getByLabelText("Candidate value"), "2");
    await user.click(screen.getByRole("button", { name: "Add selected candidate change" }));

    expect(screen.getByLabelText("Candidate change set")).toHaveTextContent("Input signal · mu: 5");
    expect(screen.getByLabelText("Candidate change set")).toHaveTextContent("Input signal · sigma: 2");
    await user.click(screen.getByRole("button", { name: "Run in-memory comparison" }));
    expect(shadowSimulate).toHaveBeenCalledWith("graph-1", {
      target_node_id: "outcome",
      candidate_parameter_overrides: { input_signal: { mu: 5, sigma: 2 } },
    });
    await user.click(screen.getByRole("button", { name: "Remove Input signal mu" }));
    expect(screen.getByLabelText("Candidate change set")).not.toHaveTextContent("Input signal · mu: 5");
  });

  it("runs an explicitly in-memory parameter comparison without activating the candidate", async () => {
    const user = userEvent.setup();
    const shadowSimulate = vi.fn(async () => ({
      active_graph_mutated: false,
      active_summary: { mean: 0, p50: 0 },
      candidate_summary: { mean: 5, p50: 5 },
      limitations: ["Candidate changes are simulated in memory and are not persisted or activated."],
    }));
    render(<ShadowComparison graphId="graph-1" client={{
      getGraph: async () => ({ nodes: {
        input_signal: { id: "input_signal", name: "Input signal", distribution_family: "Normal", units: "USD/kg", support_lower: -5, support_upper: 5, parameters: { mu: 0, sigma: 1 }, depends_on: [] },
        outcome: { id: "outcome", name: "Outcome", distribution_family: "Normal", parameters: { mu: 0, sigma: 0.2 }, depends_on: ["input_signal"] },
      }}),
      shadowSimulate,
      getDistributionStatistics: async () => ({ family_id: "Normal", parameters: { loc: 0, scale: 1 }, statistics: { mean: 0, median: 0, mode: 0, variance: 1, support_lower: null, support_upper: null } }),
    }} />);

    await screen.findByLabelText("Target outcome");
    expect(screen.getByLabelText("Distribution inspector")).toHaveTextContent("As of: Not recorded on graph node");
    expect(await screen.findByText("Support: -5 to 5")).toBeVisible();
    expect(screen.getByLabelText("Distribution inspector")).toHaveTextContent("Units: USD/kg");
    expect(screen.getByLabelText("Derived distribution values")).toHaveTextContent("Standard deviation: 1");
    await user.clear(screen.getByLabelText("Candidate value"));
    await user.type(screen.getByLabelText("Candidate value"), "5");
    await user.click(screen.getByRole("button", { name: "Run in-memory comparison" }));

    expect(shadowSimulate).toHaveBeenCalledWith("graph-1", {
      target_node_id: "outcome",
      candidate_parameter_overrides: { input_signal: { mu: 5 } },
    });
    expect(await screen.findByText("Active median: 0")).toBeVisible();
    expect(screen.getByText("Candidate median: 5")).toBeVisible();
    expect(screen.getByText("Affected path: Input signal → Outcome")).toBeVisible();
    expect(screen.getByText(/not evidence of improved forecast accuracy/i)).toBeVisible();
  });

  it("requires an exact saved proposal and operator identity before approval", async () => {
    const user = userEvent.setup();
    const createCandidateProposal = vi.fn(async () => ({ proposal: { id: "proposal-1", graph_version: 4, binding_hash: "binding-123" } }));
    const approveProjectCandidateProposal = vi.fn(async () => ({ approval_receipt: { id: "receipt-1", binding_hash: "binding-123" }, graph: { graph_version: 5 }, project: { stage: "decide", active_graph_version: 5 } }));
    const onApproved = vi.fn();
    render(<ShadowComparison graphId="graph-1" projectId="project-1" client={{
      getGraph: async () => ({ nodes: {
        input_signal: { id: "input_signal", name: "Input signal", parameters: { mu: 0 }, depends_on: [] },
        outcome: { id: "outcome", name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] },
      }}),
      shadowSimulate: async () => ({ active_graph_mutated: false, active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 5, p50: 5 } }),
      createCandidateProposal,
      approveProjectCandidateProposal,
    } as never} onApproved={onApproved} />);

    await screen.findByLabelText("Candidate value");
    await user.clear(screen.getByLabelText("Candidate value"));
    await user.type(screen.getByLabelText("Candidate value"), "5");
    await user.click(screen.getByRole("button", { name: "Run in-memory comparison" }));
    await user.click(await screen.findByRole("button", { name: "Save candidate for review" }));

    expect(createCandidateProposal).toHaveBeenCalledWith("graph-1", { candidate_parameter_overrides: { input_signal: { mu: 5 } } });
    expect(await screen.findByText("Binding hash: binding-123")).toBeVisible();
    await user.type(screen.getByLabelText("Approver identity"), "operator");
    await user.click(screen.getByLabelText("I reviewed this exact binding"));
    await user.click(screen.getByRole("button", { name: "Approve candidate version" }));

    expect(approveProjectCandidateProposal).toHaveBeenCalledWith("project-1", "proposal-1", { approved_by: "operator", binding_hash: "binding-123" });
    expect(await screen.findByText("Approval receipt: receipt-1")).toBeVisible();
    expect(screen.getByText("Approved graph version: 5")).toBeVisible();
    expect(screen.getByText("Project lifecycle: decide · active graph version 5")).toBeVisible();
    expect(onApproved).toHaveBeenCalledWith({ stage: "decide", active_graph_version: 5 });
  });

  it("persists the compared candidate set as a version-bound non-active revision", async () => {
    const user = userEvent.setup();
    const createCandidateRevision = vi.fn(async (_projectId, revision) => ({ ...revision, id: "revision-1" }));
    render(<ShadowComparison graphId="graph-1" projectId="project-1" activeGraphVersion={4} client={{
      getGraph: async () => ({ nodes: {
        input_signal: { id: "input_signal", name: "Input signal", parameters: { mu: 0 }, depends_on: [] },
        outcome: { id: "outcome", name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] },
      }}),
      shadowSimulate: async () => ({ active_graph_mutated: false, active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 5, p50: 5 } }),
      createCandidateRevision,
      listCandidateRevisions: async () => ({ candidate_revisions: [] }),
    }} />);

    await screen.findByLabelText("Candidate value");
    await user.clear(screen.getByLabelText("Candidate value"));
    await user.type(screen.getByLabelText("Candidate value"), "5");
    await user.click(screen.getByRole("button", { name: "Run in-memory comparison" }));
    await user.click(await screen.findByRole("button", { name: "Save durable candidate revision" }));

    expect(createCandidateRevision).toHaveBeenCalledWith("project-1", expect.objectContaining({
      base_graph_version: 4,
      candidate_parameter_overrides: { input_signal: { mu: 5 } },
    }));
    expect(await screen.findByText("Revision revision-1 · base graph version 4 · 1 parameter change · 0 node-state changes · 0 relationship-state changes · 0 proposed relationship contracts · 0 proposed new factors")).toBeVisible();
    expect(screen.getByText("Candidate revision saved without changing the active graph.")).toBeVisible();
  });

  it("persists a staged node exclusion as a structural non-active revision", async () => {
    const user = userEvent.setup();
    const createCandidateRevision = vi.fn(async (_projectId, revision) => ({ ...revision, id: "exclude-input" }));
    render(<ShadowComparison graphId="graph-1" projectId="project-1" activeGraphVersion={4} client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate: async () => ({}), createCandidateRevision }} />);
    await screen.findByLabelText("Candidate factor");
    await user.click(screen.getByRole("button", { name: "Exclude selected factor in candidate" }));
    expect(screen.getByLabelText("Candidate structural change set")).toHaveTextContent("Input signal: excluded");
    await user.click(screen.getByRole("button", { name: "Save durable candidate revision" }));
    expect(createCandidateRevision).toHaveBeenCalledWith("project-1", expect.objectContaining({ candidate_node_state_overrides: { input_signal: "excluded" } }));
    expect(await screen.findByText("Revision exclude-input · base graph version 4 · 0 parameter changes · 1 node-state change · 0 relationship-state changes · 0 proposed relationship contracts · 0 proposed new factors")).toBeVisible();
  });

  it("persists a staged dependency exclusion as a structural non-active revision", async () => {
    const user = userEvent.setup();
    const createCandidateRevision = vi.fn(async (_projectId, revision) => ({ ...revision, id: "exclude-edge" }));
    render(<ShadowComparison graphId="graph-1" projectId="project-1" activeGraphVersion={4} client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate: async () => ({}), createCandidateRevision }} />);
    await screen.findByLabelText("Candidate dependency");
    await user.click(screen.getByRole("button", { name: "Exclude selected dependency in candidate" }));
    expect(screen.getByLabelText("Candidate relationship change set")).toHaveTextContent("input_signal:outcome: excluded");
    await user.click(screen.getByRole("button", { name: "Save durable candidate revision" }));
    expect(createCandidateRevision).toHaveBeenCalledWith("project-1", expect.objectContaining({ candidate_relationship_state_overrides: { "input_signal:outcome": "excluded" } }));
  });

  it("stages an explicit proposed relationship contract without simulating or approving it", async () => {
    const user = userEvent.setup();
    const createCandidateRevision = vi.fn(async (_projectId, revision) => ({ ...revision, id: "relationship-revision" }));
    const shadowSimulate = vi.fn(async () => ({}));
    render(<ShadowComparison graphId="graph-1" projectId="project-1" activeGraphVersion={4} client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate, createCandidateRevision }} />);
    await screen.findByLabelText("Proposed relationship type");
    await user.selectOptions(screen.getByLabelText("Proposed relationship type"), "scenario_assumption");
    await user.clear(screen.getByLabelText("Proposed relationship lag periods"));
    await user.type(screen.getByLabelText("Proposed relationship lag periods"), "1");
    await user.type(screen.getByLabelText("Proposed relationship evidence claim IDs"), "claim-a, claim-b");
    await user.click(screen.getByRole("button", { name: "Stage proposed relationship contract" }));
    expect(screen.getByLabelText("Proposed relationship contracts")).toHaveTextContent("input_signal → outcome · scenario_assumption · proposed");
    await user.click(screen.getByRole("button", { name: "Remove proposed relationship input_signal to outcome" }));
    expect(screen.getByLabelText("Proposed relationship contracts")).toHaveTextContent("No proposed relationship contracts staged.");
    await user.click(screen.getByRole("button", { name: "Stage proposed relationship contract" }));
    await user.click(screen.getByRole("button", { name: "Save durable candidate revision" }));
    expect(createCandidateRevision).toHaveBeenCalledWith("project-1", expect.objectContaining({ candidate_relationship_contracts: [expect.objectContaining({ parent_node_id: "input_signal", child_node_id: "outcome", relationship_type: "scenario_assumption", lag_periods: 1, lag_unit: "month", evidence_claim_ids: ["claim-a", "claim-b"], state: "proposed" })] }));
    expect(await screen.findByText("Revision relationship-revision · base graph version 4 · 0 parameter changes · 0 node-state changes · 0 relationship-state changes · 1 proposed relationship contract · 0 proposed new factors")).toBeVisible();
    expect(shadowSimulate).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Approve candidate version" })).not.toBeInTheDocument();
  });

  it("renders server relationship-validation warnings before saving a revision", async () => {
    const user = userEvent.setup();
    const validateRelationships = vi.fn(async () => ({ dependence_warnings: [{ code: "unresolved_proxy_correlation", message: "Shared cause remains unresolved." }], active_graph_mutated: false }));
    render(<ShadowComparison graphId="graph-1" client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate: async () => ({}), validateRelationships } as never} />);
    await screen.findByLabelText("Proposed relationship type");
    await user.click(screen.getByRole("button", { name: "Stage proposed relationship contract" }));
    await user.click(screen.getByRole("button", { name: "Validate proposed relationships" }));
    expect(validateRelationships).toHaveBeenCalledWith(expect.objectContaining({ relationships: [expect.objectContaining({ state: "proposed" })] }));
    expect(await screen.findByLabelText("Relationship validation warnings")).toHaveTextContent("Shared cause remains unresolved.");
  });

  it("confirms a clean proposed-relationship validation result", async () => {
    const user = userEvent.setup();
    render(<ShadowComparison graphId="graph-1" client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate: async () => ({}), validateRelationships: async () => ({ dependence_warnings: [], active_graph_mutated: false }) } as never} />);
    await screen.findByLabelText("Proposed relationship type");
    await user.click(screen.getByRole("button", { name: "Stage proposed relationship contract" }));
    await user.click(screen.getByRole("button", { name: "Validate proposed relationships" }));

    expect(await screen.findByText("No dependence warnings returned for this proposed relationship set.")).toBeVisible();
    expect(screen.getByText("Active graph unchanged: yes.")).toBeVisible();
  });

  it("clears relationship validation when the staged contract changes", async () => {
    const user = userEvent.setup();
    render(<ShadowComparison graphId="graph-1" client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate: async () => ({}), validateRelationships: async () => ({ dependence_warnings: [{ code: "unresolved_proxy_correlation", message: "Shared cause remains unresolved." }], active_graph_mutated: false }) } as never} />);
    await screen.findByLabelText("Proposed relationship type");
    await user.click(screen.getByRole("button", { name: "Stage proposed relationship contract" }));
    await user.click(screen.getByRole("button", { name: "Validate proposed relationships" }));
    expect(await screen.findByText("Shared cause remains unresolved.")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Proposed relationship type"), "observed_relation");
    await user.click(screen.getByRole("button", { name: "Stage proposed relationship contract" }));
    expect(screen.queryByText("Shared cause remains unresolved.")).not.toBeInTheDocument();
    expect(screen.queryByText("Active graph unchanged: yes.")).not.toBeInTheDocument();
  });

  it("reviews and approves a server-bound proposed relationship addition", async () => {
    const user = userEvent.setup();
    const createStructuralProposal = vi.fn(async () => ({ proposal: { id: "structural-1", graph_version: 4, binding_hash: "structural-hash", candidate_relationship_ids: ["proposal-input_signal-to-outcome"] } }));
    const approveStructuralProposal = vi.fn(async () => ({ approval_receipt: { id: "structural-receipt", binding_hash: "structural-hash" }, graph: { graph_version: 5 } }));
    render(<ShadowComparison graphId="graph-1" client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, process_stage: { name: "Process stage", parameters: { mu: 0 }, depends_on: ["input_signal"] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["process_stage"] } } }), shadowSimulate: async () => ({}), createStructuralProposal, approveStructuralProposal } as never} />);
    await screen.findByLabelText("Proposed relationship parent");
    await user.selectOptions(screen.getByLabelText("Proposed relationship parent"), "input_signal");
    await user.selectOptions(screen.getByLabelText("Proposed relationship child"), "outcome");
    await user.clear(screen.getByLabelText("Proposed relationship coefficient"));
    await user.type(screen.getByLabelText("Proposed relationship coefficient"), "0.25");
    await user.click(screen.getByRole("button", { name: "Stage proposed relationship contract" }));
    await user.click(screen.getByRole("button", { name: "Create structural proposal for review" }));

    expect(createStructuralProposal).toHaveBeenCalledWith("graph-1", { relationships: [expect.objectContaining({ parent_node_id: "input_signal", child_node_id: "outcome", coefficient_parameters: [{ id: "coefficient", value: 0.25 }] })] });
    expect(await screen.findByLabelText("Structural proposal review")).toHaveTextContent("Binding hash: structural-hash");
    await user.type(screen.getByLabelText("Structural approver identity"), "operator");
    await user.click(screen.getByLabelText("I reviewed this structural binding"));
    await user.click(screen.getByRole("button", { name: "Approve structural proposal" }));

    expect(approveStructuralProposal).toHaveBeenCalledWith("graph-1", "structural-1", { approved_by: "operator", binding_hash: "structural-hash" });
    expect(await screen.findByLabelText("Structural approval receipt")).toHaveTextContent("Approved graph version: 5");
  });

  it("loads a matching-base persisted revision back into local staging without activation", async () => {
    const user = userEvent.setup();
    render(<ShadowComparison graphId="graph-1" projectId="project-1" activeGraphVersion={4} client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate: async () => ({}), listCandidateRevisions: async () => ({ candidate_revisions: [{ id: "saved-1", base_graph_version: 4, candidate_parameter_overrides: { input_signal: { mu: 5 } }, candidate_node_state_overrides: { input_signal: "excluded" }, candidate_relationship_state_overrides: { "input_signal:outcome": "excluded" } }] }) }} />);
    await screen.findByRole("button", { name: "Load revision saved-1" });
    await user.click(screen.getByRole("button", { name: "Load revision saved-1" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Revision saved-1 loaded into local staging. The active graph is unchanged.");
    expect(screen.getByLabelText("Candidate change set")).toHaveTextContent("Input signal · mu: 5");
    expect(screen.getByLabelText("Candidate structural change set")).toHaveTextContent("Input signal: excluded");
    expect(screen.getByLabelText("Candidate relationship change set")).toHaveTextContent("input_signal:outcome: excluded");
  });

  it("undoes and redoes local staged structural changes without touching the active graph", async () => {
    const user = userEvent.setup();
    render(<ShadowComparison graphId="graph-1" client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate: async () => ({}) }} />);
    await screen.findByLabelText("Candidate factor");
    await user.click(screen.getByRole("button", { name: "Exclude selected factor in candidate" }));
    expect(screen.getByLabelText("Candidate structural change set")).toHaveTextContent("Input signal: excluded");
    await user.click(screen.getByRole("button", { name: "Undo staged change" }));
    expect(screen.getByLabelText("Candidate structural change set")).toHaveTextContent("No local candidate node-state changes staged.");
    await user.click(screen.getByRole("button", { name: "Redo staged change" }));
    expect(screen.getByLabelText("Candidate structural change set")).toHaveTextContent("Input signal: excluded");
    expect(screen.getByText(/does not persist, activate, or overwrite the approved graph/i)).toBeVisible();
  });

  it("stages a proposed typed Normal factor as a non-active revision delta", async () => {
    const user = userEvent.setup();
    const createCandidateRevision = vi.fn(async (_projectId, revision) => ({ ...revision, id: "new-factor-revision" }));
    render(<ShadowComparison graphId="graph-1" projectId="project-1" activeGraphVersion={4} client={{ getGraph: async () => ({ nodes: { input_signal: { name: "Input signal", parameters: { mu: 0 }, depends_on: [] }, outcome: { name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] } } }), shadowSimulate: async () => ({}), createCandidateRevision }} />);
    await screen.findByLabelText("New factor ID");
    await user.type(screen.getByLabelText("New factor ID"), "recycling_signal");
    await user.type(screen.getByLabelText("New factor name"), "Recycling signal");
    await user.click(screen.getByRole("button", { name: "Stage proposed Normal factor" }));
    expect(screen.getByLabelText("Candidate new-factor set")).toHaveTextContent("Recycling signal · proposed Normal root factor");
    await user.click(screen.getByRole("button", { name: "Save durable candidate revision" }));
    expect(createCandidateRevision).toHaveBeenCalledWith("project-1", expect.objectContaining({ candidate_new_nodes: [expect.objectContaining({ id: "recycling_signal", distribution_family: "Normal", status: "proposed", requires_human_approval: true })] }));
    expect(await screen.findByText("Revision new-factor-revision · base graph version 4 · 0 parameter changes · 0 node-state changes · 0 relationship-state changes · 0 proposed relationship contracts · 1 proposed new factor")).toBeVisible();
  });
});
