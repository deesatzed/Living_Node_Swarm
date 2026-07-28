import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersistedTargetIntake } from "./PersistedTargetIntake";

afterEach(cleanup);

async function fillRequiredTargetFields() {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "Target identifier" }), "nd-retail-2027");
  await user.type(screen.getByRole("textbox", { name: "Question" }), "What will neodymium cost?");
  await user.type(screen.getByRole("textbox", { name: "Price basis" }), "retail");
  await user.type(screen.getByRole("textbox", { name: "Unit" }), "USD/kg");
  fireEvent.change(screen.getByLabelText("Forecast origin"), { target: { value: "2026-07-28T00:00" } });
  fireEvent.change(screen.getByLabelText("Resolution date"), { target: { value: "2027-07-28T00:00" } });
  await user.type(screen.getByRole("textbox", { name: "Observation rule" }), "first published value");
  await user.type(screen.getByRole("textbox", { name: "Missing-source fallback" }), "unresolved");
  await user.type(screen.getByRole("textbox", { name: "Revision policy" }), "first captured value");
  await user.click(screen.getByRole("button", { name: "Save target contract" }));
}

describe("PersistedTargetIntake", () => {
  it("saves the target before attaching it to the project and reports success", async () => {
    const client = {
      createTarget: vi.fn(async () => ({})),
      patchProject: vi.fn(async () => ({})),
    };
    render(<PersistedTargetIntake client={client} projectId="project-1" />);

    await fillRequiredTargetFields();

    expect(await screen.findByRole("status")).toHaveTextContent("Target contract saved to this workspace.");
    expect(client.patchProject).toHaveBeenCalledWith("project-1", { target_id: "nd-retail-2027" });
  });

  it("shows an actionable persistence error and does not attach a failed target", async () => {
    const client = {
      createTarget: vi.fn(async () => { throw new Error("price_basis is required"); }),
      patchProject: vi.fn(async () => ({})),
    };
    render(<PersistedTargetIntake client={client} projectId="project-1" />);

    await fillRequiredTargetFields();

    expect(await screen.findByRole("alert")).toHaveTextContent("price_basis is required");
    expect(client.patchProject).not.toHaveBeenCalled();
  });

  it("notifies the Build flow only after the target is fully persisted", async () => {
    const onSaved = vi.fn();
    render(<PersistedTargetIntake client={{ createTarget: vi.fn(async () => ({})), patchProject: vi.fn(async () => ({})) }} projectId="project-1" onSaved={onSaved} />);

    await fillRequiredTargetFields();

    expect(onSaved).toHaveBeenCalledWith("nd-retail-2027");
  });
});
