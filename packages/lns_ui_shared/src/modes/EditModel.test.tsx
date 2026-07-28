import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditModel } from "./EditModel";

afterEach(cleanup);

describe("EditModel", () => {
  it("creates an exact-version draft before any candidate structural work", async () => {
    const user = userEvent.setup();
    const createDraft = vi.fn(async () => ({ id: "draft-7", base_graph_version: 4 }));
    render(<EditModel projectId="project-1" activeGraphVersion={4} client={{ createDraft }} />);

    await user.click(screen.getByRole("button", { name: "Create version-bound draft" }));

    expect(createDraft).toHaveBeenCalledWith("project-1", expect.objectContaining({ base_graph_version: 4 }));
    expect(await screen.findByText("Draft draft-7 is ready for proposed changes.")).toBeVisible();
    expect(screen.getByText(/active graph remains unchanged/i)).toBeVisible();
  });
});
