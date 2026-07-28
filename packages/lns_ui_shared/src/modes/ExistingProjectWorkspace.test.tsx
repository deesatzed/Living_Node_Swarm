import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExistingProjectWorkspace } from "./ExistingProjectWorkspace";

afterEach(cleanup);

describe("ExistingProjectWorkspace", () => {
  it("renders Run mode as inspection-only against the selected persisted project", async () => {
    render(<ExistingProjectWorkspace mode="run" projectId="project-1" client={{
      getProject: async () => ({ id: "project-1", name: "Neodymium model", target_id: "target-1", active_graph_version: 4, evidence_classification: "local_verified" }),
      getTarget: async () => ({ question: "What will neodymium cost?", forecast_origin: "2026-07-28T00:00:00Z", resolution_at: "2027-07-28T00:00:00Z" }),
      runSimulation: async () => ({}),
      getMonitoring: async () => ({ config: null, events: [] }),
      saveMonitoring: async () => ({}),
      acknowledgeMonitoringEvent: async () => ({}),
      createDraft: async () => ({}),
      createScenario: async () => ({}),
      listScenarios: async () => ({ scenarios: [] }),
    }} onBack={() => undefined} />);

    expect(await screen.findByRole("heading", { name: "Run approved model" })).toBeVisible();
    expect(screen.getByText("What will neodymium cost?")).toBeVisible();
    expect(screen.getByText(/without altering its approved structure/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /edit structure/i })).not.toBeInTheDocument();
  });

  it("shows the selected approved graph read-only before Edit creates a separate draft", async () => {
    render(<ExistingProjectWorkspace mode="edit" projectId="project-1" client={{
      getProject: async () => ({ id: "project-1", name: "Neodymium model", target_id: "target-1", graph_id: "graph-1", active_graph_version: 4, evidence_classification: "local_verified" }),
      getTarget: async () => ({ question: "What will neodymium cost?", forecast_origin: "2026-07-28T00:00:00Z", resolution_at: "2027-07-28T00:00:00Z" }),
      getGraph: async () => ({ nodes: { input: { name: "Input signal", distribution_family: "Normal", parameters: { mu: 0, sigma: 1 }, depends_on: [], distribution_spec: { evidence_claim_ids: ["claim-node"] } }, outcome: { name: "Outcome", distribution_family: "Normal", parameters: { mu: 0, sigma: 1 }, depends_on: ["input"] } }, relationships: { "input-to-outcome": { parent_node_id: "input", child_node_id: "outcome", evidence_claim_ids: ["claim-edge"] } } }),
      shadowSimulate: async () => ({}), elicitDistribution: async () => ({}),
      runSimulation: async () => ({}), getMonitoring: async () => ({ config: null, events: [] }), saveMonitoring: async () => ({}), acknowledgeMonitoringEvent: async () => ({}), createDraft: async () => ({}), createScenario: async () => ({}), listScenarios: async () => ({ scenarios: [] }), getResearchReview: async () => ({ claims: [{ id: "claim-node", claim_text: "Node-linked evidence." }, { id: "claim-edge", claim_text: "Edge-linked evidence." }, { id: "unlinked", claim_text: "Unlinked evidence." }] }), reviewResearchClaim: async () => ({}),
    }} onBack={() => undefined} />);

    expect(await screen.findByLabelText("Approved model dependency graph")).toHaveTextContent("Approved graph — read-only");
    expect(within(screen.getByLabelText("Approved model dependency graph")).getByRole("button", { name: "Input signal" })).toBeVisible();
    expect(screen.getByLabelText("Distribution quantile elicitation")).toBeVisible();
    expect(await screen.findByLabelText("Evidence review drawer")).toHaveTextContent("Showing 2 claims linked to the approved graph.");
    expect(screen.getByLabelText("Evidence review drawer")).toHaveTextContent("Node-linked evidence.");
    expect(screen.getByLabelText("Evidence review drawer")).toHaveTextContent("Edge-linked evidence.");
    expect(screen.getByLabelText("Evidence review drawer")).not.toHaveTextContent("Unlinked evidence.");
  });
});
