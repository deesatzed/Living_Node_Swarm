import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WarningCenter } from "./WarningCenter";

describe("WarningCenter", () => {
  it("renders warning severity and limitation text without color-only status", () => {
    render(<WarningCenter warnings={[{ id: "dependence", severity: "warning", message: "Unresolved dependence: freight and energy share evidence." }]} />);
    expect(screen.getByText("Warning")).toBeVisible();
    expect(screen.getByText(/Unresolved dependence/)).toBeVisible();
  });
});
