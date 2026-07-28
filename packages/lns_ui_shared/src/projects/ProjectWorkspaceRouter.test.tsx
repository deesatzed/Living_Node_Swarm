import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectWorkspaceRouter } from "./ProjectWorkspaceRouter";

afterEach(cleanup);

describe("ProjectWorkspaceRouter", () => {
  it("starts at Project Home and routes New to persisted-project creation", async () => {
    const user = userEvent.setup();
    const client = {
      listProjects: vi.fn(async () => ({ projects: [] })),
      getTarget: vi.fn(), getProject: vi.fn(), createProject: vi.fn(), createTarget: vi.fn(), patchProject: vi.fn(), runSimulation: vi.fn(), getMonitoring: vi.fn(), saveMonitoring: vi.fn(), createDraft: vi.fn(),
    };
    render(<ProjectWorkspaceRouter client={client} />);

    expect(await screen.findByRole("heading", { name: "Prediction projects" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "New project" }));
    expect(screen.getByRole("heading", { name: "New prediction project" })).toBeVisible();
  });
});
