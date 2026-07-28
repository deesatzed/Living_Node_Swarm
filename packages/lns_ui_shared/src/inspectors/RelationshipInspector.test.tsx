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
      sign: "negative",
      transform: "affine",
      coefficientDistribution: "Normal(0, 0.2)",
      sourceUnit: "disruption-index",
      targetUnit: "capacity-index",
      lagUnit: "months",
      validityRange: "Normal operating regime",
      evidence: "fixture_unverified",
      evidenceLinks: ["fixture://weather-to-freight"],
      warnings: ["Coefficient remains uncalibrated."],
      state: "proposed",
    }} onChange={onChange} />);

    expect(screen.getByText("Weather disruption → Freight capacity")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Units" })).toHaveValue("capacity-index / disruption-index");
    expect(screen.getByText("fixture_unverified")).toBeVisible();
    expect(screen.getByLabelText("Sign")).toHaveValue("negative");
    expect(screen.getByText("Coefficient remains uncalibrated.")).toBeVisible();
    expect(screen.getByText("fixture://weather-to-freight")).toBeVisible();
    expect(screen.getByText(/Draft-only changes/)).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Relationship state"), "excluded");
    await user.selectOptions(screen.getByLabelText("Sign"), "positive");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ state: "excluded" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sign: "positive" }));
  });
});
