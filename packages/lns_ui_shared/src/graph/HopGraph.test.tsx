import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HopGraph } from "./HopGraph";
import { createNeodymiumGraphFixture } from "../testing/graphFixture";

afterEach(cleanup);

describe("HopGraph", () => {
  it("renders a searchable textual alternative with non-color statuses", () => {
    const fixture = createNeodymiumGraphFixture();
    render(<HopGraph factors={fixture.factors} relationships={fixture.relationships} targetId="nd_private_retail_price_usd_per_kg" />);
    expect(screen.getByRole("searchbox", { name: "Search factors" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Weather disruption" })).toBeVisible();
    expect(screen.getAllByText("proposed")[0]).toBeVisible();
    expect(screen.getByLabelText("Textual model dependencies")).toHaveTextContent("Weather disruption → Freight capacity — proposed; fixture_unverified");
  });

  it("renders a target-centered visual map with keyboard-selectable nodes and state filters", async () => {
    const user = userEvent.setup();
    render(<HopGraph factors={createNeodymiumGraphFixture().factors} targetLabel="Neodymium target" />);

    expect(screen.getByRole("group", { name: "Visual target-centered graph" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Neodymium target" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Weather disruption" }));
    expect(screen.getByRole("status")).toHaveTextContent("Selected Weather disruption");
    await user.selectOptions(screen.getByLabelText("Filter graph state"), "excluded");
    expect(screen.getByRole("button", { name: "Substitution pressure" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Weather disruption" })).not.toBeInTheDocument();
  });

  it("supports hop focus, viewport controls, arrow-key selection, and a traced relationship path", async () => {
    const user = userEvent.setup();
    const fixture = createNeodymiumGraphFixture();
    render(<HopGraph factors={fixture.factors} targetLabel="Neodymium target" targetId="nd_private_retail_price_usd_per_kg" relationships={fixture.relationships} />);

    await user.selectOptions(screen.getByLabelText("Focus graph hop"), "3");
    expect(screen.getByRole("button", { name: "Weather disruption" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Freight capacity" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Focus graph hop"), "all");
    const graph = screen.getByRole("group", { name: "Visual target-centered graph" });
    graph.focus();
    expect(graph).toHaveFocus();
    expect(graph).toHaveAttribute("aria-describedby", expect.stringContaining("r"));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("status")).toHaveTextContent("Selected Weather disruption");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("status")).toHaveTextContent("Selected Freight capacity");
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("group", { name: "Visual target-centered graph" })).toHaveAttribute("data-zoom", "1.25");
    fireEvent.mouseDown(graph, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(graph, { clientX: 35, clientY: 40 });
    fireEvent.mouseUp(graph);
    expect(graph).toHaveAttribute("data-pan", "25,30");
    await user.click(screen.getByRole("button", { name: "Fit graph to view" }));
    expect(screen.getByRole("group", { name: "Visual target-centered graph" })).toHaveAttribute("data-zoom", "1");
    expect(screen.getByRole("group", { name: "Visual target-centered graph" })).toHaveAttribute("data-pan", "0,0");
  });
});
