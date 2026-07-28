import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelationshipInspector } from "./RelationshipInspector";

afterEach(cleanup);

describe("RelationshipInspector", () => {
  it("makes relationship type, units, lag, evidence, and approval state reviewable and editable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RelationshipInspector relationship={{
      id: "weather-to-freight",
      parentLabel: "Weather disruption",
      childLabel: "Freight capacity",
      type: "affine",
      units: "capacity-index / disruption-index",
      lagSteps: 1,
      evidence: "fixture_unverified",
      state: "proposed",
    }} onChange={onChange} />);

    expect(screen.getByText("Weather disruption → Freight capacity")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Units" })).toHaveValue("capacity-index / disruption-index");
    expect(screen.getByText("fixture_unverified")).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Relationship state"), "excluded");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ state: "excluded" }));
  });
});
