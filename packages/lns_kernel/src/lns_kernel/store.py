"""SQLite persistence for graphs, events, snapshots."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lns_kernel.dependencies import assert_acyclic
from lns_kernel.models import (
    Freshness,
    Graph,
    Node,
    NodeLayout,
    NodeStatus,
    SimulationSnapshot,
    UpdateEvent,
    utcnow,
)
from lns_kernel.validation import ValidationError, validate_graph_nodes, validate_node


def _dt(s: str | None) -> datetime | None:
    if s is None:
        return None
    return datetime.fromisoformat(s)


class GraphStore:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = str(db_path)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def close(self) -> None:
        self._conn.close()

    def _init_schema(self) -> None:
        c = self._conn.cursor()
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS graphs (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              graph_version INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              layout_json TEXT NOT NULL,
              freshness TEXT NOT NULL DEFAULT 'stale',
              last_snapshot_id TEXT,
              last_error TEXT,
              job_running INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS nodes (
              graph_id TEXT NOT NULL,
              node_id TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              PRIMARY KEY (graph_id, node_id),
              FOREIGN KEY (graph_id) REFERENCES graphs(id)
            );
            CREATE TABLE IF NOT EXISTS events (
              id TEXT PRIMARY KEY,
              graph_id TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              timestamp TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS snapshots (
              id TEXT PRIMARY KEY,
              graph_id TEXT NOT NULL,
              graph_version INTEGER NOT NULL,
              payload_json TEXT NOT NULL,
              finished_at TEXT
            );
            """
        )
        self._conn.commit()

    def create_graph(self, graph: Graph) -> Graph:
        validate_graph_nodes(graph.nodes)
        assert_acyclic(graph.nodes)
        c = self._conn.cursor()
        c.execute(
            "INSERT INTO graphs (id, name, graph_version, created_at, updated_at, layout_json, freshness) VALUES (?,?,?,?,?,?,?)",
            (
                graph.id,
                graph.name,
                graph.graph_version,
                graph.created_at.isoformat(),
                graph.updated_at.isoformat(),
                json.dumps({k: v.model_dump() for k, v in graph.layout.items()}),
                Freshness.STALE.value,
            ),
        )
        for nid, node in graph.nodes.items():
            c.execute(
                "INSERT INTO nodes (graph_id, node_id, payload_json) VALUES (?,?,?)",
                (graph.id, nid, node.model_dump_json()),
            )
        self._conn.commit()
        return graph

    def get_graph(self, graph_id: str) -> Graph | None:
        c = self._conn.cursor()
        c.execute("SELECT * FROM graphs WHERE id=?", (graph_id,))
        row = c.fetchone()
        if not row:
            return None
        c.execute("SELECT node_id, payload_json FROM nodes WHERE graph_id=?", (graph_id,))
        nodes: dict[str, Node] = {}
        for r in c.fetchall():
            nodes[r["node_id"]] = Node.model_validate_json(r["payload_json"])
        layout_raw = json.loads(row["layout_json"] or "{}")
        layout = {k: NodeLayout.model_validate(v) for k, v in layout_raw.items()}
        return Graph(
            id=row["id"],
            name=row["name"],
            nodes=nodes,
            layout=layout,
            graph_version=row["graph_version"],
            created_at=_dt(row["created_at"]) or utcnow(),
            updated_at=_dt(row["updated_at"]) or utcnow(),
        )

    def list_graph_ids(self) -> list[str]:
        c = self._conn.cursor()
        c.execute("SELECT id FROM graphs ORDER BY created_at")
        return [r["id"] for r in c.fetchall()]

    def patch_node_parameters(
        self,
        graph_id: str,
        node_id: str,
        parameters: dict[str, float],
        *,
        actor: str = "human",
        reason: str = "parameter edit",
        transform: str | None = None,
        transform_params: dict[str, float] | None = None,
        status: str | None = None,
    ) -> tuple[Graph, UpdateEvent]:
        graph = self.get_graph(graph_id)
        if graph is None:
            raise ValidationError(f"Graph {graph_id} not found")
        if node_id not in graph.nodes:
            raise ValidationError(f"Node {node_id} not found")
        node = graph.nodes[node_id]
        old_version = node.version
        old_params = dict(node.parameters)
        new_params = {**node.parameters, **parameters}
        updates: dict[str, Any] = {
            "parameters": new_params,
            "version": old_version + 1,
            "last_updated_by": actor,
            "updated_at": utcnow(),
        }
        if transform is not None:
            updates["transform"] = transform
        if transform_params is not None:
            updates["transform_params"] = {**node.transform_params, **transform_params}
        if status is not None:
            updates["status"] = status
        new_node = node.model_copy(update=updates)
        validate_node(new_node)
        trial = dict(graph.nodes)
        trial[node_id] = new_node
        assert_acyclic(trial)
        validate_graph_nodes(trial)

        graph.nodes[node_id] = new_node
        graph.graph_version += 1
        graph.updated_at = utcnow()

        event = UpdateEvent(
            id=str(uuid.uuid4()),
            graph_id=graph_id,
            node_id=node_id,
            old_version=old_version,
            new_version=new_node.version,
            reason=reason,
            actor=actor,
            diff_summary={"parameters_before": old_params, "parameters_after": new_params},
        )
        c = self._conn.cursor()
        c.execute(
            "UPDATE nodes SET payload_json=? WHERE graph_id=? AND node_id=?",
            (new_node.model_dump_json(), graph_id, node_id),
        )
        c.execute(
            "UPDATE graphs SET graph_version=?, updated_at=?, freshness=? WHERE id=?",
            (graph.graph_version, graph.updated_at.isoformat(), Freshness.STALE.value, graph_id),
        )
        c.execute(
            "INSERT INTO events (id, graph_id, payload_json, timestamp) VALUES (?,?,?,?)",
            (event.id, graph_id, event.model_dump_json(), event.timestamp.isoformat()),
        )
        self._conn.commit()
        return graph, event

    def add_node(
        self,
        graph_id: str,
        node: Node,
        *,
        layout: NodeLayout | None = None,
        actor: str = "human",
        reason: str = "add node",
    ) -> tuple[Graph, UpdateEvent]:
        graph = self.get_graph(graph_id)
        if graph is None:
            raise ValidationError(f"Graph {graph_id} not found")
        if node.id in graph.nodes:
            raise ValidationError(f"Node {node.id} already exists")
        validate_node(node)
        trial = dict(graph.nodes)
        trial[node.id] = node
        assert_acyclic(trial)
        validate_graph_nodes(trial)
        graph.nodes[node.id] = node
        if layout:
            graph.layout[node.id] = layout
        graph.graph_version += 1
        graph.updated_at = utcnow()
        event = UpdateEvent(
            id=str(uuid.uuid4()),
            graph_id=graph_id,
            node_id=node.id,
            old_version=0,
            new_version=node.version,
            reason=reason,
            actor=actor,
            diff_summary={"added": node.model_dump(mode="json")},
        )
        c = self._conn.cursor()
        c.execute(
            "INSERT INTO nodes (graph_id, node_id, payload_json) VALUES (?,?,?)",
            (graph_id, node.id, node.model_dump_json()),
        )
        c.execute(
            "UPDATE graphs SET graph_version=?, updated_at=?, layout_json=?, freshness=? WHERE id=?",
            (
                graph.graph_version,
                graph.updated_at.isoformat(),
                json.dumps({k: v.model_dump() for k, v in graph.layout.items()}),
                Freshness.STALE.value,
                graph_id,
            ),
        )
        c.execute(
            "INSERT INTO events (id, graph_id, payload_json, timestamp) VALUES (?,?,?,?)",
            (event.id, graph_id, event.model_dump_json(), event.timestamp.isoformat()),
        )
        self._conn.commit()
        return graph, event

    def set_node_status(
        self,
        graph_id: str,
        node_id: str,
        status: str,
        *,
        actor: str = "human",
        reason: str = "status change",
    ) -> tuple[Graph, UpdateEvent]:
        """Change node status (e.g. proposed → active). Material change."""
        graph = self.get_graph(graph_id)
        if graph is None:
            raise ValidationError(f"Graph {graph_id} not found")
        if node_id not in graph.nodes:
            raise ValidationError(f"Node {node_id} not found")
        node = graph.nodes[node_id]
        old_status = node.status.value if hasattr(node.status, "value") else str(node.status)
        if old_status == status:
            # no-op event still useful for audit? skip version bump
            event = UpdateEvent(
                id=str(uuid.uuid4()),
                graph_id=graph_id,
                node_id=node_id,
                old_version=node.version,
                new_version=node.version,
                reason=reason,
                actor=actor,
                diff_summary={"status": old_status, "note": "unchanged"},
            )
            return graph, event

        old_version = node.version
        status_enum = status if isinstance(status, NodeStatus) else NodeStatus(status)
        new_node = node.model_copy(
            update={
                "status": status_enum,
                "version": old_version + 1,
                "last_updated_by": actor,
                "updated_at": utcnow(),
            }
        )
        validate_node(new_node)
        trial = dict(graph.nodes)
        trial[node_id] = new_node
        assert_acyclic(trial)
        validate_graph_nodes(trial)

        graph.nodes[node_id] = new_node
        graph.graph_version += 1
        graph.updated_at = utcnow()
        event = UpdateEvent(
            id=str(uuid.uuid4()),
            graph_id=graph_id,
            node_id=node_id,
            old_version=old_version,
            new_version=new_node.version,
            reason=reason,
            actor=actor,
            diff_summary={"status_before": old_status, "status_after": status},
        )
        c = self._conn.cursor()
        c.execute(
            "UPDATE nodes SET payload_json=? WHERE graph_id=? AND node_id=?",
            (new_node.model_dump_json(), graph_id, node_id),
        )
        c.execute(
            "UPDATE graphs SET graph_version=?, updated_at=?, freshness=? WHERE id=?",
            (graph.graph_version, graph.updated_at.isoformat(), Freshness.STALE.value, graph_id),
        )
        c.execute(
            "INSERT INTO events (id, graph_id, payload_json, timestamp) VALUES (?,?,?,?)",
            (event.id, graph_id, event.model_dump_json(), event.timestamp.isoformat()),
        )
        self._conn.commit()
        return graph, event

    def delete_node(
        self,
        graph_id: str,
        node_id: str,
        *,
        actor: str = "human",
        reason: str = "reject node",
        allow_if_dependents: bool = False,
    ) -> tuple[Graph, UpdateEvent]:
        """Remove a node. Default: refuse if other nodes depend on it."""
        graph = self.get_graph(graph_id)
        if graph is None:
            raise ValidationError(f"Graph {graph_id} not found")
        if node_id not in graph.nodes:
            raise ValidationError(f"Node {node_id} not found")
        dependents = [n.id for n in graph.nodes.values() if node_id in n.depends_on]
        if dependents and not allow_if_dependents:
            raise ValidationError(
                f"Cannot delete {node_id}: depended on by {dependents}. "
                "Retire or rewire those nodes first."
            )
        removed = graph.nodes[node_id]
        del graph.nodes[node_id]
        if node_id in graph.layout:
            del graph.layout[node_id]
        graph.graph_version += 1
        graph.updated_at = utcnow()
        event = UpdateEvent(
            id=str(uuid.uuid4()),
            graph_id=graph_id,
            node_id=node_id,
            old_version=removed.version,
            new_version=0,
            reason=reason,
            actor=actor,
            diff_summary={"deleted": removed.model_dump(mode="json"), "dependents": dependents},
        )
        c = self._conn.cursor()
        c.execute("DELETE FROM nodes WHERE graph_id=? AND node_id=?", (graph_id, node_id))
        c.execute(
            "UPDATE graphs SET graph_version=?, updated_at=?, layout_json=?, freshness=? WHERE id=?",
            (
                graph.graph_version,
                graph.updated_at.isoformat(),
                json.dumps({k: v.model_dump() for k, v in graph.layout.items()}),
                Freshness.STALE.value,
                graph_id,
            ),
        )
        c.execute(
            "INSERT INTO events (id, graph_id, payload_json, timestamp) VALUES (?,?,?,?)",
            (event.id, graph_id, event.model_dump_json(), event.timestamp.isoformat()),
        )
        self._conn.commit()
        return graph, event

    def set_layout(self, graph_id: str, layout: dict[str, NodeLayout]) -> Graph:
        graph = self.get_graph(graph_id)
        if graph is None:
            raise ValidationError(f"Graph {graph_id} not found")
        graph.layout = layout
        graph.updated_at = utcnow()
        c = self._conn.cursor()
        c.execute(
            "UPDATE graphs SET layout_json=?, updated_at=? WHERE id=?",
            (
                json.dumps({k: v.model_dump() for k, v in layout.items()}),
                graph.updated_at.isoformat(),
                graph_id,
            ),
        )
        self._conn.commit()
        return graph

    def list_events(self, graph_id: str) -> list[UpdateEvent]:
        c = self._conn.cursor()
        c.execute(
            "SELECT payload_json FROM events WHERE graph_id=? ORDER BY timestamp",
            (graph_id,),
        )
        return [UpdateEvent.model_validate_json(r["payload_json"]) for r in c.fetchall()]

    def save_snapshot(self, snap: SimulationSnapshot) -> None:
        c = self._conn.cursor()
        c.execute(
            "INSERT INTO snapshots (id, graph_id, graph_version, payload_json, finished_at) VALUES (?,?,?,?,?)",
            (
                snap.id,
                snap.graph_id,
                snap.graph_version,
                snap.model_dump_json(),
                snap.finished_at.isoformat() if snap.finished_at else None,
            ),
        )
        if snap.status == "complete":
            c.execute(
                "UPDATE graphs SET last_snapshot_id=?, freshness=?, last_error=NULL, job_running=0 WHERE id=?",
                (snap.id, Freshness.FRESH.value, snap.graph_id),
            )
        else:
            c.execute(
                "UPDATE graphs SET freshness=?, last_error=?, job_running=0 WHERE id=?",
                (Freshness.FAILED.value, snap.error, snap.graph_id),
            )
        self._conn.commit()

    def get_latest_snapshot(self, graph_id: str) -> SimulationSnapshot | None:
        c = self._conn.cursor()
        c.execute(
            "SELECT payload_json FROM snapshots WHERE graph_id=? ORDER BY finished_at DESC LIMIT 1",
            (graph_id,),
        )
        row = c.fetchone()
        if not row:
            return None
        return SimulationSnapshot.model_validate_json(row["payload_json"])

    def set_job_state(
        self,
        graph_id: str,
        *,
        freshness: Freshness,
        job_running: bool,
        last_error: str | None = None,
    ) -> None:
        c = self._conn.cursor()
        c.execute(
            "UPDATE graphs SET freshness=?, job_running=?, last_error=? WHERE id=?",
            (freshness.value, 1 if job_running else 0, last_error, graph_id),
        )
        self._conn.commit()

    def get_sim_meta(self, graph_id: str) -> dict[str, Any]:
        c = self._conn.cursor()
        c.execute(
            "SELECT freshness, last_snapshot_id, last_error, job_running, graph_version FROM graphs WHERE id=?",
            (graph_id,),
        )
        row = c.fetchone()
        if not row:
            raise ValidationError(f"Graph {graph_id} not found")
        return {
            "freshness": Freshness(row["freshness"]),
            "last_snapshot_id": row["last_snapshot_id"],
            "last_error": row["last_error"],
            "job_running": bool(row["job_running"]),
            "graph_version": row["graph_version"],
        }
