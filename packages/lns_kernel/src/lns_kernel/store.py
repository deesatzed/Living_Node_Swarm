"""SQLite persistence for graphs, events, snapshots."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lns_kernel.contracts import RelationshipContract
from lns_kernel.dependencies import assert_acyclic
from lns_kernel.models import (
    Freshness,
    Graph,
    Node,
    NodeLayout,
    NodeStatus,
    SimulationSnapshot,
    TransformKind,
    UpdateEvent,
    utcnow,
)
from lns_kernel.validation import ValidationError, validate_graph_nodes, validate_node


def _dt(s: str | None) -> datetime | None:
    if s is None:
        return None
    return datetime.fromisoformat(s)


def _validate_graph_relationships(graph: Graph) -> None:
    for relationship_id, relationship in graph.relationships.items():
        if relationship_id != relationship.id:
            raise ValidationError(
                f"Graph relationship key {relationship_id} does not match contract id {relationship.id}"
            )
        if relationship.state != "active":
            raise ValidationError(f"Graph relationship {relationship_id} must be active")
        child = graph.nodes.get(relationship.child_node_id)
        if relationship.parent_node_id not in graph.nodes or child is None:
            raise ValidationError(f"Graph relationship {relationship_id} references a missing node")
        if relationship.parent_node_id not in child.depends_on:
            raise ValidationError(
                f"Graph relationship {relationship_id} is missing from child dependency {relationship.child_node_id}"
            )
    known_relationship_ids = set(graph.relationships)
    for node in graph.nodes.values():
        unknown_relationship_ids = set(node.relationship_ids) - known_relationship_ids
        if unknown_relationship_ids:
            raise ValidationError(
                f"Node {node.id} references unknown relationships: {', '.join(sorted(unknown_relationship_ids))}"
            )


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
            CREATE TABLE IF NOT EXISTS relationships (
              graph_id TEXT NOT NULL,
              relationship_id TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              PRIMARY KEY (graph_id, relationship_id),
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
        _validate_graph_relationships(graph)
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
        for relationship_id, relationship in graph.relationships.items():
            c.execute(
                "INSERT INTO relationships (graph_id, relationship_id, payload_json) VALUES (?,?,?)",
                (graph.id, relationship_id, relationship.model_dump_json()),
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
        c.execute("SELECT relationship_id, payload_json FROM relationships WHERE graph_id=?", (graph_id,))
        relationships: dict[str, RelationshipContract] = {}
        for r in c.fetchall():
            relationships[r["relationship_id"]] = RelationshipContract.model_validate_json(r["payload_json"])
        layout_raw = json.loads(row["layout_json"] or "{}")
        layout = {k: NodeLayout.model_validate(v) for k, v in layout_raw.items()}
        return Graph(
            id=row["id"],
            name=row["name"],
            nodes=nodes,
            relationships=relationships,
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

    def apply_parameter_overrides_atomically(
        self,
        graph_id: str,
        *,
        expected_graph_version: int,
        overrides: dict[str, dict[str, float]],
        actor: str,
        reason: str,
    ) -> tuple[Graph, list[UpdateEvent]]:
        """Validate and apply a candidate parameter set in one SQLite transaction."""

        graph = self.get_graph(graph_id)
        if graph is None:
            raise ValidationError(f"Graph {graph_id} not found")
        if graph.graph_version != expected_graph_version:
            raise ValidationError("candidate proposal invalidated by graph version change")
        trial = dict(graph.nodes)
        events: list[UpdateEvent] = []
        for node_id, patch in overrides.items():
            old_node = trial.get(node_id)
            if old_node is None:
                raise ValidationError(f"Candidate override references missing node {node_id}")
            parameters = {**old_node.parameters, **patch}
            new_node = old_node.model_copy(
                update={
                    "parameters": parameters,
                    "version": old_node.version + 1,
                    "last_updated_by": actor,
                    "updated_at": utcnow(),
                }
            )
            validate_node(new_node)
            trial[node_id] = new_node
            events.append(
                UpdateEvent(
                    id=str(uuid.uuid4()),
                    graph_id=graph_id,
                    node_id=node_id,
                    old_version=old_node.version,
                    new_version=new_node.version,
                    reason=reason,
                    actor=actor,
                    diff_summary={"parameters_before": old_node.parameters, "parameters_after": parameters},
                )
            )
        assert_acyclic(trial)
        validate_graph_nodes(trial)
        graph.nodes = trial
        graph.graph_version += 1
        graph.updated_at = utcnow()
        cursor = self._conn.cursor()
        try:
            cursor.execute("BEGIN IMMEDIATE")
            for node_id, node in trial.items():
                if node_id in overrides:
                    cursor.execute(
                        "UPDATE nodes SET payload_json=? WHERE graph_id=? AND node_id=?",
                        (node.model_dump_json(), graph_id, node_id),
                    )
            cursor.execute(
                "UPDATE graphs SET graph_version=?, updated_at=?, freshness=? WHERE id=?",
                (graph.graph_version, graph.updated_at.isoformat(), Freshness.STALE.value, graph_id),
            )
            for event in events:
                cursor.execute(
                    "INSERT INTO events (id, graph_id, payload_json, timestamp) VALUES (?,?,?,?)",
                    (event.id, graph_id, event.model_dump_json(), event.timestamp.isoformat()),
                )
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise
        return graph, events

    def apply_relationship_additions_atomically(
        self,
        graph_id: str,
        *,
        expected_graph_version: int,
        relationships: tuple[RelationshipContract, ...],
        actor: str,
        reason: str,
    ) -> tuple[Graph, list[UpdateEvent]]:
        """Activate exact proposed relationship additions in one SQLite transaction."""

        graph = self.get_graph(graph_id)
        if graph is None:
            raise ValidationError(f"Graph {graph_id} not found")
        if graph.graph_version != expected_graph_version:
            raise ValidationError("structural proposal invalidated by graph version change")
        trial = graph.model_copy(deep=True)
        events: list[UpdateEvent] = []
        changed_node_ids: set[str] = set()
        for relationship in relationships:
            if relationship.state != "proposed":
                raise ValidationError(f"structural proposal relationship {relationship.id} must be proposed")
            if relationship.id in trial.relationships:
                raise ValidationError(f"structural proposal relationship already exists: {relationship.id}")
            parent = trial.nodes.get(relationship.parent_node_id)
            child = trial.nodes.get(relationship.child_node_id)
            if parent is None or child is None:
                raise ValidationError(f"structural proposal relationship {relationship.id} references a missing node")
            if relationship.parent_node_id in child.depends_on:
                raise ValidationError(f"structural proposal relationship {relationship.id} duplicates an active dependency")
            if child.transform == TransformKind.NONE:
                raise ValidationError(f"structural proposal child {child.id} cannot add a dependency with transform none")
            if relationship.transform != child.transform.value:
                raise ValidationError(
                    f"structural proposal relationship {relationship.id} transform must match child transform {child.transform.value}"
                )
            coefficient = relationship.coefficient_parameter_map.get("coefficient")
            if coefficient is None:
                raise ValidationError(
                    f"structural proposal relationship {relationship.id} requires coefficient_parameters.coefficient"
                )
            active_relationship = relationship.model_copy(update={"state": "active"})
            new_child = child.model_copy(
                update={
                    "depends_on": [*child.depends_on, relationship.parent_node_id],
                    "relationship_ids": [*child.relationship_ids, relationship.id],
                    "transform_params": {**child.transform_params, f"a{len(child.depends_on) + 1}": coefficient},
                    "version": child.version + 1,
                    "last_updated_by": actor,
                    "updated_at": utcnow(),
                }
            )
            trial.relationships[relationship.id] = active_relationship
            trial.nodes[child.id] = new_child
            changed_node_ids.add(child.id)
            events.append(
                UpdateEvent(
                    id=str(uuid.uuid4()),
                    graph_id=graph_id,
                    node_id=child.id,
                    old_version=child.version,
                    new_version=new_child.version,
                    reason=reason,
                    actor=actor,
                    diff_summary={
                        "relationship_added": relationship.id,
                        "depends_on_before": child.depends_on,
                        "depends_on_after": new_child.depends_on,
                    },
                )
            )
        validate_graph_nodes(trial.nodes)
        assert_acyclic(trial.nodes)
        _validate_graph_relationships(trial)
        trial.graph_version += 1
        trial.updated_at = utcnow()
        cursor = self._conn.cursor()
        try:
            cursor.execute("BEGIN IMMEDIATE")
            row = cursor.execute("SELECT graph_version FROM graphs WHERE id=?", (graph_id,)).fetchone()
            if row is None:
                raise ValidationError(f"Graph {graph_id} not found")
            if row["graph_version"] != expected_graph_version:
                raise ValidationError("structural proposal invalidated by graph version change")
            for node_id in changed_node_ids:
                cursor.execute(
                    "UPDATE nodes SET payload_json=? WHERE graph_id=? AND node_id=?",
                    (trial.nodes[node_id].model_dump_json(), graph_id, node_id),
                )
            for relationship in relationships:
                cursor.execute(
                    "INSERT INTO relationships (graph_id, relationship_id, payload_json) VALUES (?,?,?)",
                    (graph_id, relationship.id, trial.relationships[relationship.id].model_dump_json()),
                )
            cursor.execute(
                "UPDATE graphs SET graph_version=?, updated_at=?, freshness=? WHERE id=?",
                (trial.graph_version, trial.updated_at.isoformat(), Freshness.STALE.value, graph_id),
            )
            for event in events:
                cursor.execute(
                    "INSERT INTO events (id, graph_id, payload_json, timestamp) VALUES (?,?,?,?)",
                    (event.id, graph_id, event.model_dump_json(), event.timestamp.isoformat()),
                )
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise
        return trial, events

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

    def wire_parent(
        self,
        graph_id: str,
        parent_id: str,
        child_id: str,
        *,
        weight: float = 1.0,
        actor: str = "human",
        reason: str = "wire parent into child",
    ) -> tuple[Graph, UpdateEvent]:
        """
        Make parent_id an additional depends_on of child_id so ensemble composition
        includes the parent. Child becomes affine over parents if needed.
        """
        graph = self.get_graph(graph_id)
        if graph is None:
            raise ValidationError(f"Graph {graph_id} not found")
        if parent_id not in graph.nodes:
            raise ValidationError(f"Parent node {parent_id} not found")
        if child_id not in graph.nodes:
            raise ValidationError(f"Child node {child_id} not found")
        if parent_id == child_id:
            raise ValidationError("Cannot wire a node as its own parent")
        parent = graph.nodes[parent_id]
        child = graph.nodes[child_id]
        if parent.status != NodeStatus.ACTIVE:
            raise ValidationError(
                f"Parent {parent_id} must be active before wiring (status={parent.status.value})"
            )
        if parent_id in child.depends_on:
            raise ValidationError(f"{parent_id} is already a parent of {child_id}")

        new_depends = list(child.depends_on) + [parent_id]
        # Preserve existing affine coeffs; append weight for new parent as a{n}
        tp = dict(child.transform_params)
        if child.transform.value == "none" or not child.depends_on:
            # first parent(s) setup
            tp.setdefault("a0", 0.0)
            # existing parents get default weight 1 if missing
            for i in range(len(child.depends_on)):
                tp.setdefault(f"a{i + 1}", 1.0)
        new_idx = len(new_depends)  # 1-based a_i for last parent
        tp[f"a{new_idx}"] = float(weight)
        tp.setdefault("a0", 0.0)

        old_version = child.version
        new_child = child.model_copy(
            update={
                "depends_on": new_depends,
                "transform": TransformKind.AFFINE,
                "transform_params": tp,
                "version": old_version + 1,
                "last_updated_by": actor,
                "updated_at": utcnow(),
            }
        )
        validate_node(new_child)
        trial = dict(graph.nodes)
        trial[child_id] = new_child
        assert_acyclic(trial)
        validate_graph_nodes(trial)

        graph.nodes[child_id] = new_child
        graph.graph_version += 1
        graph.updated_at = utcnow()
        event = UpdateEvent(
            id=str(uuid.uuid4()),
            graph_id=graph_id,
            node_id=child_id,
            old_version=old_version,
            new_version=new_child.version,
            reason=reason,
            actor=actor,
            diff_summary={
                "wired_parent": parent_id,
                "child": child_id,
                "depends_on_after": new_depends,
                "weight": weight,
            },
        )
        c = self._conn.cursor()
        c.execute(
            "UPDATE nodes SET payload_json=? WHERE graph_id=? AND node_id=?",
            (new_child.model_dump_json(), graph_id, child_id),
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

    def list_snapshots(self, graph_id: str, *, limit: int = 20) -> list[SimulationSnapshot]:
        """Return persisted receipts newest first; this is read-only history, not a rerun."""

        if limit <= 0:
            raise ValueError("snapshot history limit must be positive")
        c = self._conn.cursor()
        c.execute(
            "SELECT payload_json FROM snapshots WHERE graph_id=? ORDER BY finished_at DESC LIMIT ?",
            (graph_id, limit),
        )
        return [SimulationSnapshot.model_validate_json(row["payload_json"]) for row in c.fetchall()]

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
