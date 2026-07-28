import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EvidenceDrawer } from "./EvidenceDrawer";

afterEach(cleanup);

describe("EvidenceDrawer", () => {
  it("shows claim source/conflict context and requires an explicit include decision", async () => {
    const user = userEvent.setup();
    const reviewResearchClaim = vi.fn(async () => ({}));
    render(<EvidenceDrawer targetId="target-1" client={{ getResearchReview: async () => ({ claims: [{ id: "claim-1", claim_text: "Supply concentration is a risk.", review_status: "unreviewed", source: { publisher: "Fixture publisher" }, conflicts_with_claim_ids: ["claim-2"] }] }), reviewResearchClaim }} />);
    expect(await screen.findByRole("listitem")).toHaveTextContent("Supply concentration is a risk.");
    expect(screen.getByText("Source: Fixture publisher")).toBeVisible();
    expect(screen.getByText("Conflicts: claim-2")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Include claim" }));
    expect(reviewResearchClaim).toHaveBeenCalledWith("target-1", "claim-1", expect.objectContaining({ decision: "included", reviewed_by: "operator" }));
    expect(screen.getByText("included")).toBeVisible();
  });
});
