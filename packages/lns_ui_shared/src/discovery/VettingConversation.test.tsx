import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VettingConversation } from "./VettingConversation";

afterEach(cleanup);

describe("VettingConversation", () => {
  it("offers transparent discovery controls and shows routing scope before consent", () => {
    render(<VettingConversation provider="OpenRouter" model="fixture-model" dataScope="No data leaves this fixture." />);

    for (const label of ["Pause", "Proceed now", "Ask another question", "Add source", "Add direction", "Exclude direction", "Correct understanding"]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    }
    expect(screen.getByText("OpenRouter · fixture-model")).toBeVisible();
    expect(screen.getByText("No data leaves this fixture.")).toBeVisible();
  });

  it("lets an operator proceed from Vet without treating provider consent as granted", async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();
    render(<VettingConversation provider="OpenRouter" model="fixture-model" dataScope="No data leaves this fixture." onProceed={onProceed} />);

    await user.click(screen.getByRole("button", { name: "Proceed now" }));

    expect(onProceed).toHaveBeenCalledOnce();
    expect(screen.getByText(/requires explicit confirmation/i)).toBeVisible();
  });
});
