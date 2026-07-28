import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HopGraph } from "./HopGraph";
import { createNeodymiumGraphFixture } from "../testing/graphFixture";

afterEach(cleanup);

describe("HopGraph", () => {
  it("renders a searchable textual alternative with non-color statuses", () => {
    render(<HopGraph factors={createNeodymiumGraphFixture().factors} />);
    expect(screen.getByRole("searchbox", { name: "Search factors" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Weather disruption" })).toBeVisible();
    expect(screen.getAllByText("proposed")[0]).toBeVisible();
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
});
