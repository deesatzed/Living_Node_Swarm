"""SQLite persistence for workspace workflow metadata, separate from graph math."""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

from lns_server.workspace_models import (
    MonitoringConfig,
    MonitoringFixtureEvent,
    WorkspaceCandidateRevision,
    WorkspaceDraft,
    WorkspaceEnsemble,
    WorkspaceProject,
    WorkspaceProjectPatch,
    WorkspaceScenario,
    utcnow,
)


class WorkspaceStore:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS workspace_projects (id TEXT PRIMARY KEY, payload_json TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS workspace_drafts (project_id TEXT NOT NULL, id TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY(project_id, id));
            CREATE TABLE IF NOT EXISTS workspace_candidate_revisions (project_id TEXT NOT NULL, id TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY(project_id, id));
            CREATE TABLE IF NOT EXISTS workspace_scenarios (project_id TEXT NOT NULL, id TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY(project_id, id));
            CREATE TABLE IF NOT EXISTS workspace_ensembles (project_id TEXT NOT NULL, id TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY(project_id, id));
            CREATE TABLE IF NOT EXISTS workspace_monitoring (project_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS workspace_monitoring_events (project_id TEXT NOT NULL, id TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY(project_id, id));
            """
        )
        self._connection.commit()

    def close(self) -> None:
        self._connection.close()

    def create_project(self, project: WorkspaceProject) -> WorkspaceProject:
        self._connection.execute("INSERT INTO workspace_projects VALUES (?, ?)", (project.id, project.model_dump_json()))
        self._connection.commit()
        return project

    def list_projects(self) -> list[WorkspaceProject]:
        rows = self._connection.execute("SELECT payload_json FROM workspace_projects ORDER BY id").fetchall()
        return [WorkspaceProject.model_validate_json(row["payload_json"]) for row in rows]

    def get_project(self, project_id: str) -> WorkspaceProject | None:
        row = self._connection.execute("SELECT payload_json FROM workspace_projects WHERE id=?", (project_id,)).fetchone()
        return None if row is None else WorkspaceProject.model_validate_json(row["payload_json"])

    def update_project(self, project_id: str, patch: WorkspaceProjectPatch) -> WorkspaceProject | None:
        project = self.get_project(project_id)
        if project is None:
            return None
        data = project.model_dump()
        data.update(patch.model_dump(exclude_unset=True))
        data["updated_at"] = utcnow()
        updated = WorkspaceProject.model_validate(data)
        self._connection.execute("UPDATE workspace_projects SET payload_json=? WHERE id=?", (updated.model_dump_json(), project_id))
        self._connection.commit()
        return updated

    def save_draft(self, project_id: str, draft: WorkspaceDraft) -> WorkspaceDraft:
        self._connection.execute("INSERT INTO workspace_drafts VALUES (?, ?, ?)", (project_id, draft.id, draft.model_dump_json()))
        self._connection.commit()
        return draft

    def save_draft_and_transition_to_refine(self, project: WorkspaceProject, draft: WorkspaceDraft) -> WorkspaceDraft:
        data = project.model_dump()
        data.update(stage="refine", draft_base_version=draft.base_graph_version, updated_at=utcnow())
        updated = WorkspaceProject.model_validate(data)
        with self._connection:
            self._connection.execute(
                "INSERT INTO workspace_drafts VALUES (?, ?, ?)",
                (project.id, draft.id, draft.model_dump_json()),
            )
            self._connection.execute(
                "UPDATE workspace_projects SET payload_json=? WHERE id=?",
                (updated.model_dump_json(), project.id),
            )
        return draft

    def list_drafts(self, project_id: str) -> list[WorkspaceDraft]:
        rows = self._connection.execute("SELECT payload_json FROM workspace_drafts WHERE project_id=? ORDER BY id", (project_id,)).fetchall()
        return [WorkspaceDraft.model_validate_json(row["payload_json"]) for row in rows]

    def save_candidate_revision(self, project_id: str, revision: WorkspaceCandidateRevision) -> WorkspaceCandidateRevision:
        self._connection.execute(
            "INSERT INTO workspace_candidate_revisions VALUES (?, ?, ?)",
            (project_id, revision.id, revision.model_dump_json()),
        )
        self._connection.commit()
        return revision

    def list_candidate_revisions(self, project_id: str) -> list[WorkspaceCandidateRevision]:
        rows = self._connection.execute(
            "SELECT payload_json FROM workspace_candidate_revisions WHERE project_id=? ORDER BY id",
            (project_id,),
        ).fetchall()
        return [WorkspaceCandidateRevision.model_validate_json(row["payload_json"]) for row in rows]

    def save_scenario(self, project_id: str, scenario: WorkspaceScenario) -> WorkspaceScenario:
        self._connection.execute("INSERT INTO workspace_scenarios VALUES (?, ?, ?)", (project_id, scenario.id, scenario.model_dump_json()))
        self._connection.commit()
        return scenario

    def list_scenarios(self, project_id: str) -> list[WorkspaceScenario]:
        rows = self._connection.execute("SELECT payload_json FROM workspace_scenarios WHERE project_id=? ORDER BY id", (project_id,)).fetchall()
        return [WorkspaceScenario.model_validate_json(row["payload_json"]) for row in rows]

    def save_ensemble(self, project_id: str, ensemble: WorkspaceEnsemble) -> WorkspaceEnsemble:
        self._connection.execute("INSERT INTO workspace_ensembles VALUES (?, ?, ?)", (project_id, ensemble.id, ensemble.model_dump_json()))
        self._connection.commit()
        return ensemble

    def list_ensembles(self, project_id: str) -> list[WorkspaceEnsemble]:
        rows = self._connection.execute("SELECT payload_json FROM workspace_ensembles WHERE project_id=? ORDER BY id", (project_id,)).fetchall()
        return [WorkspaceEnsemble.model_validate_json(row["payload_json"]) for row in rows]

    def save_monitoring(self, project_id: str, config: MonitoringConfig) -> MonitoringConfig:
        self._connection.execute("INSERT INTO workspace_monitoring VALUES (?, ?) ON CONFLICT(project_id) DO UPDATE SET payload_json=excluded.payload_json", (project_id, config.model_dump_json()))
        self._connection.commit()
        return config

    def get_monitoring(self, project_id: str) -> MonitoringConfig | None:
        row = self._connection.execute("SELECT payload_json FROM workspace_monitoring WHERE project_id=?", (project_id,)).fetchone()
        return None if row is None else MonitoringConfig.model_validate_json(row["payload_json"])

    def save_monitoring_event(self, project_id: str, event: MonitoringFixtureEvent) -> MonitoringFixtureEvent:
        self._connection.execute("INSERT INTO workspace_monitoring_events VALUES (?, ?, ?)", (project_id, event.id, event.model_dump_json()))
        self._connection.commit()
        return event

    def list_monitoring_events(self, project_id: str) -> list[MonitoringFixtureEvent]:
        rows = self._connection.execute("SELECT payload_json FROM workspace_monitoring_events WHERE project_id=? ORDER BY id", (project_id,)).fetchall()
        return [MonitoringFixtureEvent.model_validate_json(row["payload_json"]) for row in rows]

    def acknowledge_monitoring_event(self, project_id: str, event_id: str) -> MonitoringFixtureEvent | None:
        row = self._connection.execute(
            "SELECT payload_json FROM workspace_monitoring_events WHERE project_id=? AND id=?",
            (project_id, event_id),
        ).fetchone()
        if row is None:
            return None
        event = MonitoringFixtureEvent.model_validate_json(row["payload_json"])
        acknowledged = event.model_copy(update={"acknowledged_at": event.acknowledged_at or utcnow()})
        self._connection.execute(
            "UPDATE workspace_monitoring_events SET payload_json=? WHERE project_id=? AND id=?",
            (acknowledged.model_dump_json(), project_id, event_id),
        )
        self._connection.commit()
        return acknowledged
