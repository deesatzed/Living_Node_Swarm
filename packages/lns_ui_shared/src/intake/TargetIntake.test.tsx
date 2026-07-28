import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TargetIntake } from "./TargetIntake";

describe("TargetIntake", () => {
  it("identifies the Neodymium retail series and blocks incomplete resolution contracts", async () => {
    const user = userEvent.setup();
    render(<TargetIntake onSubmit={vi.fn()} />);

    expect(screen.getByText(/private-investor retail series/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save target contract" }));

    expect(screen.getByRole("alert")).toHaveTextContent("price basis is required");
    expect(screen.getByRole("textbox", { name: "Price basis" })).toHaveAttribute("aria-invalid", "true");
  });
});
