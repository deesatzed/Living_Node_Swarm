import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ApprovedGraphMap } from "./ApprovedGraphMap";

afterEach(cleanup);

describe("ApprovedGraphMap", () => {
  it("derives a read-only target-centered graph and path from the approved graph payload", async () => {
    const user = userEvent.setup();
    render(<ApprovedGraphMap graph={{ nodes: {
      weather: { name: "Weather disruption", depends_on: [] },
      freight: { name: "Freight capacity", depends_on: ["weather"] },
      target: { name: "Neodymium price", depends_on: ["freight"] },
    } }} />);

    expect(screen.getByLabelText("Approved model dependency graph")).toHaveTextContent("Approved graph — read-only");
    expect(screen.getByLabelText("Target-centered dependency graph")).toHaveTextContent("Weather disruption");
    await user.click(screen.getByRole("button", { name: "Weather disruption" }));
    expect(screen.getByRole("status")).toHaveTextContent("Traced path: Weather disruption → Freight capacity → Neodymium price");
    expect(screen.getByText(/approved graph itself is not edited here/i)).toBeVisible();
  });
});
