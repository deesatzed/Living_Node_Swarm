import { HopGraph } from "../graph/HopGraph";
import { TargetIntake } from "../intake/TargetIntake";
import { DistributionInspector } from "../inspectors/DistributionInspector";
import { RelationshipInspector } from "../inspectors/RelationshipInspector";
import { WarningCenter } from "../inspectors/WarningCenter";
import { createNeodymiumGraphFixture } from "../testing/graphFixture";
import { WorkspaceShell } from "./WorkspaceShell";

export function FixtureWorkspace() {
  const fixture = createNeodymiumGraphFixture();
  return <WorkspaceShell projectName="Neodymium fixture" target="Private-investor retail neodymium price" horizon="1 year" graphVersion={1} freshness="stale" evidenceClassification="fixture_unverified" currentStage="map">
    <TargetIntake onSubmit={() => undefined} />
    <HopGraph factors={fixture.factors} targetLabel="Private-investor retail neodymium price" />
    <DistributionInspector family="LogNormal" parameters={{ log_loc: 4.6, log_scale: 0.2 }} support="positive" asOf="2026-07-28" provenance="fixture_unverified" />
    <RelationshipInspector relationship={{ id: "weather-to-freight", parentLabel: "Weather disruption", childLabel: "Freight capacity", type: "affine", units: "capacity-index / disruption-index", lagSteps: 1, sign: "negative", transform: "affine", coefficientDistribution: "Normal(0, 0.2)", sourceUnit: "disruption-index", targetUnit: "capacity-index", lagUnit: "months", validityRange: "Normal operating regime", evidence: "fixture_unverified", evidenceLinks: ["fixture://weather-to-freight"], warnings: ["Coefficient remains uncalibrated."], state: "proposed" }} />
    <WarningCenter warnings={[{ id: "fixture", severity: "warning", message: "Fixture evidence is not live research." }]} />
  </WorkspaceShell>;
}
