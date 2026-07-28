import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CandidateMap } from "./CandidateMap";
import { createNeodymiumGraphFixture } from "../testing/graphFixture";

afterEach(cleanup);

describe("CandidateMap", () => {
  it("loads an explicitly labeled fixture proposal without presenting it as live research", async () => {
    const user = userEvent.setup();
    const createFixtureCandidateProposal = vi.fn(async () => createNeodymiumGraphFixture());
    render(<CandidateMap targetId="fixture-nd-retail-2027" client={{ createFixtureCandidateProposal }} />);

    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));

    expect(createFixtureCandidateProposal).toHaveBeenCalledWith("fixture-nd-retail-2027");
    expect(await screen.findByText("Fixture candidate map — not live research")).toBeVisible();
    expect(screen.getByRole("group", { name: "Visual target-centered graph" })).toBeVisible();
    expect(screen.getByLabelText("Warnings and limitations")).toHaveTextContent("Fixture data demonstrates GUI mechanics");
  });

  it("replays a fixture branch revision without mutating an active graph", async () => {
    const user = userEvent.setup();
    render(<CandidateMap targetId="fixture-nd-retail-2027" client={{ createFixtureCandidateProposal: async () => createNeodymiumGraphFixture() }} />);

    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));
    await screen.findByText("Fixture candidate map — not live research");
    await user.selectOptions(screen.getByLabelText("Candidate factor for fixture refinement"), "substitution_pressure");
    await user.click(screen.getByRole("button", { name: "Remove selected fixture factor" }));
    await user.selectOptions(screen.getByLabelText("Candidate factor for fixture refinement"), "freight_capacity");
    await user.click(screen.getByRole("button", { name: "Extend selected fixture branch" }));
    await user.click(screen.getByRole("button", { name: "Request fixture branch revision" }));

    expect(screen.getByLabelText("Fixture revision delta")).toHaveTextContent("Removed factor: Substitution pressure.");
    expect(screen.getByLabelText("Fixture revision delta")).toHaveTextContent("Added factor: Fixture branch extension for Freight capacity.");
    expect(screen.getByLabelText("Fixture revision delta")).toHaveTextContent("Active graph unchanged: yes.");
    expect(screen.getByText("Fixture branch revision saved for replay in this browser session only.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Replay fixture branch revision" }));
    expect(screen.getByRole("status")).toHaveTextContent("Replayed fixture branch revision without changing an active graph.");
  });

  it("stages reversible fixture candidate exclusion without activating a factor", async () => {
    const user = userEvent.setup();
    render(<CandidateMap targetId="fixture-nd-retail-2027" client={{ createFixtureCandidateProposal: async () => createNeodymiumGraphFixture() }} />);

    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));
    await user.selectOptions(screen.getByLabelText("Candidate factor for fixture refinement"), "freight_capacity");
    await user.click(screen.getByRole("button", { name: "Exclude selected fixture factor" }));
    expect(screen.getByLabelText("Fixture revision delta")).toHaveTextContent("Excluded factor: Freight capacity.");
    expect(screen.getByLabelText("Fixture revision delta")).toHaveTextContent("Active graph unchanged: yes.");
    await user.click(screen.getByRole("button", { name: "Include selected fixture factor" }));
    expect(screen.getByLabelText("Fixture revision delta")).toHaveTextContent("No fixture candidate changes staged.");
  });

  it("materializes a fixture proposal for separate review without claiming activation", async () => {
    const user = userEvent.setup();
    const materializeFixtureCandidateProposal = vi.fn(async () => ({ graph: { id: "fixture-graph-1" }, active_graph_mutated: false }));
    render(<CandidateMap targetId="fixture-nd-retail-2027" client={{ createFixtureCandidateProposal: async () => createNeodymiumGraphFixture(), materializeFixtureCandidateProposal }} />);
    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));
    await user.click(await screen.findByRole("button", { name: "Materialize fixture proposal for review" }));
    expect(materializeFixtureCandidateProposal).toHaveBeenCalledWith("fixture-nd-retail-2027");
    expect(await screen.findByRole("status")).toHaveTextContent("Fixture candidate graph fixture-graph-1 persisted for separate review; no factor is active.");
  });

  it("reports the persisted review graph to its Build workspace without treating it as approved", async () => {
    const user = userEvent.setup();
    const onMaterialized = vi.fn(async () => undefined);
    render(<CandidateMap targetId="fixture-nd-retail-2027" client={{
      createFixtureCandidateProposal: async () => createNeodymiumGraphFixture(),
      materializeFixtureCandidateProposal: async () => ({ graph: { id: "fixture-graph-2" }, active_graph_mutated: false }),
    }} onMaterialized={onMaterialized} />);

    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));
    await user.click(await screen.findByRole("button", { name: "Materialize fixture proposal for review" }));

    expect(onMaterialized).toHaveBeenCalledWith("fixture-graph-2");
    expect(await screen.findByRole("status")).toHaveTextContent("persisted for separate review; no factor is active");
  });

  it("keeps the persisted graph ID visible if the Build workspace handoff fails", async () => {
    const user = userEvent.setup();
    render(<CandidateMap targetId="fixture-nd-retail-2027" client={{
      createFixtureCandidateProposal: async () => createNeodymiumGraphFixture(),
      materializeFixtureCandidateProposal: async () => ({ graph: { id: "fixture-graph-3" }, active_graph_mutated: false }),
    }} onMaterialized={async () => { throw new Error("workspace unavailable"); }} />);

    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));
    await user.click(await screen.findByRole("button", { name: "Materialize fixture proposal for review" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Fixture candidate graph fixture-graph-3 persisted for separate review");
    expect(screen.getByRole("alert")).toHaveTextContent("persisted, but this Build workspace could not retain its graph ID");
  });

  it("creates an exact proposed-only structural review for a materialized direct fixture factor", async () => {
    const user = userEvent.setup();
    const createStructuralProposal = vi.fn(async () => ({ proposal: { id: "fixture-review-1", binding_hash: "fixture-hash", graph_version: 1 }, active_graph_mutated: false }));
    render(<CandidateMap targetId="fixture-nd-retail-2027" client={{
      createFixtureCandidateProposal: async () => createNeodymiumGraphFixture(),
      materializeFixtureCandidateProposal: async () => ({ graph: { id: "fixture-graph-4" }, active_graph_mutated: false }),
      createStructuralProposal,
    }} />);

    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));
    await user.click(await screen.findByRole("button", { name: "Materialize fixture proposal for review" }));
    await user.selectOptions(screen.getByLabelText("Candidate factor for fixture refinement"), "china_export_controls");
    await user.click(screen.getByRole("button", { name: "Create structural review for selected fixture factor" }));

    expect(createStructuralProposal).toHaveBeenCalledWith("fixture-graph-4", expect.objectContaining({ activated_node_ids: ["china_export_controls"] }));
    expect(await screen.findByLabelText("Fixture structural review")).toHaveTextContent("Binding hash: fixture-hash");
    expect(screen.getByLabelText("Fixture structural review")).toHaveTextContent("No factor is active until exact named approval");
  });

  it("creates an exact proposed-only structural review for a complete three-hop fixture path", async () => {
    const user = userEvent.setup();
    const fixture = createNeodymiumGraphFixture();
    fixture.relationships = fixture.relationships.map((relationship) => ({
      ...relationship,
      id: relationship.parent_node_id === "weather_disruption" ? "weather_to_freight"
        : relationship.parent_node_id === "freight_capacity" ? "freight_to_refining"
          : relationship.parent_node_id === "refining_throughput" ? "refining_to_target"
            : relationship.id,
    }));
    const createStructuralProposal = vi.fn(async () => ({ proposal: { id: "fixture-review-path", binding_hash: "fixture-path-hash", graph_version: 1 }, active_graph_mutated: false }));
    render(<CandidateMap targetId="fixture-nd-retail-2027" client={{
      createFixtureCandidateProposal: async () => fixture,
      materializeFixtureCandidateProposal: async () => ({ graph: { id: "fixture-graph-path" }, active_graph_mutated: false }),
      createStructuralProposal,
    }} />);

    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));
    await user.click(await screen.findByRole("button", { name: "Materialize fixture proposal for review" }));
    await user.selectOptions(screen.getByLabelText("Candidate factor for fixture refinement"), "weather_disruption");
    await user.click(screen.getByRole("button", { name: "Create structural review for complete selected fixture path" }));

    expect(createStructuralProposal).toHaveBeenCalledWith("fixture-graph-path", expect.objectContaining({
      activated_node_ids: ["weather_disruption", "freight_capacity", "refining_throughput"],
      relationships: expect.arrayContaining([
        expect.objectContaining({ id: "weather_to_freight" }),
        expect.objectContaining({ id: "freight_to_refining" }),
        expect.objectContaining({ id: "refining_to_target" }),
      ]),
    }));
    expect(await screen.findByLabelText("Fixture structural review")).toHaveTextContent("Binding hash: fixture-path-hash");
  });

  it("requires a named explicit review before approving a fixture structural binding for its project", async () => {
    const user = userEvent.setup();
    const approveProjectStructuralProposal = vi.fn(async () => ({ approval_receipt: { id: "receipt-1" }, graph: { graph_version: 2 }, project: { stage: "decide", active_graph_version: 2 } }));
    const shadowStructuralProposal = vi.fn(async () => ({ active_graph_mutated: false, active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 0.2, p50: 0.2 }, limitations: ["Fixture structural impact only."] }));
    render(<CandidateMap targetId="fixture-nd-retail-2027" projectId="project-1" client={{
      createFixtureCandidateProposal: async () => createNeodymiumGraphFixture(),
      materializeFixtureCandidateProposal: async () => ({ graph: { id: "fixture-graph-5" }, active_graph_mutated: false }),
      createStructuralProposal: async () => ({ proposal: { id: "fixture-review-2", binding_hash: "fixture-hash-2", graph_version: 1 }, active_graph_mutated: false }),
      shadowStructuralProposal,
      approveProjectStructuralProposal,
    }} />);

    await user.click(screen.getByRole("button", { name: "Load labeled fixture candidate map" }));
    await user.click(await screen.findByRole("button", { name: "Materialize fixture proposal for review" }));
    await user.selectOptions(screen.getByLabelText("Candidate factor for fixture refinement"), "china_export_controls");
    await user.click(screen.getByRole("button", { name: "Create structural review for selected fixture factor" }));
    expect(screen.getByRole("button", { name: "Approve fixture structural binding" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Run fixture structural in-memory comparison" }));
    expect(shadowStructuralProposal).toHaveBeenCalledWith("fixture-graph-5", "fixture-review-2", { target_node_id: "nd_private_retail_price_usd_per_kg" });
    expect(await screen.findByLabelText("Fixture structural comparison receipt")).toHaveTextContent("Active graph unchanged: yes.");
    await user.type(screen.getByLabelText("Fixture structural approver identity"), "operator");
    await user.click(screen.getByLabelText("I reviewed this fixture structural binding"));
    await user.click(screen.getByRole("button", { name: "Approve fixture structural binding" }));

    expect(approveProjectStructuralProposal).toHaveBeenCalledWith("project-1", "fixture-review-2", { approved_by: "operator", binding_hash: "fixture-hash-2" });
    expect(await screen.findByLabelText("Fixture structural approval receipt")).toHaveTextContent("Approved graph version: 2");
  });
});
