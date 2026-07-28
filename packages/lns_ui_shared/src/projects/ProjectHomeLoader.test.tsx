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

  it("shows the persisted draft base instead of implying a candidate is active", async () => {
    render(<ProjectHomeLoader client={{ listProjects: async () => ({ projects: [{ id: "project-1", name: "Neodymium", active_graph_version: 5, draft_base_version: 5, stage: "refine" }] }), getTarget: async () => ({}) }} onAction={() => undefined} />);
    expect(await screen.findByText("Candidate status: Draft based on graph v5")).toBeVisible();
  });

  it("shows saved monitoring truth and counts only unresolved warning events", async () => {
    render(<ProjectHomeLoader client={{
      listProjects: async () => ({ projects: [{ id: "project-1", name: "Neodymium" }] }),
      getTarget: async () => ({}),
      getMonitoring: async () => ({ config: { mode: "live" }, events: [
        { id: "warning", severity: "warning", acknowledged_at: null },
        { id: "acknowledged", severity: "warning", acknowledged_at: "2026-07-28T00:00:00Z" },
        { id: "info", severity: "info", acknowledged_at: null },
      ] }),
    }} onAction={() => undefined} />);

    expect(await screen.findByText("Monitoring: Saved live preference — polling not running")).toBeVisible();
    expect(screen.getByText("1 unresolved warnings")).toBeVisible();
  });
});
