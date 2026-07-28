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

  it("runs a bounded local sensitivity report without changing the approved graph", async () => {
    const user = userEvent.setup();
    const runLocalSensitivity = vi.fn(async () => ({ method: "one_at_a_time_local_finite_difference", active_graph_mutated: false, rows: [{ node_id: "input_signal", parameter: "mu", delta_mean: 1.5, delta_p50: 1.4 }], limitations: ["This is local structural sensitivity, not causal attribution."] }));
    render(<RunModel graphId="graph-1" targetNodeId="outcome" client={{ runSimulation: async () => ({ snapshot: {} }), runLocalSensitivity }} />);

    await user.clear(screen.getByLabelText("Local sensitivity fraction"));
    await user.type(screen.getByLabelText("Local sensitivity fraction"), "0.1");
    await user.click(screen.getByRole("button", { name: "Run local sensitivity" }));

    expect(runLocalSensitivity).toHaveBeenCalledWith("graph-1", { target_node_id: "outcome", perturbation_fraction: 0.1 });
    expect(await screen.findByLabelText("Local sensitivity analysis")).toHaveTextContent("input_signal.mu: mean delta 1.5 · median delta 1.4");
    expect(screen.getByLabelText("Sensitivity limitations")).toHaveTextContent("not causal attribution");
    expect(screen.getByText("Active graph unchanged: yes.")).toBeVisible();
  });

  it("submits explicit model versions and weights to the backend mixture comparison", async () => {
    const user = userEvent.setup();
    const runWeightedEnsemble = vi.fn(async () => ({ mixture: { derived_mean: 8, derived_median: 7.5 }, members: [{ member_id: "graph-1@4:outcome", normalized_weight: 0.25 }, { member_id: "graph-2@3:outcome", normalized_weight: 0.75 }], active_graph_mutated: false, limitations: ["This is a weighted distribution mixture, not an arithmetic average of member means."] }));
    render(<RunModel graphId="graph-1" targetNodeId="outcome" activeGraphVersion={4} client={{ runSimulation: async () => ({ snapshot: {} }), runWeightedEnsemble }} />);

    await user.clear(screen.getByLabelText("Current model weight")); await user.type(screen.getByLabelText("Current model weight"), "1");
    await user.type(screen.getByLabelText("Alternative graph ID"), "graph-2");
    await user.type(screen.getByLabelText("Alternative graph version"), "3");
    await user.type(screen.getByLabelText("Alternative target node ID"), "outcome");
    await user.clear(screen.getByLabelText("Alternative model weight")); await user.type(screen.getByLabelText("Alternative model weight"), "3");
    await user.click(screen.getByRole("button", { name: "Compare weighted model mixture" }));

    expect(runWeightedEnsemble).toHaveBeenCalledWith([{ graph_id: "graph-1", graph_version: 4, target_node_id: "outcome", weight: 1 }, { graph_id: "graph-2", graph_version: 3, target_node_id: "outcome", weight: 3 }]);
    expect(await screen.findByLabelText("Weighted mixture receipt")).toHaveTextContent("Mixture mean: 8 · median: 7.5");
    expect(screen.getByLabelText("Weighted mixture limitations")).toHaveTextContent("not an arithmetic average");
    expect(screen.getByText("Active graphs unchanged: yes.")).toBeVisible();
  });

  it("saves and restores a two-model configuration as review-only state", async () => {
    const user = userEvent.setup();
    const createEnsemble = vi.fn(async (_projectId, ensemble) => ensemble);
    render(<RunModel graphId="graph-1" targetNodeId="outcome" activeGraphVersion={4} projectId="project-1" client={{ runSimulation: async () => ({ snapshot: {} }), runWeightedEnsemble: async () => ({}), createEnsemble, listEnsembles: async () => ({ ensembles: [] }) }} />);
    await user.type(screen.getByLabelText("Alternative graph ID"), "graph-2");
    await user.type(screen.getByLabelText("Alternative graph version"), "3");
    await user.type(screen.getByLabelText("Alternative target node ID"), "outcome");
    await user.type(screen.getByLabelText("Ensemble configuration name"), "Two-model blend");
    await user.click(screen.getByRole("button", { name: "Save ensemble for review" }));

    expect(createEnsemble).toHaveBeenCalledWith("project-1", expect.objectContaining({ name: "Two-model blend", members: [{ graph_id: "graph-1", graph_version: 4, target_node_id: "outcome", weight: 1 }, { graph_id: "graph-2", graph_version: 3, target_node_id: "outcome", weight: 1 }] }));
    expect(await screen.findByRole("status")).toHaveTextContent("saved for review only; it is not approved or active");
    expect(screen.getByLabelText("Saved ensemble configurations")).toHaveTextContent("Saved configurations are not approved or active");
  });
});
