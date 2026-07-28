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
});
