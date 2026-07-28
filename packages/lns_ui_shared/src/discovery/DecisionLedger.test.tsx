import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DecisionLedger } from "./DecisionLedger";

afterEach(cleanup);

describe("DecisionLedger", () => {
  it("persists a typed user claim to the project before candidate mapping", async () => {
    const user = userEvent.setup();
    const patchProject = vi.fn(async () => ({}));
    render(<DecisionLedger projectId="project-1" client={{ patchProject }} />);

    await user.type(screen.getByLabelText("Discovery entry"), "Freight disruption may affect refining.");
    await user.selectOptions(screen.getByLabelText("Entry classification"), "user_claim");
    await user.click(screen.getByRole("button", { name: "Save discovery entry" }));

    expect(patchProject).toHaveBeenCalledWith("project-1", { discovery_ledger: [{ classification: "user_claim", text: "Freight disruption may affect refining." }] });
    expect(await screen.findByRole("status")).toHaveTextContent("Discovery entry saved.");
  });
});
