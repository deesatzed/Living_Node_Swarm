import { describe, expect, it } from "vitest";
import { WORKFLOW_STAGES } from "./workflow/stages";

describe("shared package", () => {
  it("exports the approved lifecycle in order", () => {
    expect(WORKFLOW_STAGES.map((stage) => stage.id)).toEqual([
      "idea",
      "vet",
      "map",
      "refine",
      "quantify",
      "simulate",
      "decide",
      "monitor",
    ]);
  });
});
