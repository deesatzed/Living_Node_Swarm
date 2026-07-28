import { cleanup, render, screen } from "@testing-library/react";
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
      createDraft: async () => ({}),
      createScenario: async () => ({}),
      listScenarios: async () => ({ scenarios: [] }),
    }} onBack={() => undefined} />);

    expect(await screen.findByRole("heading", { name: "Run approved model" })).toBeVisible();
    expect(screen.getByText("What will neodymium cost?")).toBeVisible();
    expect(screen.getByText(/without altering its approved structure/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /edit structure/i })).not.toBeInTheDocument();
  });
});
