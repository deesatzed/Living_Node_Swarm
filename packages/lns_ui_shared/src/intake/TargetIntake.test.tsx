import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TargetIntake } from "./TargetIntake";

afterEach(cleanup);

describe("TargetIntake", () => {
  it("identifies the Neodymium retail series and blocks incomplete resolution contracts", async () => {
    const user = userEvent.setup();
    render(<TargetIntake onSubmit={vi.fn()} />);

    expect(screen.getByText(/private-investor retail series/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save target contract" }));

    expect(screen.getByRole("alert")).toHaveTextContent("price basis is required");
    expect(screen.getByRole("textbox", { name: "Price basis" })).toHaveAttribute("aria-invalid", "true");
  });

  it("submits every authoritative target-contract field with UTC timestamps", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TargetIntake onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: "Target identifier" }), "nd-retail-2027");
    await user.type(screen.getByRole("textbox", { name: "Question" }), "What will neodymium cost?");
    await user.type(screen.getByRole("textbox", { name: "Price basis" }), "retail");
    await user.type(screen.getByRole("textbox", { name: "Unit" }), "USD/kg");
    fireEvent.change(screen.getByLabelText("Forecast origin"), { target: { value: "2026-07-28T00:00" } });
    fireEvent.change(screen.getByLabelText("Resolution date"), { target: { value: "2027-07-28T00:00" } });
    await user.type(screen.getByRole("textbox", { name: "Observation rule" }), "first published value");
    await user.type(screen.getByRole("textbox", { name: "Missing-source fallback" }), "unresolved");
    await user.type(screen.getByRole("textbox", { name: "Revision policy" }), "first captured value");
    await user.click(screen.getByRole("button", { name: "Save target contract" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      id: "nd-retail-2027",
      forecast_origin: expect.stringMatching(/Z$/),
      resolution_at: expect.stringMatching(/Z$/),
      observation_rule: "first published value",
    }));
  });
});
