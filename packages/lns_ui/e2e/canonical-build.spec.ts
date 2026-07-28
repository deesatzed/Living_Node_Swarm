import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`canonical Build entry remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/projects", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { projects: [] } });
      return route.fulfill({ json: { id: "fixture-project" } });
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Prediction projects" })).toBeVisible();
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("form", { name: /resolution-grade target/i })).toBeVisible();
    await page.screenshot({ path: `../../docs/verification/gui/canonical-build-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}

test("canonical Monitor inspects a fixture event and branches into a version-bound Edit draft", async ({ page }) => {
  const project = { id: "approved-1", name: "Approved neodymium model", target_id: "target-1", graph_id: "graph-1", active_graph_version: 4, stage: "monitor", evidence_classification: "fixture_unverified" };
  await page.route("**/api/projects", (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/targets/target-1", (route) => route.fulfill({ json: { question: "What will neodymium cost?", forecast_origin: "2026-07-28T00:00:00Z", resolution_at: "2027-07-28T00:00:00Z" } }));
  await page.route("**/api/projects/approved-1/monitoring", (route) => route.fulfill({ json: { config: { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" }, events: [{ id: "stale-source", severity: "warning", message: "Fixture source is stale", evidence_classification: "fixture_unverified" }] } }));
  await page.route("**/api/projects/approved-1/drafts", (route) => route.fulfill({ json: { id: "draft-1", base_graph_version: 4 } }));
  await page.route("**/api/projects/approved-1/revisions", (route) => route.fulfill({ json: { drafts: [{ id: "draft-earlier", base_graph_version: 4 }] } }));
  await page.route("**/api/graphs/graph-1", (route) => route.fulfill({ json: { nodes: {
    input_signal: { id: "input_signal", name: "Input signal", distribution_family: "Normal", parameters: { mu: 0, sigma: 1 }, depends_on: [] },
    process_stage: { id: "process_stage", name: "Process stage", distribution_family: "Normal", parameters: { mu: 0, sigma: 0.3 }, depends_on: ["input_signal"] },
    outcome: { id: "outcome", name: "Outcome", distribution_family: "Normal", parameters: { mu: 0, sigma: 0.2 }, depends_on: ["process_stage"] },
  } } }));
  await page.route("**/api/authoring/graphs/graph-1/shadow-simulate", (route) => route.fulfill({ json: { active_graph_mutated: false, active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 5, p50: 5 }, limitations: ["Candidate changes are simulated in memory and are not persisted or activated."] } }));
  await page.route("**/api/authoring/relationships/validate", (route) => route.fulfill({ json: { dependence_warnings: [{ code: "unresolved_proxy_correlation", message: "Fixture shared cause remains unresolved." }], active_graph_mutated: false } }));
  await page.route("**/api/authoring/graphs/graph-1/structural-proposals", (route) => route.fulfill({ json: { proposal: { id: "structural-1", graph_version: 4, binding_hash: "structural-hash", candidate_relationship_ids: ["proposal-input_signal-to-outcome"] }, active_graph_mutated: false } }));
  await page.route("**/api/projects/approved-1/structural-proposals/structural-1/approve", (route) => route.fulfill({ json: { approval_receipt: { id: "structural-receipt", binding_hash: "structural-hash" }, graph: { graph_version: 5 }, project: { ...project, stage: "decide", active_graph_version: 5 } } }));
  await page.route("**/api/authoring/graphs/graph-1/structural-proposals/structural-1/shadow-simulate", (route) => route.fulfill({ json: { active_graph_mutated: false, candidate_relationship_ids: ["proposal-input_signal-to-outcome"], active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 0.25, p50: 0.25 }, limitations: ["Candidate structural relationships are simulated only in memory and are not persisted or activated."] } }));
  await page.route("**/api/authoring/graphs/graph-1/candidate-proposals", (route) => route.fulfill({ json: { proposal: { id: "proposal-1", graph_version: 4, binding_hash: "binding-123" } } }));
  await page.route("**/api/projects/approved-1/candidate-revisions", (route) => route.request().method() === "GET"
    ? route.fulfill({ json: { candidate_revisions: [] } })
    : route.fulfill({ json: { id: "revision-1", base_graph_version: 4, candidate_parameter_overrides: { input_signal: { mu: 5 } } } }));
  await page.route("**/api/projects/approved-1/candidate-proposals/proposal-1/approve", (route) => route.fulfill({ json: { approval_receipt: { id: "receipt-1", binding_hash: "binding-123" }, graph: { graph_version: 5 }, project: { ...project, stage: "decide", active_graph_version: 5 } } }));
  await page.route("**/api/projects/approved-1", (route) => route.request().url().endsWith("/api/projects/approved-1") ? route.fulfill({ json: project }) : route.fallback());
  await page.goto("/");
  await page.getByRole("button", { name: "Monitor" }).click();
  await expect(page.getByRole("heading", { name: "Monitor model" })).toBeVisible();
  await page.getByRole("button", { name: "Inspect event" }).click();
  await expect(page.getByLabel("Inspected monitoring event")).toContainText("Inspection does not change the approved model.");
  await page.getByRole("button", { name: "Branch to edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit model through a draft" })).toBeVisible();
  await expect(page.getByLabel("Approved model dependency graph")).toContainText("Approved graph — read-only");
  await page.getByLabel("Approved model dependency graph").getByRole("button", { name: "Input signal" }).click();
  await expect(page.getByLabel("Approved model dependency graph").getByRole("status")).toContainText("Traced path: Input signal → Process stage → Outcome");
  await expect(page.getByRole("heading", { name: "Active versus candidate" })).toBeVisible();
  await expect(page.getByLabel("Candidate value")).toBeVisible();
  await page.getByLabel("Proposed relationship parent").selectOption("input_signal");
  await page.getByLabel("Proposed relationship child").selectOption("outcome");
  await page.getByRole("spinbutton", { name: "Proposed relationship coefficient", exact: true }).fill("0.25");
  await page.getByRole("button", { name: "Stage proposed relationship contract" }).click();
  await page.getByRole("button", { name: "Validate proposed relationships" }).click();
  await expect(page.getByLabel("Relationship validation warnings")).toContainText("Fixture shared cause remains unresolved.");
  await page.getByRole("button", { name: "Create structural proposal for review" }).click();
  await expect(page.getByLabel("Structural proposal review")).toContainText("Binding hash: structural-hash");
  await page.getByRole("button", { name: "Run structural in-memory comparison" }).click();
  await expect(page.getByLabel("Structural comparison receipt")).toContainText("Candidate mean: 0.25");
  await expect(page.getByLabel("Structural comparison receipt")).toContainText("Active graph unchanged: yes.");
  await page.getByLabel("Structural approver identity").fill("fixture-operator");
  await page.getByLabel("I reviewed this structural binding").check();
  await page.getByRole("button", { name: "Approve structural proposal" }).click();
  await expect(page.getByLabel("Structural approval receipt")).toContainText("Approved graph version: 5");
  await expect(page.getByLabel("Distribution inspector")).toContainText("As of: Not recorded on graph node");
  await page.getByLabel("Candidate value").fill("5");
  await page.getByRole("button", { name: "Add selected candidate change" }).click();
  await expect(page.getByLabel("Candidate change set")).toContainText("Input signal · mu: 5");
  await page.getByRole("button", { name: "Run in-memory comparison" }).click();
  await expect(page.getByText("Affected path: Input signal → Process stage → Outcome")).toBeVisible();
  await page.getByRole("button", { name: "Save durable candidate revision" }).click();
  await expect(page.getByText("Revision revision-1 · base graph version 4 · 1 parameter change · 0 node-state changes · 0 relationship-state changes")).toBeVisible();
  await expect(page.getByText("Candidate revision saved without changing the active graph.")).toBeVisible();
  await page.getByRole("button", { name: "Save candidate for review" }).click();
  await expect(page.getByText("Binding hash: binding-123")).toBeVisible();
  await page.getByRole("textbox", { name: "Approver identity", exact: true }).fill("fixture-operator");
  await page.getByLabel("I reviewed this exact binding").check();
  await page.getByRole("button", { name: "Approve candidate version" }).click();
  await expect(page.getByText("Approval receipt: receipt-1")).toBeVisible();
  await expect(page.getByText("Project lifecycle: decide · active graph version 5")).toBeVisible();
  await expect(page.getByText("Current stage: Decide")).toBeVisible();
  await page.getByRole("button", { name: "Create version-bound draft" }).click();
  await expect(page.getByText("Draft draft-1 is ready for proposed changes.")).toBeVisible();
});

test("canonical Run renders an authoritative successful simulation receipt without editing structure", async ({ page }) => {
  const project = { id: "run-1", name: "Approved neodymium model", target_id: "target-1", graph_id: "graph-1", active_graph_version: 4, stage: "simulate", evidence_classification: "local_verified" };
  const runResponse = {
    snapshot: {
      id: "snapshot-1", graph_version: 4, seed: 42, n_samples: 2000, status: "complete",
      node_predictives: { outcome: { derived_mean: 48.2, derived_median: 47.8, derived_std: 5.1, quantiles: { p05: 40.1, p50: 47.8, p95: 56.4 } } },
      stability_diagnostic: { method: "multi_seed_multi_sample_quantile_range", seeds: [42, 43], sample_counts: [1000, 2000], node_metric_ranges: { outcome: { mean: 0.4, p50: 0.3 } }, limitations: "This measures Monte Carlo stability only; it does not establish forecast accuracy or model calibration." },
    },
    sim_status: { freshness: "fresh" },
  };
  await page.route("**/api/projects", (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/targets/target-1", (route) => route.fulfill({ json: { question: "What will neodymium cost?", target_node_id: "outcome", forecast_origin: "2026-07-28T00:00:00Z", resolution_at: "2027-07-28T00:00:00Z" } }));
  await page.route("**/api/projects/run-1/scenarios", (route) => route.fulfill({ json: { scenarios: [] } }));
  await page.route("**/api/projects/run-1/monitoring", (route) => route.fulfill({ json: { config: null, events: [] } }));
  await page.route("**/api/graphs/graph-1/snapshots?limit=10", (route) => route.fulfill({ json: { snapshots: [] } }));
  await page.route("**/api/projects/run-1/ensembles", (route) => route.request().method() === "GET"
    ? route.fulfill({ json: { ensembles: [{ id: "fixture-blend", name: "Fixture blend", combination_method: "weighted_distribution_mixture", binding_hash: "a".repeat(64), members: [{ graph_id: "graph-1", graph_version: 4, target_node_id: "outcome", weight: 1 }, { graph_id: "graph-2", graph_version: 3, target_node_id: "outcome", weight: 3 }] }] } })
    : route.fulfill({ json: {} }));
  await page.route("**/api/projects/run-1/ensemble-approvals", (route) => route.fulfill({ json: { approval_receipts: [] } }));
  await page.route("**/api/projects/run-1/ensembles/fixture-blend/approve", (route) => route.fulfill({ json: { approval_receipt: { id: "fixture-ensemble-receipt", approved_by: "fixture-operator" }, active_graph_mutated: false } }));
  await page.route("**/api/graphs/graph-1/sim/run", (route) => route.fulfill({ json: runResponse }));
  await page.route("**/api/projects/run-1", (route) => route.request().method() === "GET" ? route.fulfill({ json: project }) : route.fulfill({ json: project }));
  await page.goto("/");
  await page.getByRole("button", { name: "Run model" }).click();
  await expect(page.getByRole("heading", { name: "Run approved model" })).toBeVisible();
  await page.getByRole("button", { name: "Run approved version" }).click();
  await expect(page.getByText("Run receipt: snapshot-1")).toBeVisible();
  await expect(page.getByLabel("Run outcome summaries")).toContainText("outcome · mean 48.2 · median 47.8 · p05 40.1 · p95 56.4");
  await expect(page.getByLabel("Run stability diagnostic")).toContainText("does not establish forecast accuracy or model calibration");
  await expect(page.getByText(/does not create, activate, or edit structure/i)).toBeVisible();
  await page.getByLabel("Ensemble approver identity").fill("fixture-operator");
  await page.getByLabel("I reviewed this exact ensemble binding").check();
  await page.getByRole("button", { name: "Approve ensemble Fixture blend" }).click();
  await expect(page.getByLabel("Ensemble approval receipt")).toContainText("Approval receipt: fixture-ensemble-receipt");
  await expect(page.getByLabel("Ensemble approval receipt")).toContainText("Member graphs unchanged: yes.");
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
test(`canonical fixture Build advances from a persisted target through Vet to a proposal-only map at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  const factors = [
    ["weather_disruption", "Weather disruption", 3], ["freight_capacity", "Freight capacity", 2], ["refining_throughput", "Rare-earth refining throughput", 1],
    ["china_export_controls", "Export-control regime", 2], ["mining_supply", "Primary mine supply", 1], ["recycling_rate", "Magnet recycling rate", 1],
    ["ev_demand", "Electric-vehicle demand", 1], ["wind_turbine_demand", "Wind-turbine demand", 1], ["chip_demand", "Semiconductor demand", 2],
    ["substitution_pressure", "Substitution pressure", 1], ["magnet_efficiency", "Magnet efficiency", 2], ["energy_prices", "Industrial energy prices", 2],
    ["fx_usd_cny", "USD/CNY exchange-rate regime", 1], ["geopolitical_risk", "Geopolitical disruption risk", 2], ["inventory_policy", "Downstream inventory policy", 1],
  ].map(([id, label, hop_distance], index) => ({ id, label, hop_distance, rank: index + 1, state: "proposed", evidence_status: "fixture_unverified" }));
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { projects: [] } });
    return route.fulfill({ json: { id: "fixture-project" } });
  });
  await page.route("**/api/targets", (route) => route.fulfill({ json: { target: {} } }));
  await page.route("**/api/research/targets/*/review", (route) => route.fulfill({ json: { claims: [] } }));
  await page.route("**/api/projects/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/authoring/targets/*/candidate-proposals/fixture", (route) =>
    route.fulfill({ json: {
      evidence_classification: "fixture_unverified", generation_basis: "deterministic_fixture", active_graph_mutated: false,
      limitations: ["Fixture only"], graph_proposal: { target_node_id: "fixture_target" },
      relationships: [
        { parent_node_id: "weather_disruption", child_node_id: "freight_capacity" },
        { parent_node_id: "freight_capacity", child_node_id: "refining_throughput" },
        { parent_node_id: "refining_throughput", child_node_id: "fixture_target" },
      ], factors,
    }}),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByLabel("Target identifier").fill("fixture-nd-retail-2027");
  await page.getByLabel("Question").fill("What will neodymium cost?");
  await page.getByLabel("Forecast origin").fill("2026-07-28T00:00");
  await page.getByLabel("Price basis").fill("retail");
  await page.getByLabel("Unit").fill("USD/kg");
  await page.getByLabel("Resolution date").fill("2027-07-28T00:00");
  await page.getByLabel("Observation rule").fill("first published value");
  await page.getByLabel("Missing-source fallback").fill("unresolved");
  await page.getByLabel("Revision policy").fill("first captured value");
  await page.getByRole("button", { name: "Save target contract" }).click();
  await expect(page.getByRole("heading", { name: "Vet the research brief" })).toBeVisible();
  await page.getByLabel("Supply").check();
  await page.getByLabel("Substitution").check();
  await page.getByRole("button", { name: "Save research categories" }).click();
  await expect(page.getByRole("status")).toContainText("Research brief categories saved: supply, substitution.");
  await page.getByLabel("Research routing provider").selectOption("openrouter");
  await page.getByLabel("I authorize this routing receipt").check();
  await page.getByRole("button", { name: "Record provider-routing consent" }).click();
  await expect(page.getByRole("status")).toContainText("Provider-routing consent saved. No research content was sent.");
  await page.getByRole("button", { name: "Proceed now" }).click();
  await page.getByRole("button", { name: "Load labeled fixture candidate map" }).click();
  await expect(page.getByText("Fixture candidate map — not live research")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Warnings and limitations" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Visual target-centered graph" })).toBeVisible();
  await expect(page.getByText(/15 factors shown\. Use arrow keys while this graph is focused/)).toBeVisible();
  await page.getByRole("button", { name: "Weather disruption" }).click();
  await expect(page.getByRole("status")).toContainText("Traced path: Weather disruption → Freight capacity → Rare-earth refining throughput → Private-investor retail neodymium price");
  await page.screenshot({ path: `../../docs/verification/gui/canonical-fixture-build-${viewport.width}x${viewport.height}.png`, fullPage: true });
});
}
