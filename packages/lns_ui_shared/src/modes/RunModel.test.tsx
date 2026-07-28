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

  it("can persist a successful receipt without changing the run request", async () => {
    const user = userEvent.setup();
    const result = { snapshot: { id: "snapshot-8", graph_version: 5, seed: 14, n_samples: 1000 }, sim_status: { freshness: "fresh" } };
    const onReceipt = vi.fn(async () => undefined);
    render(<RunModel graphId="graph-1" client={{ runSimulation: async () => result }} onReceipt={onReceipt} />);
    await user.click(screen.getByRole("button", { name: "Run approved version" }));
    expect(onReceipt).toHaveBeenCalledWith(result);
  });

  it("renders authoritative outcome quantiles and stability limits from the run receipt", async () => {
    const user = userEvent.setup();
    render(<RunModel graphId="graph-1" client={{ runSimulation: async () => ({
      snapshot: {
        id: "snapshot-9", graph_version: 6, seed: 21, n_samples: 2000,
        node_predictives: { target_price: { node_id: "target_price", derived_mean: 48.2, derived_median: 47.8, derived_std: 5.1, quantiles: { p05: 40.1, p50: 47.8, p95: 56.4 } } },
        stability_diagnostic: { method: "multi_seed_multi_sample_quantile_range", seeds: [21, 22], sample_counts: [1000, 2000], node_metric_ranges: { target_price: { mean: 0.4, p50: 0.3 } }, limitations: "This measures Monte Carlo stability only; it does not establish forecast accuracy or model calibration." },
      }, sim_status: { freshness: "fresh" },
    }) }} />);

    await user.click(screen.getByRole("button", { name: "Run approved version" }));

    expect(await screen.findByLabelText("Run outcome summaries")).toHaveTextContent("target_price · mean 48.2 · median 47.8 · p05 40.1 · p95 56.4 · standard deviation 5.1");
    expect(screen.getByLabelText("Run stability diagnostic")).toHaveTextContent("Method: multi_seed_multi_sample_quantile_range");
    expect(screen.getByLabelText("Run stability diagnostic")).toHaveTextContent("Seeds: 21, 22 · sample counts: 1000, 2000");
    expect(screen.getByLabelText("Run stability diagnostic")).toHaveTextContent("target_price: mean range 0.4 · p50 range 0.3");
    expect(screen.getByText(/does not establish forecast accuracy/i)).toBeVisible();
  });

  it("keeps a failed authoritative snapshot explicit instead of presenting it as a successful run", async () => {
    const user = userEvent.setup();
    render(<RunModel graphId="graph-1" client={{ runSimulation: async () => ({ snapshot: { id: "snapshot-failed", graph_version: 6, seed: 21, n_samples: 2000, status: "failed", error: "Node outcome has invalid transform parameters." }, sim_status: { freshness: "failed" } }) }} />);
    await user.click(screen.getByRole("button", { name: "Run approved version" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Run snapshot-failed failed: Node outcome has invalid transform parameters.");
    expect(screen.getByText("No successful outcome summary is available from this failed run.")).toBeVisible();
  });

  it("shows persisted receipt history without rerunning or editing the approved graph", async () => {
    render(<RunModel graphId="graph-1" client={{
      runSimulation: async () => ({ snapshot: {} }),
      listSnapshots: async () => ({ snapshots: [{ id: "snapshot-older", graph_version: 3, seed: 10, n_samples: 1000, status: "complete", finished_at: "2026-07-28T00:00:00Z" }] }),
    }} />);

    expect(await screen.findByLabelText("Prior run receipts")).toHaveTextContent("snapshot-older · graph v3 · seed 10 · 1000 samples · complete");
    expect(screen.getByLabelText("Prior run receipts")).toHaveTextContent("does not rerun or alter the approved graph");
  });
});
