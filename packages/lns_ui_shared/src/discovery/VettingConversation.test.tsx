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

  it("persists a typed discovery action and allows a paused exchange to resume", async () => {
    const user = userEvent.setup();
    const onRecord = vi.fn(async () => undefined);
    render(<VettingConversation provider="No provider selected" model="No model selected" dataScope="No content leaves this Mac." onRecord={onRecord} />);

    await user.click(screen.getByRole("button", { name: "Add direction" }));
    await user.type(screen.getByLabelText("Proposed direction"), "Freight capacity may constrain refinery output.");
    await user.click(screen.getByRole("button", { name: "Save discovery action" }));
    expect(onRecord).toHaveBeenCalledWith({ classification: "inference", text: "Freight capacity may constrain refinery output." });
    expect(await screen.findByRole("status")).toHaveTextContent("Add direction saved");
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Proceed now" })).toBeDisabled();
  });

  it("records a local-only preference without granting provider routing", async () => {
    const user = userEvent.setup();
    const onRecordLocalOnly = vi.fn(async () => undefined);
    render(<VettingConversation provider="No provider selected" model="No model selected" dataScope="No content leaves this Mac." onRecordLocalOnly={onRecordLocalOnly} />);

    await user.click(screen.getByRole("button", { name: "Keep research local" }));
    expect(onRecordLocalOnly).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent("Local-only research preference saved");
    expect(screen.getByText(/requires explicit confirmation/i)).toBeVisible();
  });
});
