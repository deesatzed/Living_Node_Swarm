import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectHomeLoader } from "./ProjectHomeLoader";

afterEach(cleanup);

describe("ProjectHomeLoader", () => {
  it("loads the saved target contract so Project Home shows a real target and horizon", async () => {
    render(<ProjectHomeLoader client={{
      listProjects: async () => ({ projects: [{ id: "project-1", name: "Neodymium", target_id: "target-1", stage: "vet", evidence_classification: "fixture_unverified", active_graph_version: null }] }),
      getTarget: async () => ({ id: "target-1", question: "What will neodymium cost?", forecast_origin: "2026-07-28T00:00:00Z", resolution_at: "2027-07-28T00:00:00Z" }),
    }} onAction={() => undefined} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading projects");
    expect(await screen.findByText("What will neodymium cost?")).toBeVisible();
    expect(screen.getByText("365 days")).toBeVisible();
  });

  it("shows the persisted last successful run receipt", async () => {
    render(<ProjectHomeLoader client={{ listProjects: async () => ({ projects: [{ id: "project-1", name: "Neodymium", last_run: { snapshot_id: "snapshot-9" } }] }), getTarget: async () => ({}) }} onAction={() => undefined} />);
    expect(await screen.findByRole("listitem")).toHaveTextContent("Snapshot snapshot-9");
  });
});
