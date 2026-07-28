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
