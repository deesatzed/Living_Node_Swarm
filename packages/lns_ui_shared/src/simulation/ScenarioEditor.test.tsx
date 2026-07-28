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
});
