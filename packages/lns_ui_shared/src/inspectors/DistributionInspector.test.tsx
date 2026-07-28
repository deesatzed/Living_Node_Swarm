import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DistributionInspector } from "./DistributionInspector";

afterEach(cleanup);

describe("DistributionInspector", () => {
  it("shows independently labeled material-number context", () => {
    render(<DistributionInspector family="LogNormal" parameters={{ log_loc: 4.6, log_scale: 0.2 }} support="positive" units="USD/kg" asOf="2026-07-28" provenance="fixture receipt" classification="model-inferred" derived={{ mean: 102, median: 99, interval: "82–125 USD/kg" }} />);
    expect(screen.getByText("LogNormal")).toBeVisible();
    expect(screen.getByText("Support: positive")).toBeVisible();
    expect(screen.getByText("Units: USD/kg")).toBeVisible();
    expect(screen.getByText("Classification: model-inferred")).toBeVisible();
    expect(screen.getByText("fixture receipt")).toBeVisible();
    expect(screen.getByLabelText("LogNormal distribution curve")).toBeVisible();
    expect(screen.getByText("Mean: 102")).toBeVisible();
    expect(screen.getByText("Value status: derived from the server-owned distribution specification")).toBeVisible();
  });

  it("makes missing material-number context explicit instead of inferring it", () => {
    render(<DistributionInspector family="Normal" parameters={{ loc: 1, scale: 2 }} support="real" asOf="" provenance="" />);

    expect(screen.getByText("Units: Not recorded")).toBeVisible();
    expect(screen.getByText("As of: Not recorded")).toBeVisible();
    expect(screen.getByText("Classification: Not recorded")).toBeVisible();
    expect(screen.getByText("Not recorded", { selector: "span" })).toBeVisible();
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
