import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonitoringSetup } from "./MonitoringSetup";

afterEach(cleanup);

describe("MonitoringSetup", () => {
  it("labels fixture events honestly and saves explicit cadence configuration", async () => {
    const user = userEvent.setup();
    const saveMonitoring = vi.fn(async () => ({}));
    const acknowledgeMonitoringEvent = vi.fn(async () => ({ acknowledged_at: "2026-07-28T00:00:00Z" }));
    const onBranchToEdit = vi.fn();
    render(<MonitoringSetup projectId="project-1" client={{
      getMonitoring: async () => ({ config: { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" }, events: [{ id: "event-1", severity: "warning", message: "Fixture source is stale", evidence_classification: "fixture_unverified" }] }),
      saveMonitoring,
      acknowledgeMonitoringEvent,
    }} onBranchToEdit={onBranchToEdit} />);

    expect(await screen.findByRole("listitem")).toHaveTextContent("Fixture source is stale");
    expect(screen.getByText("Fixture event — not live monitoring")).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Cadence"), "daily");
    await user.click(screen.getByRole("button", { name: "Save monitoring configuration" }));

    expect(saveMonitoring).toHaveBeenCalledWith("project-1", { cadence: "daily", freshness_threshold_days: 7, mode: "fixture" });
    await user.click(screen.getByRole("button", { name: "Acknowledge event" }));
    expect(acknowledgeMonitoringEvent).toHaveBeenCalledWith("project-1", "event-1");
    expect(await screen.findByText(/Acknowledged 2026-07-28T00:00:00Z/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Inspect event" }));
    expect(screen.getByLabelText("Inspected monitoring event")).toHaveTextContent("Inspection does not change the approved model.");
    await user.click(screen.getByRole("button", { name: "Branch to edit" }));
    expect(onBranchToEdit).toHaveBeenCalledOnce();
  });
});
