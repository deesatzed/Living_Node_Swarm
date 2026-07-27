"""Simulation coordinator — on-change ensemble with explicit freshness."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from lns_kernel.ensemble import run_ensemble
from lns_kernel.models import Freshness, SimulationSnapshot, SimStatus
from lns_kernel.store import GraphStore


class SimulationCoordinator:
    def __init__(
        self,
        store: GraphStore,
        *,
        default_seed: int = 42,
        default_n_samples: int = 2000,
    ) -> None:
        self.store = store
        self.default_seed = default_seed
        self.default_n_samples = default_n_samples

    def run_now(
        self,
        graph_id: str,
        *,
        seed: int | None = None,
        n_samples: int | None = None,
    ) -> SimulationSnapshot:
        graph = self.store.get_graph(graph_id)
        if graph is None:
            raise ValueError(f"Graph {graph_id} not found")

        self.store.set_job_state(graph_id, freshness=Freshness.UPDATING, job_running=True)
        started = datetime.now(timezone.utc)
        seed = self.default_seed if seed is None else seed
        n_samples = self.default_n_samples if n_samples is None else n_samples
        snap_id = str(uuid.uuid4())

        try:
            predictives, transform_used, _ = run_ensemble(
                graph.nodes, seed=seed, n_samples=n_samples
            )
            finished = datetime.now(timezone.utc)
            snap = SimulationSnapshot(
                id=snap_id,
                graph_id=graph_id,
                graph_version=graph.graph_version,
                node_predictives=predictives,
                seed=seed,
                n_samples=n_samples,
                transform_kind_used=transform_used,
                started_at=started,
                finished_at=finished,
                status="complete",
            )
            self.store.save_snapshot(snap)
            return snap
        except Exception as e:  # real failure path
            finished = datetime.now(timezone.utc)
            snap = SimulationSnapshot(
                id=snap_id,
                graph_id=graph_id,
                graph_version=graph.graph_version,
                node_predictives={},
                seed=seed,
                n_samples=n_samples,
                transform_kind_used={},
                started_at=started,
                finished_at=finished,
                status="failed",
                error=str(e),
            )
            self.store.save_snapshot(snap)
            return snap

    def status(self, graph_id: str) -> SimStatus:
        meta = self.store.get_sim_meta(graph_id)
        return SimStatus(
            graph_id=graph_id,
            freshness=meta["freshness"],
            graph_version=meta["graph_version"],
            last_snapshot_id=meta["last_snapshot_id"],
            last_error=meta["last_error"],
            job_running=meta["job_running"],
        )
