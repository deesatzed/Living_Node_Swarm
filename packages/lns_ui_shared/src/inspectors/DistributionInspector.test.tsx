import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DistributionInspector } from "./DistributionInspector";

describe("DistributionInspector", () => {
  it("shows support, canonical parameters, as-of state, and provenance", () => {
    render(<DistributionInspector family="LogNormal" parameters={{ log_loc: 4.6, log_scale: 0.2 }} support="positive" asOf="2026-07-28" provenance="fixture_unverified" />);
    expect(screen.getByText("LogNormal")).toBeVisible();
    expect(screen.getByText("Support: positive")).toBeVisible();
    expect(screen.getByText("fixture_unverified")).toBeVisible();
  });
});
