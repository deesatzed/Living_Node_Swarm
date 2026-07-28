import { describe, expect, it } from "vitest";
import { createFixtureApi } from "./fakeApi";

describe("fixture API", () => {
  it("returns a clearly labeled Neodymium proposal without mutating active structure", async () => {
    const api = createFixtureApi();
    const proposal = await api.createFixtureCandidateProposal("fixture-nd-retail-2027");

    expect(proposal.generation_basis).toBe("deterministic_fixture");
    expect(proposal.active_graph_mutated).toBe(false);
    expect(proposal.factors).toHaveLength(30);
    expect(proposal.factors.every((factor) => factor.evidence_status === "fixture_unverified")).toBe(true);
  });
});
