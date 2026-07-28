import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonitoringSetup } from "./MonitoringSetup";

afterEach(cleanup);

describe("MonitoringSetup", () => {
  it("labels fixture events honestly and saves explicit cadence configuration", async () => {
    const user = userEvent.setup();
    const saveMonitoring = vi.fn(async () => ({}));
    render(<MonitoringSetup projectId="project-1" client={{
      getMonitoring: async () => ({ config: { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" }, events: [{ id: "event-1", severity: "warning", message: "Fixture source is stale", evidence_classification: "fixture_unverified" }] }),
      saveMonitoring,
    }} />);

    expect(await screen.findByRole("listitem")).toHaveTextContent("Fixture source is stale");
    expect(screen.getByText("Fixture event — not live monitoring")).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Cadence"), "daily");
    await user.click(screen.getByRole("button", { name: "Save monitoring configuration" }));

    expect(saveMonitoring).toHaveBeenCalledWith("project-1", { cadence: "daily", freshness_threshold_days: 7, mode: "fixture" });
  });
});
