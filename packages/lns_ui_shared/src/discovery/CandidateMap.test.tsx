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
});
