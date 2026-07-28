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
  });
});
