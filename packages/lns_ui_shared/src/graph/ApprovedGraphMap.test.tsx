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
    expect(screen.getByLabelText("Approved dependency details")).toHaveTextContent("Freight capacity depends on Weather disruption · relationship type: Not recorded · transform: Not recorded · sign: Not recorded · units: Not recorded · coefficient parameters: Not recorded · lag: Not recorded · evidence: unknown · state: Not recorded");
    expect(screen.getByLabelText("Target-centered dependency graph")).toHaveTextContent("Weather disruption");
    await user.click(screen.getByRole("button", { name: "Weather disruption" }));
    expect(screen.getByRole("status")).toHaveTextContent("Traced path: Weather disruption → Freight capacity → Neodymium price");
    expect(screen.getByText(/approved graph itself is not edited here/i)).toBeVisible();
  });

  it("shows persisted relationship semantics for an approved dependency instead of replacing them with defaults", () => {
    render(<ApprovedGraphMap graph={{
      nodes: {
        freight: { name: "Freight capacity", depends_on: [] },
        target: { name: "Neodymium price", depends_on: ["freight"] },
      },
      relationships: {
        "freight-to-target": {
          id: "freight-to-target", parent_node_id: "freight", child_node_id: "target",
          relationship_type: "causal_hypothesis", transform: "affine", sign: "negative",
          source_unit: "capacity-index", target_unit: "USD/kg", coefficient_units: "USD/kg / capacity-index",
          coefficient_parameters: [{ id: "coefficient", value: -0.25 }], lag_periods: 2, lag_unit: "month",
          evidence_claim_ids: ["claim-freight"], state: "active",
        },
      },
    }} />);

    const details = screen.getByLabelText("Approved dependency details");
    expect(details).toHaveTextContent("relationship type: causal_hypothesis");
    expect(details).toHaveTextContent("transform: affine");
    expect(details).toHaveTextContent("sign: negative");
    expect(details).toHaveTextContent("units: capacity-index → USD/kg; coefficient units: USD/kg / capacity-index");
    expect(details).toHaveTextContent("coefficient parameters: coefficient = -0.25");
    expect(details).toHaveTextContent("lag: 2 month");
    expect(details).toHaveTextContent("evidence: claim-freight · state: active");
  });
});
