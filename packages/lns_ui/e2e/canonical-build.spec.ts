import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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

test("canonical Project Home has no serious or critical automated accessibility violations", async ({ page }) => {
  await page.route("**/api/projects", (route) => route.fulfill({ json: { projects: [] } }));
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
});

test("canonical Monitor inspects a fixture event and branches into a version-bound Edit draft", async ({ page }) => {
  const project = { id: "approved-1", name: "Approved neodymium model", target_id: "target-1", graph_id: "graph-1", active_graph_version: 4, stage: "monitor", evidence_classification: "fixture_unverified" };
  const derivedFamilies = new Set<string>();
  await page.route("**/api/projects", (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/targets/target-1", (route) => route.fulfill({ json: { question: "What will neodymium cost?", forecast_origin: "2026-07-28T00:00:00Z", resolution_at: "2027-07-28T00:00:00Z" } }));
  await page.route("**/api/projects/approved-1/monitoring", (route) => route.fulfill({ json: { config: { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" }, events: [{ id: "stale-source", severity: "warning", message: "Fixture source is stale", evidence_classification: "fixture_unverified" }] } }));
  await page.route("**/api/projects/approved-1/drafts", (route) => route.fulfill({ json: { id: "draft-1", base_graph_version: 4 } }));
  await page.route("**/api/projects/approved-1/revisions", (route) => route.fulfill({ json: { drafts: [{ id: "draft-earlier", base_graph_version: 4 }] } }));
  await page.route("**/api/graphs/graph-1", (route) => route.fulfill({ json: { nodes: {
    input_signal: { id: "input_signal", name: "Input signal", distribution_family: "Normal", parameters: { mu: 0, sigma: 1 }, depends_on: [] },
    process_stage: { id: "process_stage", name: "Process stage", distribution_family: "Gamma", parameters: { shape: 2, scale: 1 }, depends_on: ["input_signal"] },
    beta_factor: { id: "beta_factor", name: "Beta factor", distribution_family: "Beta", parameters: { alpha: 2, beta: 3 }, depends_on: [] },
    poisson_factor: { id: "poisson_factor", name: "Poisson factor", distribution_family: "Poisson", parameters: { rate: 2 }, depends_on: [] },
    negative_binomial_factor: { id: "negative_binomial_factor", name: "Negative binomial factor", distribution_family: "NegativeBinomial", parameters: { mean: 2, dispersion: 3 }, depends_on: [] },
    student_t_factor: { id: "student_t_factor", name: "Student-t factor", distribution_family: "StudentT", parameters: { loc: 0, scale: 1, df: 4 }, depends_on: [] },
    deterministic_factor: { id: "deterministic_factor", name: "Deterministic factor", distribution_family: "Deterministic", parameters: { value: 3 }, depends_on: [] },
    outcome: { id: "outcome", name: "Outcome", distribution_family: "Normal", parameters: { mu: 0, sigma: 0.2 }, depends_on: ["process_stage", "beta_factor", "poisson_factor", "negative_binomial_factor", "student_t_factor", "deterministic_factor"] },
  }, relationships: { "process-to-outcome": { id: "process-to-outcome", parent_node_id: "process_stage", child_node_id: "outcome", relationship_type: "causal_hypothesis", transform: "affine", source_unit: "process-index", target_unit: "outcome-index", sign: "positive", lag_periods: 1, lag_unit: "month", coefficient_units: "outcome-index / process-index", coefficient_parameters: [{ id: "coefficient", value: 0.5 }], evidence_claim_ids: ["fixture-claim-process-outcome"], state: "active" } } } }));
  await page.route("**/api/authoring/graphs/graph-1/shadow-simulate", (route) => route.fulfill({ json: { active_graph_mutated: false, active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 5, p50: 5 }, limitations: ["Candidate changes are simulated in memory and are not persisted or activated."] } }));
  await page.route("**/api/authoring/relationships/validate", (route) => route.fulfill({ json: { dependence_warnings: [{ code: "unresolved_proxy_correlation", message: "Fixture shared cause remains unresolved." }], active_graph_mutated: false } }));
  await page.route("**/api/authoring/graphs/graph-1/structural-proposals", (route) => {
    const body = route.request().postDataJSON() as { removed_relationship_ids?: string[] };
    return route.fulfill({ json: body.removed_relationship_ids?.length
      ? { proposal: { id: "remove-1", graph_version: 4, binding_hash: "remove-hash", candidate_relationship_ids: [], removed_relationship_ids: ["process-to-outcome"] }, active_graph_mutated: false }
      : { proposal: { id: "structural-1", graph_version: 4, binding_hash: "structural-hash", candidate_relationship_ids: ["proposal-input_signal-to-outcome"], removed_relationship_ids: [] }, active_graph_mutated: false },
    });
  });
  await page.route("**/api/projects/approved-1/structural-proposals/remove-1/approve", (route) => route.fulfill({ json: { approval_receipt: { id: "remove-receipt", binding_hash: "remove-hash" }, graph: { graph_version: 5 }, project: { ...project, stage: "decide", active_graph_version: 5 } } }));
  await page.route("**/api/projects/approved-1/structural-proposals/structural-1/approve", (route) => route.fulfill({ json: { approval_receipt: { id: "structural-receipt", binding_hash: "structural-hash" }, graph: { graph_version: 5 }, project: { ...project, stage: "decide", active_graph_version: 5 } } }));
  await page.route("**/api/authoring/graphs/graph-1/structural-proposals/remove-1/shadow-simulate", (route) => route.fulfill({ json: { active_graph_mutated: false, candidate_relationship_ids: [], removed_relationship_ids: ["process-to-outcome"], active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: -0.25, p50: -0.25 }, limitations: ["Candidate structural relationships are simulated only in memory and are not persisted or activated."] } }));
  await page.route("**/api/authoring/graphs/graph-1/structural-proposals/structural-1/shadow-simulate", (route) => route.fulfill({ json: { active_graph_mutated: false, candidate_relationship_ids: ["proposal-input_signal-to-outcome"], active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 0.25, p50: 0.25 }, limitations: ["Candidate structural relationships are simulated only in memory and are not persisted or activated."] } }));
  await page.route("**/api/authoring/graphs/graph-1/candidate-proposals", (route) => {
    const body = route.request().postDataJSON() as { candidate_distribution_specs?: Record<string, { family_id?: string }> };
    const hasDistributionSpec = Boolean(body.candidate_distribution_specs && Object.keys(body.candidate_distribution_specs).length > 0);
    if (hasDistributionSpec) {
      return route.fulfill({ json: { proposal: { id: "distribution-proposal", graph_version: 5, binding_hash: "distribution-binding" } } });
    }
    return route.fulfill({ json: { proposal: { id: "proposal-1", graph_version: 4, binding_hash: "binding-123" } } });
  });
  await page.route("**/api/projects/approved-1/candidate-revisions", (route) => route.request().method() === "GET"
    ? route.fulfill({ json: { candidate_revisions: [
      { id: "revision-base", base_graph_version: 4, candidate_parameter_overrides: { input_signal: { mu: 1 } } },
      { id: "revision-alternative", base_graph_version: 4, candidate_parameter_overrides: { input_signal: { mu: 3 } }, candidate_node_state_overrides: { process_stage: "excluded" } },
    ] } })
    : (() => { const body = route.request().postDataJSON() as { candidate_distribution_specs?: Record<string, unknown> }; return route.fulfill({ json: body.candidate_distribution_specs && Object.keys(body.candidate_distribution_specs).length > 0 ? { id: "revision-elicited", base_graph_version: 5, candidate_parameter_overrides: { input_signal: { mu: 5, sigma: 2 } }, candidate_distribution_specs: body.candidate_distribution_specs } : { id: "revision-1", base_graph_version: 4, candidate_parameter_overrides: { input_signal: { mu: 5 } } } }); })());
  await page.route("**/api/authoring/distributions/elicit", (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ id: "input_signal-median-p90", family_id: "Normal", median: 5, p90: 7.56 });
    return route.fulfill({ json: { distribution_spec: { id: "input_signal-median-p90", family_id: "Normal", parameters: [{ id: "loc", value: 5 }, { id: "scale", value: 2 }], elicitation_method: "median_p90_quantile_match", evidence_claim_ids: [], as_of: "2026-07-28T00:00:00Z", confidence_rationale: "Initial operator range; requires evidence review." }, derived_statistics: { mean: 5, median: 5, mode: 5, variance: 4 }, receipt: { method: "median_p90_quantile_match", limitations: ["Fixture initial prior only."] } } });
  });
  await page.route("**/api/authoring/distributions/derive", (route) => {
    const body = route.request().postDataJSON() as { id: string; family_id: string; values: Record<string, number> };
    const fixtures: Record<string, { values: Record<string, number>; parameters: Array<{ id: string; value: number }> }> = {
      Beta: { values: { mean: 0.4, concentration: 10 }, parameters: [{ id: "alpha", value: 4 }, { id: "beta", value: 6 }] },
      Poisson: { values: { expected_count: 5 }, parameters: [{ id: "rate", value: 5 }] },
      NegativeBinomial: { values: { expected_count: 6, dispersion: 2 }, parameters: [{ id: "mean", value: 6 }, { id: "dispersion", value: 2 }] },
      Gamma: { values: { mean: 8, standard_deviation: 4 }, parameters: [{ id: "shape", value: 4 }, { id: "scale", value: 2 }] },
      StudentT: { values: { location: 1, scale: 2, degrees_of_freedom: 5 }, parameters: [{ id: "loc", value: 1 }, { id: "scale", value: 2 }, { id: "df", value: 5 }] },
      Deterministic: { values: { value: 9 }, parameters: [{ id: "value", value: 9 }] },
    };
    const fixture = fixtures[body.family_id];
    expect(fixture).toBeDefined();
    expect(body.values).toEqual(fixture.values);
    derivedFamilies.add(body.family_id);
    return route.fulfill({ json: { distribution_spec: { id: body.id, family_id: body.family_id, parameters: fixture.parameters, elicitation_method: "intuitive_family_derivation", evidence_claim_ids: [], as_of: "2026-07-28T00:00:00Z", confidence_rationale: "Initial operator range; requires evidence review." }, derived_statistics: { mean: 0, median: null, mode: null, variance: 1 }, receipt: { method: "intuitive_family_derivation", limitations: [`Fixture ${body.family_id} prior only.`] } } });
  });
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
  await expect(page.getByLabel("Approved dependency details")).toContainText("relationship type: causal_hypothesis");
  await expect(page.getByLabel("Approved dependency details")).toContainText("evidence: fixture-claim-process-outcome · state: active");
  await page.getByLabel("Approved model dependency graph").getByRole("button", { name: "Input signal" }).click();
  await expect(page.getByLabel("Approved model dependency graph").getByRole("status")).toContainText("Traced path: Input signal → Process stage → Outcome");
  await expect(page.getByRole("heading", { name: "Active versus candidate" })).toBeVisible();
  await expect(page.getByLabel("Candidate value")).toBeVisible();
  await page.getByLabel("Baseline candidate revision").selectOption("revision-base");
  await page.getByLabel("Compared candidate revision").selectOption("revision-alternative");
  await page.getByRole("button", { name: "Compare durable revisions" }).click();
  await expect(page.getByLabel("Candidate revision comparison")).toContainText("Changed parameter: input_signal.mu from 1 to 3.");
  await expect(page.getByLabel("Candidate revision comparison")).toContainText("Active graph unchanged: yes.");
  await page.getByLabel("Candidate dependency").selectOption("process_stage:outcome");
  await expect(page.getByLabel("Relationship inspector")).toContainText("Process stage → Outcome");
  await expect(page.getByLabel("Relationship inspector")).toContainText("Evidence claims: fixture-claim-process-outcome");
  await page.getByRole("button", { name: "Exclude selected dependency in candidate" }).click();
  await page.getByRole("button", { name: "Create structural proposal for review" }).click();
  await expect(page.getByLabel("Structural proposal review")).toContainText("Binding hash: remove-hash");
  await page.getByRole("button", { name: "Run structural in-memory comparison" }).click();
  await expect(page.getByLabel("Structural comparison receipt")).toContainText("Removed relationships: process-to-outcome.");
  await page.getByLabel("Structural approver identity").fill("fixture-operator");
  await page.getByLabel("I reviewed this structural binding").check();
  await page.getByRole("button", { name: "Approve structural proposal" }).click();
  await expect(page.getByLabel("Structural approval receipt")).toContainText("Approval receipt: remove-receipt");
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
  await page.getByLabel("Elicitation median").fill("5");
  await page.getByLabel("Elicitation P90").fill("7.56");
  await page.getByRole("button", { name: "Stage elicited distribution candidate" }).click();
  await expect(page.getByLabel("Elicited distribution candidate")).toContainText("Fixture initial prior only.");
  await page.getByRole("button", { name: "Run in-memory comparison" }).click();
  await page.getByRole("button", { name: "Save candidate for review" }).click();
  await expect(page.getByLabel("Candidate approval")).toContainText("distribution-binding");
  await page.getByRole("button", { name: "Save durable candidate revision" }).click();
  await expect(page.getByText(/Revision revision-elicited .*1 elicited distribution candidate/)).toBeVisible();
  await page.getByLabel("Candidate factor").selectOption("process_stage");
  await page.getByLabel("Gamma mean").fill("8");
  await page.getByLabel("Gamma standard deviation").fill("4");
  await page.getByRole("button", { name: "Stage derived distribution candidate" }).click();
  await expect(page.getByLabel("Derived distribution candidate")).toContainText("Fixture Gamma prior only.");
  await page.getByRole("button", { name: "Run in-memory comparison" }).click();
  await page.getByRole("button", { name: "Save candidate for review" }).click();
  await expect(page.getByLabel("Candidate approval")).toContainText("distribution-binding");
  await page.getByLabel("Candidate factor").selectOption("beta_factor");
  await page.getByLabel("Beta mean").fill("0.4");
  await page.getByLabel("Beta concentration").fill("10");
  await page.getByRole("button", { name: "Stage derived distribution candidate" }).click();
  await expect(page.getByLabel("Derived distribution candidate")).toContainText("Fixture Beta prior only.");
  await page.getByLabel("Candidate factor").selectOption("poisson_factor");
  await page.getByLabel("Poisson expected count").fill("5");
  await page.getByRole("button", { name: "Stage derived distribution candidate" }).click();
  await expect(page.getByLabel("Derived distribution candidate")).toContainText("Fixture Poisson prior only.");
  await page.getByLabel("Candidate factor").selectOption("negative_binomial_factor");
  await page.getByLabel("NegativeBinomial expected count").fill("6");
  await page.getByLabel("NegativeBinomial dispersion").fill("2");
  await page.getByRole("button", { name: "Stage derived distribution candidate" }).click();
  await expect(page.getByLabel("Derived distribution candidate")).toContainText("Fixture NegativeBinomial prior only.");
  await page.getByLabel("Candidate factor").selectOption("student_t_factor");
  await page.getByLabel("StudentT location").fill("1");
  await page.getByLabel("StudentT scale").fill("2");
  await page.getByLabel("StudentT degrees of freedom").fill("5");
  await page.getByRole("button", { name: "Stage derived distribution candidate" }).click();
  await expect(page.getByLabel("Derived distribution candidate")).toContainText("Fixture StudentT prior only.");
  await page.getByLabel("Candidate factor").selectOption("deterministic_factor");
  await page.getByLabel("Deterministic value").fill("9");
  await page.getByRole("button", { name: "Stage derived distribution candidate" }).click();
  await expect(page.getByLabel("Derived distribution candidate")).toContainText("Fixture Deterministic prior only.");
  expect([...derivedFamilies].sort()).toEqual(["Beta", "Deterministic", "Gamma", "NegativeBinomial", "Poisson", "StudentT"]);
});

test("canonical Edit retires an isolated non-target factor through a reviewed structural proposal", async ({ page }) => {
  const project = { id: "retire-1", name: "Retirement fixture", target_id: "target-1", graph_id: "graph-1", active_graph_version: 4, stage: "monitor", evidence_classification: "fixture_unverified" };
  await page.route("**/api/projects", (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/targets/target-1", (route) => route.fulfill({ json: { question: "What will neodymium cost?", forecast_origin: "2026-07-28T00:00:00Z", resolution_at: "2027-07-28T00:00:00Z" } }));
  await page.route("**/api/projects/retire-1/monitoring", (route) => route.fulfill({ json: { config: { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" }, events: [{ id: "retire-source", severity: "warning", message: "Fixture source is stale", evidence_classification: "fixture_unverified" }] } }));
  await page.route("**/api/projects/retire-1/drafts", (route) => route.fulfill({ json: { id: "draft-1", base_graph_version: 4 } }));
  await page.route("**/api/projects/retire-1/revisions", (route) => route.fulfill({ json: { drafts: [] } }));
  await page.route("**/api/projects/retire-1/candidate-revisions", (route) => route.fulfill({ json: { candidate_revisions: [] } }));
  await page.route("**/api/projects/retire-1", (route) => route.fulfill({ json: project }));
  await page.route("**/api/graphs/graph-1", (route) => route.fulfill({ json: { nodes: {
    input_signal: { id: "input_signal", name: "Input signal", distribution_family: "Normal", parameters: { mu: 0, sigma: 1 }, depends_on: [] },
    process_stage: { id: "process_stage", name: "Process stage", distribution_family: "Normal", parameters: { mu: 0, sigma: 0.3 }, depends_on: ["input_signal"] },
    outcome: { id: "outcome", name: "Outcome", distribution_family: "Normal", parameters: { mu: 0, sigma: 0.2 }, depends_on: ["process_stage"] },
  }, relationships: {
    "input-to-process": { id: "input-to-process", parent_node_id: "input_signal", child_node_id: "process_stage", state: "active" },
    "process-to-outcome": { id: "process-to-outcome", parent_node_id: "process_stage", child_node_id: "outcome", state: "active" },
  } } }));
  await page.route("**/api/authoring/graphs/graph-1/structural-proposals", (route) => {
    const body = route.request().postDataJSON() as { removed_relationship_ids?: string[]; retired_node_ids?: string[]; target_node_id?: string };
    expect(body).toEqual({ relationships: [], removed_relationship_ids: ["input-to-process", "process-to-outcome"], retired_node_ids: ["process_stage"], target_node_id: "outcome" });
    return route.fulfill({ json: { proposal: { id: "retire-structural-1", graph_version: 4, binding_hash: "retire-hash", candidate_relationship_ids: [], removed_relationship_ids: body.removed_relationship_ids, retired_node_ids: body.retired_node_ids } } });
  });
  await page.route("**/api/authoring/graphs/graph-1/structural-proposals/retire-structural-1/shadow-simulate", (route) => route.fulfill({ json: { active_graph_mutated: false, candidate_relationship_ids: [], removed_relationship_ids: ["input-to-process", "process-to-outcome"], retired_node_ids: ["process_stage"], active_summary: { mean: 0, p50: 0 }, candidate_summary: { mean: 0.1, p50: 0.1 }, limitations: ["Fixture structural impact only."] } }));
  await page.route("**/api/projects/retire-1/structural-proposals/retire-structural-1/approve", (route) => route.fulfill({ json: { approval_receipt: { id: "retire-receipt", binding_hash: "retire-hash" }, graph: { graph_version: 5 }, project: { ...project, stage: "decide", active_graph_version: 5 } } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Monitor" }).click();
  await page.getByRole("button", { name: "Inspect event" }).click();
  await page.getByRole("button", { name: "Branch to edit" }).click();
  await page.getByLabel("Candidate factor").selectOption("process_stage");
  await page.getByRole("button", { name: "Exclude selected factor in candidate" }).click();
  await page.getByRole("button", { name: "Create structural proposal for review" }).click();
  await page.getByRole("button", { name: "Run structural in-memory comparison" }).click();
  await expect(page.getByLabel("Structural comparison receipt")).toContainText("Retired nodes: process_stage.");
  await expect(page.getByLabel("Structural comparison receipt")).toContainText("Active graph unchanged: yes.");
  await page.getByLabel("Structural approver identity").fill("fixture-operator");
  await page.getByLabel("I reviewed this structural binding").check();
  await page.getByRole("button", { name: "Approve structural proposal" }).click();
  await expect(page.getByLabel("Structural approval receipt")).toContainText("Approval receipt: retire-receipt");
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
    ["ore_grade", "Ore grade", 2], ["processing_reagents", "Processing reagent availability", 2], ["water_availability", "Industrial water availability", 3],
    ["grid_reliability", "Grid reliability", 2], ["labor_capacity", "Skilled labor capacity", 2], ["port_congestion", "Port congestion", 2],
    ["sanctions_risk", "Sanctions risk", 2], ["magnet_inventory", "Magnet inventory", 2], ["defense_procurement", "Defense procurement", 2],
    ["robotics_demand", "Industrial robotics demand", 2], ["vehicle_efficiency", "Vehicle efficiency", 2], ["alternative_magnets", "Alternative magnet adoption", 2],
    ["scrap_collection", "End-of-life scrap collection", 2], ["refining_policy", "Refining policy", 2], ["credit_conditions", "Industrial credit conditions", 2],
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
  await expect(page.getByText(/30 factors shown\. Use arrow keys while this graph is focused/)).toBeVisible();
  const coordinates = await page.getByLabel("Target-centered dependency graph").locator("li[data-x][data-y]").evaluateAll((items) => items.map((item) => `${item.getAttribute("data-x")}:${item.getAttribute("data-y")}`));
  expect(coordinates).toHaveLength(30);
  expect(new Set(coordinates).size).toBe(30);
  await page.getByRole("button", { name: "Weather disruption" }).click();
  await expect(page.getByRole("status")).toContainText("Traced path: Weather disruption → Freight capacity → Rare-earth refining throughput → Private-investor retail neodymium price");
  await page.screenshot({ path: `../../docs/verification/gui/canonical-fixture-build-${viewport.width}x${viewport.height}.png`, fullPage: true });
});
}
