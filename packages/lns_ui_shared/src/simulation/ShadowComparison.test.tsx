import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShadowComparison } from "./ShadowComparison";

afterEach(cleanup);

describe("ShadowComparison", () => {
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
        input_signal: { id: "input_signal", name: "Input signal", distribution_family: "Normal", parameters: { mu: 0, sigma: 1 }, depends_on: [] },
        outcome: { id: "outcome", name: "Outcome", distribution_family: "Normal", parameters: { mu: 0, sigma: 0.2 }, depends_on: ["input_signal"] },
      }}),
      shadowSimulate,
    }} />);

    await screen.findByLabelText("Target outcome");
    expect(screen.getByLabelText("Distribution inspector")).toHaveTextContent("As of: Not recorded on graph node");
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
    render(<ShadowComparison graphId="graph-1" projectId="project-1" client={{
      getGraph: async () => ({ nodes: {
        input_signal: { id: "input_signal", name: "Input signal", parameters: { mu: 0 }, depends_on: [] },
        outcome: { id: "outcome", name: "Outcome", parameters: { mu: 0 }, depends_on: ["input_signal"] },
      }}),
      shadowSimulate: async () => ({ active_graph_mutated: false, active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 5, p50: 5 } }),
      createCandidateProposal,
      approveProjectCandidateProposal,
    } as never} />);

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
  });
});
