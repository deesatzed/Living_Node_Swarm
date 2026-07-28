import { HopGraph } from "../graph/HopGraph";
import { TargetIntake } from "../intake/TargetIntake";
import { WarningCenter } from "../inspectors/WarningCenter";
import { createNeodymiumGraphFixture } from "../testing/graphFixture";
import { WorkspaceShell } from "./WorkspaceShell";

export function FixtureWorkspace() {
  const fixture = createNeodymiumGraphFixture();
  return <WorkspaceShell projectName="Neodymium fixture" target="Private-investor retail neodymium price" horizon="1 year" graphVersion={1} freshness="stale" evidenceClassification="fixture_unverified">
    <TargetIntake onSubmit={() => undefined} />
    <HopGraph factors={fixture.factors} />
    <WarningCenter warnings={[{ id: "fixture", severity: "warning", message: "Fixture evidence is not live research." }]} />
  </WorkspaceShell>;
}
