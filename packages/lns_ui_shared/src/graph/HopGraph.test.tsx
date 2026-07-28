import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HopGraph } from "./HopGraph";
import { createNeodymiumGraphFixture } from "../testing/graphFixture";

describe("HopGraph", () => {
  it("renders a searchable textual alternative with non-color statuses", () => {
    render(<HopGraph factors={createNeodymiumGraphFixture().factors} />);
    expect(screen.getByRole("searchbox", { name: "Search factors" })).toBeVisible();
    expect(screen.getByText("Weather disruption")).toBeVisible();
    expect(screen.getAllByText("proposed")[0]).toBeVisible();
  });
});
