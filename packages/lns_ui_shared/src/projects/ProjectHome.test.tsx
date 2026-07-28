import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectHome } from "./ProjectHome";

afterEach(cleanup);

describe("ProjectHome", () => {
  it("offers New, Run, Edit, and Monitor paths while exposing project truth", () => {
    render(
      <ProjectHome
        projects={[
          {
            id: "fixture-nd",
            name: "Neodymium retail one-year model",
            target: "Private-investor retail neodymium price",
            horizon: "1 year",
            stage: "vet",
            activeGraphVersion: 3,
            freshness: "stale",
            warningCount: 2,
            evidenceClassification: "fixture_unverified",
            lastRun: "Not yet run",
            candidateStatus: "Draft based on graph v3",
            monitoringStatus: "Fixture only — no retrieval",
          },
        ]}
        onAction={vi.fn()}
      />,
    );

    for (const action of ["New project", "Run model", "Edit model", "Monitor"]) {
      expect(screen.getByRole("button", { name: action })).toBeVisible();
    }
    expect(screen.getByText("Private-investor retail neodymium price")).toBeVisible();
    expect(screen.getByText("Fixture evidence — not live research")).toBeVisible();
    expect(screen.getByText("2 unresolved warnings")).toBeVisible();
    expect(screen.getByText("Candidate status: Draft based on graph v3")).toBeVisible();
    expect(screen.getByText("Monitoring: Fixture only — no retrieval")).toBeVisible();
  });

  it("runs an existing selected project without treating it as a new build", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<ProjectHome projects={[{
      id: "approved-1", name: "Approved model", target: "Target", horizon: "1 year", stage: "monitor",
      activeGraphVersion: 4, freshness: "active", warningCount: 0, evidenceClassification: "local_verified", lastRun: "2026-07-28",
      candidateStatus: "No saved draft",
      monitoringStatus: "Not configured",
    }]} onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Run model" }));

    expect(onAction).toHaveBeenCalledWith("run", "approved-1");
  });

  it("uses the project explicitly selected by the operator for existing-model actions", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const projects = ["first", "second"].map((id) => ({
      id, name: `${id} model`, target: `${id} target`, horizon: "1 year", stage: "monitor",
      activeGraphVersion: 4, freshness: "active" as const, warningCount: 0, evidenceClassification: "local_verified" as const, lastRun: "2026-07-28",
      candidateStatus: "No saved draft",
      monitoringStatus: "Not configured",
    }));
    render(<ProjectHome projects={projects} onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Select second model" }));
    await user.click(screen.getByRole("button", { name: "Monitor" }));

    expect(onAction).toHaveBeenCalledWith("monitor", "second");
  });
});
