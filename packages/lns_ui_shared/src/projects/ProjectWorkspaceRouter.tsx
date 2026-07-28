import { useState } from "react";
import { ExistingProjectWorkspace, type ExistingProjectClient, type ExistingProjectMode } from "../modes/ExistingProjectWorkspace";
import { NewProjectFlow, type NewProjectClient } from "./NewProjectFlow";
import { ProjectHomeLoader, type ProjectHomeClient } from "./ProjectHomeLoader";

export type ProjectWorkspaceClient = ProjectHomeClient & NewProjectClient & ExistingProjectClient;

type Route = { kind: "home" } | { kind: "new" } | { kind: ExistingProjectMode; projectId: string };

export function ProjectWorkspaceRouter({ client }: { client: ProjectWorkspaceClient }) {
  const [route, setRoute] = useState<Route>({ kind: "home" });
  if (route.kind === "new") return <section aria-label="New project route"><button onClick={() => setRoute({ kind: "home" })}>Back to projects</button><NewProjectFlow client={client} onCreated={() => undefined} /></section>;
  if (route.kind !== "home") return <ExistingProjectWorkspace mode={route.kind} projectId={route.projectId} client={client} onBack={() => setRoute({ kind: "home" })} />;
  return <ProjectHomeLoader client={client} onAction={(action, projectId) => {
    if (action === "new") setRoute({ kind: "new" });
    else if (projectId) setRoute({ kind: action, projectId });
  }} />;
}
