import { describe, expect, it } from "vitest";
import { GAS_PRESET } from "./gas";

describe("GAS_PRESET", () => {
  it("maps the gas demonstration to shared workspace semantics without enabling trading", () => {
    expect(GAS_PRESET.workspace.projectName).toBe("LNS Gas preset");
    expect(GAS_PRESET.workspace.target).toContain("US retail gas");
    expect(GAS_PRESET.inputMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({ input: "threshold_usd", generalizedField: "TargetContract.resolution threshold" }),
      expect.objectContaining({ input: "ticker", generalizedField: "Monitoring source identifier" }),
    ]));
    expect(GAS_PRESET.safety.liveTradingEnabled).toBe(false);
  });
});
