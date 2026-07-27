"""FastAPI application for Living Node Swarm (localhost only)."""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import logging
import traceback

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from lns_kernel.ensemble import compare_transforms
from lns_kernel.models import (
    Node,
    NodeLayout,
    NodeStatus,
    TransformKind,
)
from lns_kernel.seed import build_seed_graph
from lns_kernel.simulation import SimulationCoordinator
from lns_kernel.store import GraphStore
from lns_kernel.validation import ValidationError
from lns_server.openrouter import OpenRouterClient, OpenRouterError
from lns_server.proposal_normalize import proposal_to_node
from lns_server.settings import Settings

logger = logging.getLogger("lns_server")


class PatchNodeBody(BaseModel):
    parameters: dict[str, float] = Field(default_factory=dict)
    transform: TransformKind | None = None
    transform_params: dict[str, float] | None = None
    status: NodeStatus | None = None
    reason: str = "parameter edit"
    actor: str = "human"
    run_sim: bool = True


class LayoutBody(BaseModel):
    layout: dict[str, NodeLayout]


class CreateGraphBody(BaseModel):
    from_seed: bool = True
    name: str = "seed-demo"


class ProposeNodeBody(BaseModel):
    """AI proposes a node via OpenRouter. model is required unless OPENROUTER_MODEL is set."""

    model: str | None = None
    hint: str = "Propose one useful intermediate factor node for this domain-agnostic graph."
    auto_activate: bool = False  # proposed by default


class TransformExperimentBody(BaseModel):
    node_id: str
    strategies: list[TransformKind] = Field(
        default_factory=lambda: [
            TransformKind.AFFINE,
            TransformKind.SUM_PARENTS,
            TransformKind.MEAN_PARENTS,
        ]
    )
    seed: int = 42
    n_samples: int = 2000


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    store = GraphStore(settings.resolved_db_path())
    coord = SimulationCoordinator(
        store, default_seed=settings.mc_seed, default_n_samples=settings.n_samples
    )
    or_client = OpenRouterClient(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.store = store
        app.state.coord = coord
        app.state.settings = settings
        app.state.openrouter = or_client
        yield
        store.close()

    app = FastAPI(title="Living Node Swarm", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:8787",
            "http://localhost:8787",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception) -> JSONResponse:
        # Do not swallow intentional HTTP errors
        if isinstance(exc, HTTPException):
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        # Surface real cause in local single-user app (never silent 500)
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"{type(exc).__name__}: {exc}",
                "path": request.url.path,
                "trace_tail": traceback.format_exc().splitlines()[-8:],
            },
        )

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {
            "ok": True,
            "host": settings.host,
            "openrouter_key_configured": bool(settings.openrouter_api_key),
            "openrouter_model_configured": bool(settings.default_model()),
            "default_model": settings.default_model(),
            "models": settings.listed_models(),
            # roles only — never expose API key
            "model_slots": {
                k: (v is not None) for k, v in settings.models_catalog().items()
            },
        }

    @app.get("/graphs")
    def list_graphs() -> dict[str, Any]:
        return {"ids": store.list_graph_ids()}

    @app.post("/graphs")
    def create_graph(body: CreateGraphBody) -> dict[str, Any]:
        if body.from_seed:
            g = build_seed_graph(name=body.name)
        else:
            from lns_kernel.models import Graph
            import uuid

            g = Graph(id=str(uuid.uuid4()), name=body.name, nodes={}, layout={})
        store.create_graph(g)
        if g.nodes:
            snap = coord.run_now(g.id)
            return {"graph": json.loads(g.model_dump_json()), "snapshot": json.loads(snap.model_dump_json())}
        return {"graph": json.loads(g.model_dump_json()), "snapshot": None}

    @app.get("/graphs/{graph_id}")
    def get_graph(graph_id: str) -> dict[str, Any]:
        g = store.get_graph(graph_id)
        if not g:
            raise HTTPException(404, "graph not found")
        return json.loads(g.model_dump_json())

    @app.patch("/graphs/{graph_id}/nodes/{node_id}")
    def patch_node(graph_id: str, node_id: str, body: PatchNodeBody) -> dict[str, Any]:
        try:
            g, ev = store.patch_node_parameters(
                graph_id,
                node_id,
                body.parameters,
                actor=body.actor,
                reason=body.reason,
                transform=body.transform.value if body.transform else None,
                transform_params=body.transform_params,
                status=body.status.value if body.status else None,
            )
        except ValidationError as e:
            raise HTTPException(400, str(e)) from e
        snap = None
        if body.run_sim:
            snap = coord.run_now(graph_id)
        return {
            "graph": json.loads(g.model_dump_json()),
            "event": json.loads(ev.model_dump_json()),
            "snapshot": json.loads(snap.model_dump_json()) if snap else None,
            "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
        }

    @app.put("/graphs/{graph_id}/layout")
    def put_layout(graph_id: str, body: LayoutBody) -> dict[str, Any]:
        try:
            g = store.set_layout(graph_id, body.layout)
        except ValidationError as e:
            raise HTTPException(400, str(e)) from e
        return json.loads(g.model_dump_json())

    @app.get("/graphs/{graph_id}/snapshot")
    def get_snapshot(graph_id: str) -> dict[str, Any]:
        snap = store.get_latest_snapshot(graph_id)
        if not snap:
            raise HTTPException(404, "no snapshot")
        return json.loads(snap.model_dump_json())

    @app.get("/graphs/{graph_id}/events")
    def get_events(graph_id: str) -> dict[str, Any]:
        return {"events": [json.loads(e.model_dump_json()) for e in store.list_events(graph_id)]}

    @app.get("/graphs/{graph_id}/sim/status")
    def sim_status(graph_id: str) -> dict[str, Any]:
        try:
            return json.loads(coord.status(graph_id).model_dump_json())
        except ValidationError as e:
            raise HTTPException(404, str(e)) from e

    @app.post("/graphs/{graph_id}/sim/run")
    def sim_run(graph_id: str) -> dict[str, Any]:
        if not store.get_graph(graph_id):
            raise HTTPException(404, "graph not found")
        snap = coord.run_now(graph_id)
        return {
            "snapshot": json.loads(snap.model_dump_json()),
            "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
        }

    @app.get("/graphs/{graph_id}/sim/stream")
    async def sim_stream(graph_id: str) -> StreamingResponse:
        async def gen() -> AsyncIterator[str]:
            last = None
            for _ in range(120):
                try:
                    st = coord.status(graph_id)
                except ValidationError:
                    yield f"data: {json.dumps({'error': 'not found'})}\n\n"
                    return
                payload = json.loads(st.model_dump_json())
                if payload != last:
                    yield f"data: {json.dumps(payload)}\n\n"
                    last = payload
                if st.freshness.value in ("fresh", "failed") and not st.job_running:
                    # keep a couple heartbeats then end
                    await asyncio.sleep(0.2)
                    yield f"data: {json.dumps(payload)}\n\n"
                    return
                await asyncio.sleep(0.25)

        return StreamingResponse(gen(), media_type="text/event-stream")

    @app.post("/graphs/{graph_id}/experiments/transforms")
    def experiment_transforms(graph_id: str, body: TransformExperimentBody) -> dict[str, Any]:
        g = store.get_graph(graph_id)
        if not g:
            raise HTTPException(404, "graph not found")
        if body.node_id not in g.nodes:
            raise HTTPException(400, "node not found")
        rows = compare_transforms(
            g.nodes,
            body.node_id,
            body.strategies,
            seed=body.seed,
            n_samples=body.n_samples,
        )
        # Recommend: prefer strategy with non-zero finite std closest to parent scale heuristic
        viable = [r for r in rows if "error" not in r and (r.get("derived_std") or 0) > 0]
        recommendation = None
        if viable:
            # Prefer affine if present and stable; else highest moderate std under 1e3
            viable_sorted = sorted(viable, key=lambda r: abs((r.get("derived_std") or 0) - 1.0))
            recommendation = viable_sorted[0]["transform"]
        return {
            "node_id": body.node_id,
            "results": rows,
            "recommendation": recommendation,
            "note": "Recommendation is a heuristic; inspect results and choose what fits your graph.",
        }

    @app.post("/graphs/{graph_id}/nodes/{node_id}/activate")
    def activate_node(graph_id: str, node_id: str, run_sim: bool = True) -> dict[str, Any]:
        """Promote proposed → active and re-run ensemble (default)."""
        g = store.get_graph(graph_id)
        if not g:
            raise HTTPException(404, "graph not found")
        if node_id not in g.nodes:
            raise HTTPException(404, "node not found")
        node = g.nodes[node_id]
        if node.status == NodeStatus.ACTIVE:
            snap = store.get_latest_snapshot(graph_id)
            return {
                "graph": json.loads(g.model_dump_json()),
                "event": None,
                "snapshot": json.loads(snap.model_dump_json()) if snap else None,
                "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
                "note": "already active",
            }
        if node.status not in (NodeStatus.PROPOSED, NodeStatus.DEPRECATED):
            raise HTTPException(
                400,
                f"Cannot activate node in status={node.status.value}; expected proposed or deprecated",
            )
        try:
            g2, ev = store.set_node_status(
                graph_id,
                node_id,
                NodeStatus.ACTIVE.value,
                actor="human",
                reason="activate proposed node",
            )
        except ValidationError as e:
            raise HTTPException(400, str(e)) from e
        snap = coord.run_now(graph_id) if run_sim else None
        return {
            "graph": json.loads(g2.model_dump_json()),
            "event": json.loads(ev.model_dump_json()),
            "snapshot": json.loads(snap.model_dump_json()) if snap else None,
            "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
        }

    @app.post("/graphs/{graph_id}/nodes/{node_id}/reject")
    def reject_node(graph_id: str, node_id: str, run_sim: bool = True) -> dict[str, Any]:
        """
        Reject a proposed node (delete). For active nodes, use status=retired via PATCH
        or pass only proposed — refuse deleting active seed chain by default.
        """
        g = store.get_graph(graph_id)
        if not g:
            raise HTTPException(404, "graph not found")
        if node_id not in g.nodes:
            raise HTTPException(404, "node not found")
        node = g.nodes[node_id]
        if node.status != NodeStatus.PROPOSED:
            raise HTTPException(
                400,
                f"Reject only applies to proposed nodes (got {node.status.value}). "
                "Retire active nodes via a separate flow.",
            )
        try:
            g2, ev = store.delete_node(
                graph_id,
                node_id,
                actor="human",
                reason="reject proposed node",
            )
        except ValidationError as e:
            raise HTTPException(400, str(e)) from e
        # Proposed was never in MC; re-sim optional for consistency of freshness
        snap = coord.run_now(graph_id) if run_sim else store.get_latest_snapshot(graph_id)
        return {
            "graph": json.loads(g2.model_dump_json()),
            "event": json.loads(ev.model_dump_json()),
            "snapshot": json.loads(snap.model_dump_json()) if snap else None,
            "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
            "deleted_node_id": node_id,
        }

    @app.post("/graphs/{graph_id}/ai/propose-node")
    def ai_propose_node(graph_id: str, body: ProposeNodeBody) -> dict[str, Any]:
        g = store.get_graph(graph_id)
        if not g:
            raise HTTPException(404, "graph not found")
        model_used = body.model or settings.default_model()
        graph_summary = {
            "nodes": [
                {
                    "id": n.id,
                    "name": n.name,
                    "family": n.distribution_family.value,
                    "parameters": n.parameters,
                    "depends_on": n.depends_on,
                    "transform": n.transform.value,
                    "status": n.status.value,
                }
                for n in g.nodes.values()
            ]
        }
        system = (
            "You are helping expand an explicit probabilistic node graph. "
            "Return ONLY a single JSON object (no markdown) with keys: "
            "id (string snake_case unique), name, description, distribution_family "
            "(exactly one of: Normal, LogNormal, Beta, Deterministic), "
            "parameters (object of NUMERIC values only — for Normal use mu and sigma; "
            "for Beta use a and b; for Deterministic use value), "
            "depends_on (array of existing node ids from the graph), "
            "transform (one of: none, affine, sum_parents, mean_parents), "
            "transform_params (object of numbers; for affine include a0 and a1), "
            "discovery_rationale (string). "
            "Do not put expressions or parent names inside parameters. "
            "Do not reuse an existing node id."
        )
        user = (
            f"Current graph:\n{json.dumps(graph_summary, indent=2)}\n\n"
            f"User hint: {body.hint}\n"
            "Propose exactly one new node with a new unique id."
        )
        try:
            proposal = or_client.chat_json(model=body.model, system=system, user=user)
        except OpenRouterError as e:
            raise HTTPException(400, str(e)) from e

        try:
            status = NodeStatus.ACTIVE if body.auto_activate else NodeStatus.PROPOSED
            node = proposal_to_node(
                proposal,
                existing_ids=set(g.nodes.keys()),
                status=status,
                created_by="openrouter",
                model_tag=model_used,
            )
            g2, ev = store.add_node(
                graph_id,
                node,
                layout=NodeLayout(x=200, y=220),
                actor="openrouter",
                reason=f"ai propose-node model={model_used}",
            )
        except (KeyError, ValueError, TypeError, ValidationError) as e:
            raise HTTPException(
                400, f"Invalid proposal from model: {e}; raw={proposal!r}"
            ) from e

        snap = None
        if status == NodeStatus.ACTIVE:
            snap = coord.run_now(graph_id)
        return {
            "proposal_raw": proposal,
            "node": json.loads(node.model_dump_json()),
            "event": json.loads(ev.model_dump_json()),
            "graph": json.loads(g2.model_dump_json()),
            "snapshot": json.loads(snap.model_dump_json()) if snap else None,
            "model_used": model_used,
        }

    return app


app = create_app()
