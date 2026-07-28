import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceShell } from "./WorkspaceShell";

describe("WorkspaceShell", () => {
  it("keeps target, version, freshness, classification, and all lifecycle stages visible", () => {
    render(
      <WorkspaceShell
        projectName="Neodymium retail"
        target="Private-investor retail neodymium price"
        horizon="1 year"
        graphVersion={3}
        freshness="stale"
        evidenceClassification="fixture_unverified"
        currentStage="quantify"
      >
        <p>Graph surface</p>
      </WorkspaceShell>,
    );

    expect(screen.getByText("Private-investor retail neodymium price")).toBeVisible();
    expect(screen.getByText("Graph v3")).toBeVisible();
    expect(screen.getByText("Fixture evidence — not live research")).toBeVisible();
    expect(screen.getByText("Graph surface")).toBeVisible();
    expect(screen.getByText("Current stage: Quantify")).toBeVisible();
    expect(screen.getByText("Quantify").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });
});
