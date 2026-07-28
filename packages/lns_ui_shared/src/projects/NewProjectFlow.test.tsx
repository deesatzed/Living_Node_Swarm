import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewProjectFlow } from "./NewProjectFlow";

afterEach(cleanup);

describe("NewProjectFlow", () => {
  it("creates a persisted Idea-stage project before exposing resolution-grade target intake", async () => {
    const user = userEvent.setup();
    const client = {
      createProject: vi.fn(async () => ({})),
      createTarget: vi.fn(async () => ({})),
      patchProject: vi.fn(async () => ({})),
    };
    render(<NewProjectFlow client={client} onCreated={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("form", { name: /resolution-grade target/i })).toBeVisible();
    expect(client.createProject).toHaveBeenCalledWith(expect.objectContaining({
      name: "New prediction project", stage: "idea", evidence_classification: "fixture_unverified",
    }));
  });
});
