import { describe, expect, it } from "vitest";
import { canMoveToStage } from "./guards";

describe("workflow guards", () => {
  it("allows revisiting completed stages but blocks only forward progress from an incomplete target", () => {
    expect(canMoveToStage({ current: "vet", targetComplete: false }, "idea")).toEqual({ allowed: true });
    expect(canMoveToStage({ current: "idea", targetComplete: false }, "vet")).toMatchObject({
      allowed: false,
      reason: "Complete the target contract first.",
    });
  });
});
