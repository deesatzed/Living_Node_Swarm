import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VettingConversation } from "./VettingConversation";

describe("VettingConversation", () => {
  it("offers transparent discovery controls and shows routing scope before consent", () => {
    render(<VettingConversation provider="OpenRouter" model="fixture-model" dataScope="No data leaves this fixture." />);

    for (const label of ["Pause", "Proceed now", "Ask another question", "Add source", "Add direction", "Exclude direction", "Correct understanding"]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    }
    expect(screen.getByText("OpenRouter · fixture-model")).toBeVisible();
    expect(screen.getByText("No data leaves this fixture.")).toBeVisible();
  });
});
