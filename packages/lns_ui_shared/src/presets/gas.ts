export interface WorkspacePreset {
  workspace: {
    projectName: string;
    target: string;
    horizon: string;
    currentStage: string;
    evidenceClassification: "fixture_unverified";
  };
  inputMappings: ReadonlyArray<{ input: string; generalizedField: string; note: string }>;
  safety: { liveTradingEnabled: false; bulkActivationEnabled: false };
}

export const GAS_PRESET: WorkspacePreset = {
  workspace: {
    projectName: "LNS Gas preset",
    target: "US retail gas versus Kalshi threshold",
    horizon: "Current contract horizon",
    currentStage: "simulate",
    evidenceClassification: "fixture_unverified",
  },
  inputMappings: [
    { input: "threshold_usd", generalizedField: "TargetContract.resolution threshold", note: "The contract threshold is a resolution condition, not a forecast claim." },
    { input: "ticker", generalizedField: "Monitoring source identifier", note: "The ticker identifies a market source; it does not authorize trading." },
    { input: "market_yes_mid", generalizedField: "Scenario assumption", note: "A fallback mid is a labeled local input until a source receipt is available." },
  ],
  safety: { liveTradingEnabled: false, bulkActivationEnabled: false },
};
