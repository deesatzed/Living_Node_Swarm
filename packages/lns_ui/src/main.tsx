import React from "react";
import ReactDOM from "react-dom/client";
import { createWorkspaceClient, ProjectWorkspaceRouter } from "@lns/ui-shared";
import "./styles.css";

const workspaceClient = createWorkspaceClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProjectWorkspaceRouter client={workspaceClient} />
  </React.StrictMode>
);
