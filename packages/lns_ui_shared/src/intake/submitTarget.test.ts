import { describe, expect, it, vi } from "vitest";
import { submitTargetToProject } from "./submitTarget";

describe("submitTargetToProject", () => {
  it("persists a target before attaching it to the workspace project", async () => {
    const calls: string[] = [];
    const client = {
      createTarget: vi.fn(async () => { calls.push("target"); return {}; }),
      patchProject: vi.fn(async () => { calls.push("project"); return {}; }),
    };
    await submitTargetToProject(client, "project-1", { id: "target-1", question: "Q" });
    expect(calls).toEqual(["target", "project"]);
    expect(client.patchProject).toHaveBeenCalledWith("project-1", { target_id: "target-1", stage: "vet" });
  });
});
