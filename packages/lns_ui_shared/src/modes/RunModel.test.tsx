import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunModel } from "./RunModel";

afterEach(cleanup);

describe("RunModel", () => {
  it("runs the selected graph without exposing structural mutation controls and shows its receipt", async () => {
    const user = userEvent.setup();
    const runSimulation = vi.fn(async () => ({ snapshot: { id: "snapshot-7", graph_version: 4, seed: 12, n_samples: 5000 }, sim_status: { freshness: "fresh" } }));
    render(<RunModel graphId="graph-1" client={{ runSimulation }} />);

    await user.click(screen.getByRole("button", { name: "Run approved version" }));

    expect(runSimulation).toHaveBeenCalledWith("graph-1");
    expect(await screen.findByText("Run receipt: snapshot-7")).toBeVisible();
    expect(screen.getByText("Graph version 4 · seed 12 · 5000 samples · fresh")).toBeVisible();
    expect(screen.queryByRole("button", { name: /edit structure/i })).not.toBeInTheDocument();
  });
});
