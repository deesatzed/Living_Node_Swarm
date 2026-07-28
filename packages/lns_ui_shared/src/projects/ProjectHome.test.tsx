import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectHome } from "./ProjectHome";

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
  });
});
