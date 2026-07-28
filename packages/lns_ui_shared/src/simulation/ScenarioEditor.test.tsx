import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioEditor } from "./ScenarioEditor";

afterEach(cleanup);

describe("ScenarioEditor", () => {
  it("saves a named assumption without changing the active graph", async () => {
    const user = userEvent.setup();
    const createScenario = vi.fn(async () => ({ id: "upside", name: "Upside" }));
    render(<ScenarioEditor projectId="project-1" client={{ createScenario, listScenarios: async () => ({ scenarios: [{ id: "base", name: "Base case" }] }) }} />);

    await user.type(screen.getByLabelText("Scenario name"), "Upside");
    await user.type(screen.getByLabelText("Assumption"), "Demand grows faster");
    await user.click(screen.getByRole("button", { name: "Save named scenario" }));

    expect(createScenario).toHaveBeenCalledWith("project-1", expect.objectContaining({ name: "Upside", assumptions: { note: "Demand grows faster" } }));
    expect(await screen.findByRole("status")).toHaveTextContent("Scenario Upside saved without changing the active graph.");
    expect(await screen.findByRole("list", { name: "Saved scenarios" })).toHaveTextContent("Base case");
    expect(screen.getByText(/not applied to the approved run/i)).toBeVisible();
  });

  it("saves and runs a version-bound parameter scenario only as an in-memory comparison", async () => {
    const user = userEvent.setup();
    const createScenario = vi.fn(async (projectId, scenario) => ({ ...scenario, id: "upside" }));
    const simulateScenario = vi.fn(async () => ({ comparison: { active_summary: { mean: 10 }, candidate_summary: { mean: 12 } }, active_graph_mutated: false }));
    render(<ScenarioEditor projectId="project-1" activeGraphVersion={4} targetNodeId="outcome" client={{ createScenario, simulateScenario, listScenarios: async () => ({ scenarios: [] }) }} />);

    await user.type(screen.getByLabelText("Scenario name"), "Upside");
    await user.type(screen.getByLabelText("Assumption"), "Demand grows faster");
    await user.type(screen.getByLabelText("Override node ID"), "input_signal");
    await user.type(screen.getByLabelText("Override parameter"), "mu");
    await user.type(screen.getByLabelText("Override value"), "5");
    await user.click(screen.getByRole("button", { name: "Save named scenario" }));

    expect(createScenario).toHaveBeenCalledWith("project-1", expect.objectContaining({ base_graph_version: 4, target_node_id: "outcome", parameter_overrides: { input_signal: { mu: 5 } } }));
    await user.click(await screen.findByRole("button", { name: "Run saved scenario Upside" }));
    expect(simulateScenario).toHaveBeenCalledWith("project-1", "upside");
    expect(await screen.findByLabelText("Scenario comparison receipt")).toHaveTextContent("Active mean: 10 · Scenario mean: 12");
    expect(screen.getByLabelText("Scenario comparison receipt")).toHaveTextContent("does not activate, approve, or persist a changed graph");
  });
});
