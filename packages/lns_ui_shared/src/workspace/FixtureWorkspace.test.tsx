import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FixtureWorkspace } from "./FixtureWorkspace";

describe("FixtureWorkspace", () => {
  it("composes target intake, graph, and warnings inside the workspace shell", () => {
    render(<FixtureWorkspace />);
    expect(screen.getByRole("form", { name: /resolution-grade target/i })).toBeVisible();
    expect(screen.getByLabelText("Target-centered dependency graph")).toBeVisible();
    expect(screen.getByLabelText("Warnings and limitations")).toBeVisible();
    expect(screen.getByLabelText("Distribution inspector")).toBeVisible();
  });
});
