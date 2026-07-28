import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DistributionInspector } from "./DistributionInspector";

afterEach(cleanup);

describe("DistributionInspector", () => {
  it("shows support, canonical parameters, as-of state, and provenance", () => {
    render(<DistributionInspector family="LogNormal" parameters={{ log_loc: 4.6, log_scale: 0.2 }} support="positive" asOf="2026-07-28" provenance="fixture_unverified" derived={{ mean: 102, median: 99, interval: "82–125 USD/kg" }} />);
    expect(screen.getByText("LogNormal")).toBeVisible();
    expect(screen.getByText("Support: positive")).toBeVisible();
    expect(screen.getByText("fixture_unverified")).toBeVisible();
    expect(screen.getByLabelText("LogNormal distribution curve")).toBeVisible();
    expect(screen.getByText("Mean: 102")).toBeVisible();
  });

  it.each(["Normal", "LogNormal", "Beta", "Poisson", "NegativeBinomial", "Gamma", "StudentT", "Deterministic"])("explains and previews the %s family", (family) => {
    render(<DistributionInspector family={family} parameters={{ location: 1 }} support="fixture support" asOf="2026-07-28" provenance="fixture_unverified" />);
    expect(screen.getByRole("heading", { name: family })).toBeVisible();
    expect(screen.getByText(/Plain-language fit:/)).toBeVisible();
    expect(screen.getByLabelText(`${family} distribution curve`)).toBeVisible();
  });

  it.each(["Normal", "LogNormal", "Beta", "Poisson", "NegativeBinomial", "Gamma", "StudentT", "Deterministic"])("makes tail behavior, alternatives, and limitations explicit for %s", (family) => {
    render(<DistributionInspector family={family} parameters={{ location: 1 }} support="fixture support" asOf="2026-07-28" provenance="fixture_unverified" />);

    expect(screen.getByLabelText("Distribution tail behavior")).not.toHaveTextContent("Not recorded");
    expect(screen.getByLabelText("Distribution alternatives")).not.toHaveTextContent("Not recorded");
    expect(screen.getByLabelText("Distribution limitations")).not.toHaveTextContent("Not recorded");
  });
});
