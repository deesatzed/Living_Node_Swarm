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

test("canonical fixture Build advances from a persisted target through Vet to a proposal-only map", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { projects: [] } });
    return route.fulfill({ json: { id: "fixture-project" } });
  });
  await page.route("**/api/targets", (route) => route.fulfill({ json: { target: {} } }));
  await page.route("**/api/projects/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/authoring/targets/*/candidate-proposals/fixture", (route) =>
    route.fulfill({ json: {
      evidence_classification: "fixture_unverified", generation_basis: "deterministic_fixture", active_graph_mutated: false,
      limitations: ["Fixture only"], graph_proposal: {}, relationships: [],
      factors: [{ id: "weather", label: "Weather disruption", rank: 1, hop_distance: 3, state: "proposed", evidence_status: "fixture_unverified" }],
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
  await page.getByRole("button", { name: "Proceed now" }).click();
  await page.getByRole("button", { name: "Load labeled fixture candidate map" }).click();
  await expect(page.getByText("Fixture candidate map — not live research")).toBeVisible();
  await expect(page.getByRole("group", { name: "Visual target-centered graph" })).toBeVisible();
  await page.screenshot({ path: "../../docs/verification/gui/canonical-fixture-build-1440x900.png", fullPage: true });
});
