"""FastAPI application for Living Node Swarm (localhost only)."""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

import logging
import traceback

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from lns_kernel.ensemble import compare_transforms, run_ensemble, weighted_outcome_mixture
from lns_kernel.contracts import TargetContract
from lns_kernel.distributions import REGISTRY, distribution_statistics, get_family, normalize_parameters
from lns_kernel.models import (
    Node,
    NodeLayout,
    NodeStatus,
    TransformKind,
)
from lns_kernel.gas_seed import build_gas_graph
from lns_kernel.scoring import brier
from lns_kernel.seed import build_seed_graph
from lns_kernel.simulation import SimulationCoordinator
from lns_kernel.store import GraphStore
from lns_kernel.validation import ValidationError
from lns_server.gas_ai import expand_gas_factors, layout_for_new_nodes
from lns_server.candidate_graph import build_neodymium_fixture
from lns_server.distribution_elicitation import ElicitDistributionBody, elicit_from_median_p90
from lns_server.relationship_authoring import RelationshipValidationBody, validate_proposed_relationships
from lns_server.structural_proposals import (
    StructuralProposalBody,
    make_structural_approval_receipt,
    make_structural_proposal,
)
from lns_server.shadow_simulation import ShadowSimulationBody, ShadowSimulationError, run_local_sensitivity, run_shadow_simulation
from lns_server.candidate_approval import (
    ApproveCandidateBody,
    CandidateProposalBody,
    make_approval_receipt,
    make_candidate_proposal,
)
from lns_server.evidence_store import EvidenceStore
from lns_server.journal import TradeJournal
from lns_server.kalshi_client import KalshiClient, KalshiError
from lns_server.openrouter import OpenRouterClient, OpenRouterError
from lns_server.proposal_normalize import proposal_to_node
from lns_server.research_review import ClaimReviewBody, make_claim_review
from lns_server.settings import Settings
from lns_server.workspace_models import (
    MonitoringConfig,
    MonitoringFixtureEvent,
    WorkspaceCandidateRevision,
    WorkspaceDraft,
    WorkspaceEnsemble,
    WorkspaceEnsembleApproval,
    WorkspaceProject,
    WorkspaceProjectPatch,
    WorkspaceScenario,
)
from lns_server.workspace_store import WorkspaceStore

logger = logging.getLogger("lns_server")


class PatchNodeBody(BaseModel):
    parameters: dict[str, float] = Field(default_factory=dict)
    transform: TransformKind | None = None
    transform_params: dict[str, float] | None = None
    status: NodeStatus | None = None
    reason: str = "parameter edit"
    actor: str = "human"
    run_sim: bool = True


class DistributionStatisticsBody(BaseModel):
    """A read-only request for analytic statistics from the kernel registry."""

    family_id: str
    parameters: dict[str, float]


class LayoutBody(BaseModel):
    layout: dict[str, NodeLayout]


class CreateGraphBody(BaseModel):
    from_seed: bool = True
    seed_kind: str = "demo"  # demo | gas
    name: str = "seed-demo"
    # gas seed options
    ticker: str = ""
    threshold_usd: float = 4.12
    market_yes_mid: float | None = None
    title: str = "US gas prices threshold market"


class GasGraphBody(BaseModel):
    ticker: str = ""
    threshold_usd: float = 4.12
    market_yes_mid: float | None = None
    name: str = "us-gas-kalshi"
    title: str = "US gas prices threshold market"
    run_sim: bool = True


class JournalOpenBody(BaseModel):
    ticker: str
    side: str = "yes"  # yes | no
    contracts: int = 1
    entry_yes_mid: float | None = None  # if None, fetch live mid
    move_pct: float | None = None  # default from settings (0.20)
    graph_id: str | None = None
    notes: str = ""


class JournalCloseBody(BaseModel):
    exit_yes_mid: float | None = None
    exit_reason: str = "manual"


class TradeOrderBody(BaseModel):
    """Place or preview a Kalshi order. confirm=false (default) never hits the exchange."""

    ticker: str
    action: str = "buy"  # buy | sell
    side: str = "yes"  # yes | no
    contracts: int = 1
    limit_price_cents: int | None = None
    confirm: bool = False
    journal: bool = True  # open/close journal entry on execute
    graph_id: str | None = None
    notes: str = ""


class AutoSellBody(BaseModel):
    """Check open journal positions; sell on Kalshi when 20% mid move hit."""

    confirm: bool = False  # false = dry-run evaluations only


class GasExpandBody(BaseModel):
    """AI expands dynamic latent factors for the gas graph."""

    model: str | None = None
    hint: str = ""
    auto_activate: bool = False
    auto_wire: bool = True  # wire new active/proposed parents into model_price_index when activated later


class GasBootstrapBody(BaseModel):
    """Create gas graph, optional Kalshi mid, optional AI expand."""

    ticker: str = ""
    threshold_usd: float = 4.12
    market_yes_mid: float | None = None
    title: str = "US gas prices threshold market"
    expand_ai: bool = True
    model: str | None = None
    hint: str = ""
    auto_activate_ai: bool = False


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


class LocalSensitivityBody(BaseModel):
    target_node_id: str
    perturbation_fraction: float = Field(default=0.05, gt=0, le=1)
    seed: int = Field(default=42, ge=0)
    n_samples: int = Field(default=2_000, gt=0, le=10_000)


class WeightedEnsembleMemberBody(BaseModel):
    graph_id: str
    graph_version: int = Field(ge=1)
    target_node_id: str
    weight: float = Field(ge=0)


class WeightedEnsembleBody(BaseModel):
    members: list[WeightedEnsembleMemberBody] = Field(min_length=2, max_length=8)
    seed: int = Field(default=42, ge=0)
    n_samples: int = Field(default=2_000, gt=0, le=10_000)


class ApproveEnsembleBody(BaseModel):
    approved_by: str
    binding_hash: str


class WireBody(BaseModel):
    """Wire parent_node into child as an additional depends_on edge."""

    child_id: str
    weight: float = 1.0
    run_sim: bool = True


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    store = GraphStore(settings.resolved_db_path())
    evidence_db_path = Path(settings.resolved_db_path()).with_name("lns_evidence.db")
    workspace_db_path = settings.resolved_workspace_db_path()
    journal = TradeJournal(Path(settings.resolved_db_path()).with_name("lns_journal.db"))
    coord = SimulationCoordinator(
        store, default_seed=settings.mc_seed, default_n_samples=settings.n_samples
    )
    or_client = OpenRouterClient(settings)
    kalshi = KalshiClient(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        evidence_store = EvidenceStore(evidence_db_path)
        workspace_store = WorkspaceStore(workspace_db_path)
        app.state.store = store
        app.state.evidence_store = evidence_store
        app.state.workspace_store = workspace_store
        app.state.coord = coord
        app.state.settings = settings
        app.state.openrouter = or_client
        app.state.journal = journal
        app.state.kalshi = kalshi
        yield
        store.close()
        evidence_store.close()
        workspace_store.close()
        journal.close()

    app = FastAPI(title="Living Node Swarm", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://localhost:5174",
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
            "kalshi_env": settings.kalshi_env,
            "kalshi_key_configured": bool(settings.kalshi_key_id()),
            "kalshi_exit_move_pct": settings.kalshi_exit_move_pct,
            "use_cases": ["demo", "gas"],
        }

    @app.get("/graphs")
    def list_graphs() -> dict[str, Any]:
        return {"ids": store.list_graph_ids()}

    def require_project(project_id: str) -> WorkspaceProject:
        project = app.state.workspace_store.get_project(project_id)
        if project is None:
            raise HTTPException(404, "project not found")
        return project

    @app.get("/projects")
    def list_projects() -> dict[str, Any]:
        return {"projects": [project.model_dump(mode="json") for project in app.state.workspace_store.list_projects()]}

    @app.post("/projects")
    def create_project(project: WorkspaceProject) -> dict[str, Any]:
        try:
            return app.state.workspace_store.create_project(project).model_dump(mode="json")
        except Exception as exc:
            if "UNIQUE" in str(exc).upper():
                raise HTTPException(409, "project already exists") from exc
            raise

    @app.get("/projects/{project_id}")
    def get_project(project_id: str) -> dict[str, Any]:
        return require_project(project_id).model_dump(mode="json")

    @app.patch("/projects/{project_id}")
    def patch_project(project_id: str, patch: WorkspaceProjectPatch) -> dict[str, Any]:
        require_project(project_id)
        return app.state.workspace_store.update_project(project_id, patch).model_dump(mode="json")

    @app.post("/projects/{project_id}/drafts")
    def create_workspace_draft(project_id: str, draft: WorkspaceDraft) -> dict[str, Any]:
        project = require_project(project_id)
        if project.active_graph_version is not None and draft.base_graph_version != project.active_graph_version:
            raise HTTPException(409, "draft base graph version is stale")
        saved = app.state.workspace_store.save_draft_and_transition_to_refine(project, draft)
        return saved.model_dump(mode="json")

    @app.get("/projects/{project_id}/revisions")
    def list_workspace_revisions(project_id: str) -> dict[str, Any]:
        require_project(project_id)
        return {"drafts": [draft.model_dump(mode="json") for draft in app.state.workspace_store.list_drafts(project_id)]}

    @app.post("/projects/{project_id}/candidate-revisions")
    def create_workspace_candidate_revision(
        project_id: str, revision: WorkspaceCandidateRevision
    ) -> dict[str, Any]:
        project = require_project(project_id)
        if project.active_graph_version is None or revision.base_graph_version != project.active_graph_version:
            raise HTTPException(409, "candidate revision base graph version is stale")
        if revision.candidate_node_state_overrides or revision.candidate_relationship_state_overrides or revision.candidate_relationship_contracts or revision.candidate_new_nodes:
            if not project.graph_id:
                raise HTTPException(409, "candidate revision project has no active graph")
            graph = app.state.store.get_graph(project.graph_id)
            if graph is None:
                raise HTTPException(404, "project active graph not found")
            unknown = sorted(set(revision.candidate_node_state_overrides) - set(graph.nodes))
            if unknown:
                raise HTTPException(422, f"candidate revision references unknown graph nodes: {', '.join(unknown)}")
            known_relationships = {f"{parent}:{node_id}" for node_id, node in graph.nodes.items() for parent in node.depends_on}
            unknown_relationships = sorted(set(revision.candidate_relationship_state_overrides) - known_relationships)
            if unknown_relationships:
                raise HTTPException(422, f"candidate revision references unknown graph relationships: {', '.join(unknown_relationships)}")
            relationship_contract_nodes = {
                node_id
                for relationship in revision.candidate_relationship_contracts
                for node_id in (relationship.parent_node_id, relationship.child_node_id)
            }
            unknown_contract_nodes = sorted(relationship_contract_nodes - set(graph.nodes))
            if unknown_contract_nodes:
                raise HTTPException(422, f"candidate relationship contract references unknown graph nodes: {', '.join(unknown_contract_nodes)}")
            unknown_evidence_claims = sorted({
                claim_id
                for relationship in revision.candidate_relationship_contracts
                for claim_id in relationship.evidence_claim_ids
                if app.state.evidence_store.get_evidence_claim(claim_id) is None
            })
            if unknown_evidence_claims:
                raise HTTPException(422, f"candidate relationship contract references unknown evidence claims: {', '.join(unknown_evidence_claims)}")
            duplicate_nodes = sorted({node.id for node in revision.candidate_new_nodes} & set(graph.nodes))
            if duplicate_nodes:
                raise HTTPException(422, f"candidate revision new nodes already exist in active graph: {', '.join(duplicate_nodes)}")
            invalid_dependencies = sorted({dependency for node in revision.candidate_new_nodes for dependency in node.depends_on if dependency not in graph.nodes})
            if invalid_dependencies:
                raise HTTPException(422, f"candidate revision new nodes reference unknown active nodes: {', '.join(invalid_dependencies)}")
        return app.state.workspace_store.save_candidate_revision(project_id, revision).model_dump(mode="json")

    @app.get("/projects/{project_id}/candidate-revisions")
    def list_workspace_candidate_revisions(project_id: str) -> dict[str, Any]:
        require_project(project_id)
        return {
            "candidate_revisions": [
                revision.model_dump(mode="json")
                for revision in app.state.workspace_store.list_candidate_revisions(project_id)
            ]
        }

    @app.post("/projects/{project_id}/scenarios")
    def create_workspace_scenario(project_id: str, scenario: WorkspaceScenario) -> dict[str, Any]:
        require_project(project_id)
        return app.state.workspace_store.save_scenario(project_id, scenario).model_dump(mode="json")

    @app.get("/projects/{project_id}/scenarios")
    def list_workspace_scenarios(project_id: str) -> dict[str, Any]:
        require_project(project_id)
        return {"scenarios": [scenario.model_dump(mode="json") for scenario in app.state.workspace_store.list_scenarios(project_id)]}

    @app.post("/projects/{project_id}/ensembles")
    def create_workspace_ensemble(project_id: str, ensemble: WorkspaceEnsemble) -> dict[str, Any]:
        require_project(project_id)
        for member in ensemble.members:
            graph = app.state.store.get_graph(member.graph_id)
            if graph is None:
                raise HTTPException(404, f"ensemble member graph not found: {member.graph_id}")
            if graph.graph_version != member.graph_version:
                raise HTTPException(409, f"ensemble member graph version is stale: {member.graph_id}")
            if member.target_node_id not in graph.nodes or graph.nodes[member.target_node_id].status != NodeStatus.ACTIVE:
                raise HTTPException(422, f"ensemble member target is not active: {member.graph_id}:{member.target_node_id}")
        saved = app.state.workspace_store.save_ensemble(project_id, ensemble)
        return {**saved.model_dump(mode="json"), "binding_hash": saved.binding_hash}

    @app.get("/projects/{project_id}/ensembles")
    def list_workspace_ensembles(project_id: str) -> dict[str, Any]:
        require_project(project_id)
        return {"ensembles": [{**ensemble.model_dump(mode="json"), "binding_hash": ensemble.binding_hash} for ensemble in app.state.workspace_store.list_ensembles(project_id)]}

    @app.post("/projects/{project_id}/ensembles/{ensemble_id}/approve")
    def approve_workspace_ensemble(project_id: str, ensemble_id: str, body: ApproveEnsembleBody) -> dict[str, Any]:
        require_project(project_id)
        ensemble = next((item for item in app.state.workspace_store.list_ensembles(project_id) if item.id == ensemble_id), None)
        if ensemble is None:
            raise HTTPException(404, "ensemble configuration not found")
        if ensemble.binding_hash != body.binding_hash:
            raise HTTPException(409, "ensemble binding hash does not match the saved configuration")
        for member in ensemble.members:
            graph = app.state.store.get_graph(member.graph_id)
            if graph is None or graph.graph_version != member.graph_version:
                raise HTTPException(409, "ensemble member version is stale")
        approval = WorkspaceEnsembleApproval(
            id=f"ensemble-approval-{ensemble.id}", ensemble_id=ensemble.id,
            binding_hash=ensemble.binding_hash, approved_by=body.approved_by,
        )
        saved = app.state.workspace_store.save_ensemble_approval(project_id, approval)
        return {"approval_receipt": saved.model_dump(mode="json"), "ensemble": ensemble.model_dump(mode="json"), "active_graph_mutated": False}

    @app.get("/projects/{project_id}/ensemble-approvals")
    def list_workspace_ensemble_approvals(project_id: str) -> dict[str, Any]:
        require_project(project_id)
        return {
            "approval_receipts": [
                approval.model_dump(mode="json")
                for approval in app.state.workspace_store.list_ensemble_approvals(project_id)
            ]
        }

    @app.post("/projects/{project_id}/scenarios/{scenario_id}/simulate")
    def simulate_workspace_scenario(project_id: str, scenario_id: str) -> dict[str, Any]:
        project = require_project(project_id)
        scenario = next((item for item in app.state.workspace_store.list_scenarios(project_id) if item.id == scenario_id), None)
        if scenario is None:
            raise HTTPException(404, "scenario not found")
        if not project.graph_id or project.active_graph_version is None:
            raise HTTPException(409, "project has no approved graph version")
        if scenario.base_graph_version != project.active_graph_version or not scenario.target_node_id or not scenario.parameter_overrides:
            raise HTTPException(409, "scenario is not executable against the current approved graph version")
        graph = app.state.store.get_graph(project.graph_id)
        if graph is None:
            raise HTTPException(404, "project active graph not found")
        if graph.graph_version != scenario.base_graph_version:
            raise HTTPException(409, "scenario base graph version is stale")
        try:
            comparison = run_shadow_simulation(graph, ShadowSimulationBody(
                target_node_id=scenario.target_node_id,
                candidate_parameter_overrides=scenario.parameter_overrides,
            ))
        except ShadowSimulationError as exc:
            raise HTTPException(422, str(exc)) from exc
        return {
            "scenario": scenario.model_dump(mode="json"),
            "comparison": comparison,
            "active_graph_mutated": False,
            "limitations": ["Scenario execution is an in-memory parameter comparison. It does not activate, approve, or persist a changed graph."],
        }

    @app.put("/projects/{project_id}/monitoring")
    def put_workspace_monitoring(project_id: str, config: MonitoringConfig) -> dict[str, Any]:
        require_project(project_id)
        return app.state.workspace_store.save_monitoring(project_id, config).model_dump(mode="json")

    @app.get("/projects/{project_id}/monitoring")
    def get_workspace_monitoring(project_id: str) -> dict[str, Any]:
        require_project(project_id)
        config = app.state.workspace_store.get_monitoring(project_id)
        return {
            "config": None if config is None else config.model_dump(mode="json"),
            "events": [event.model_dump(mode="json") for event in app.state.workspace_store.list_monitoring_events(project_id)],
        }

    @app.post("/projects/{project_id}/monitoring/fixture-events")
    def create_monitoring_fixture_event(project_id: str, event: MonitoringFixtureEvent) -> dict[str, Any]:
        require_project(project_id)
        return app.state.workspace_store.save_monitoring_event(project_id, event).model_dump(mode="json")

    @app.post("/projects/{project_id}/monitoring/events/{event_id}/acknowledge")
    def acknowledge_monitoring_event(project_id: str, event_id: str) -> dict[str, Any]:
        require_project(project_id)
        event = app.state.workspace_store.acknowledge_monitoring_event(project_id, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Monitoring event not found")
        return event.model_dump(mode="json")

    @app.get("/catalog/distributions")
    def list_distribution_catalog() -> dict[str, Any]:
        """Expose the frozen kernel registry for UI labels and field guidance."""
        return {
            "families": [
                {
                    "id": family.id,
                    "label": family.label,
                    "plain_language": family.plain_language,
                    "parameters": [
                        {
                            "id": parameter.id,
                            "label": parameter.label,
                            "description": parameter.description,
                            "lower": parameter.lower,
                            "lower_open": parameter.lower_open,
                        }
                        for parameter in family.parameter_definitions
                    ],
                    "support": {
                        "lower": family.support.lower,
                        "upper": family.support.upper,
                        "lower_open": family.support.lower_open,
                        "upper_open": family.support.upper_open,
                    },
                }
                for family in REGISTRY.values()
            ]
        }

    @app.post("/authoring/distributions/statistics")
    def inspect_distribution_statistics(body: DistributionStatisticsBody) -> dict[str, Any]:
        """Calculate registry-defined analytic statistics without fitting or mutating a node."""

        try:
            family = get_family(body.family_id)
            parameters = normalize_parameters(family.id, body.parameters)
            return {
                "family_id": family.id,
                "parameters": parameters,
                "statistics": distribution_statistics(family.id, parameters),
            }
        except (KeyError, ValueError) as exc:
            raise HTTPException(400, str(exc)) from exc

    @app.post("/targets")
    def create_target(target: TargetContract) -> dict[str, Any]:
        app.state.evidence_store.save_target_contract(target)
        return {"target": json.loads(target.model_dump_json())}

    @app.get("/targets/{target_id}")
    def get_target(target_id: str) -> dict[str, Any]:
        target = app.state.evidence_store.get_target_contract(target_id)
        if target is None:
            raise HTTPException(404, "target not found")
        return json.loads(target.model_dump_json())

    @app.get("/research/targets/{target_id}/review")
    def get_research_review(target_id: str) -> dict[str, Any]:
        claims = []
        for claim in app.state.evidence_store.list_evidence_claims():
            source = (
                app.state.evidence_store.get_source_receipt(claim.source_receipt_id)
                if claim.source_receipt_id
                else None
            )
            review = app.state.evidence_store.get_claim_review(
                target_contract_id=target_id, claim_id=claim.id
            )
            claims.append(
                {
                    **json.loads(claim.model_dump_json()),
                    "review_status": review.decision if review else "unreviewed",
                    "source": json.loads(source.model_dump_json()) if source else None,
                }
            )
        return {"target_contract_id": target_id, "claims": claims}

    @app.post("/research/targets/{target_id}/claims/{claim_id}/review")
    def review_research_claim(
        target_id: str, claim_id: str, body: ClaimReviewBody
    ) -> dict[str, Any]:
        if app.state.evidence_store.get_evidence_claim(claim_id) is None:
            raise HTTPException(404, "evidence claim not found")
        review = make_claim_review(target_contract_id=target_id, claim_id=claim_id, body=body)
        app.state.evidence_store.save_claim_review(review)
        return {"review": json.loads(review.model_dump_json())}

    @app.post("/authoring/targets/{target_id}/candidate-proposals/fixture")
    def create_fixture_candidate_proposal(target_id: str) -> dict[str, Any]:
        target = app.state.evidence_store.get_target_contract(target_id)
        if target is None:
            raise HTTPException(404, "target not found")
        return json.loads(build_neodymium_fixture(target).model_dump_json())

    @app.post("/authoring/distributions/elicit")
    def elicit_distribution(body: ElicitDistributionBody) -> dict[str, Any]:
        return json.loads(elicit_from_median_p90(body).model_dump_json())

    @app.post("/authoring/relationships/validate")
    def validate_relationships(body: RelationshipValidationBody) -> dict[str, Any]:
        return validate_proposed_relationships(body)

    @app.post("/authoring/graphs/{graph_id}/structural-proposals")
    def create_structural_proposal(graph_id: str, body: StructuralProposalBody) -> dict[str, Any]:
        graph = store.get_graph(graph_id)
        if graph is None:
            raise HTTPException(404, "graph not found")
        unknown_evidence_claims = sorted({
            claim_id
            for relationship in body.relationships
            for claim_id in relationship.evidence_claim_ids
            if app.state.evidence_store.get_evidence_claim(claim_id) is None
        })
        if unknown_evidence_claims:
            raise HTTPException(
                422,
                f"structural proposal references unknown evidence claims: {', '.join(unknown_evidence_claims)}",
            )
        try:
            proposal = make_structural_proposal(graph, body)
        except ValidationError as exc:
            raise HTTPException(422, str(exc)) from exc
        app.state.evidence_store.save_structural_graph_proposal(proposal)
        return {"proposal": proposal.response_payload(), "active_graph_mutated": False}

    @app.post("/authoring/graphs/{graph_id}/structural-proposals/{proposal_id}/approve")
    def approve_structural_proposal(
        graph_id: str, proposal_id: str, body: ApproveCandidateBody
    ) -> dict[str, Any]:
        proposal = app.state.evidence_store.get_structural_graph_proposal(proposal_id)
        if proposal is None or proposal.graph_id != graph_id:
            raise HTTPException(404, "structural proposal not found")
        try:
            receipt = make_structural_approval_receipt(
                proposal, approved_by=body.approved_by, binding_hash=body.binding_hash
            )
            graph, _ = store.apply_relationship_additions_atomically(
                graph_id,
                expected_graph_version=proposal.graph_version,
                relationships=proposal.relationships,
                actor=body.approved_by,
                reason=f"approved structural proposal {proposal.id}",
            )
        except ValidationError as exc:
            raise HTTPException(409, str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        return {
            "approval_receipt": json.loads(receipt.model_dump_json()),
            "graph": json.loads(graph.model_dump_json()),
        }

    @app.post("/authoring/graphs/{graph_id}/shadow-simulate")
    def shadow_simulate(graph_id: str, body: ShadowSimulationBody) -> dict[str, Any]:
        graph = store.get_graph(graph_id)
        if graph is None:
            raise HTTPException(404, "graph not found")
        try:
            return run_shadow_simulation(graph, body)
        except ShadowSimulationError as exc:
            raise HTTPException(400, str(exc)) from exc

    @app.post("/authoring/graphs/{graph_id}/candidate-proposals")
    def create_candidate_proposal(graph_id: str, body: CandidateProposalBody) -> dict[str, Any]:
        graph = store.get_graph(graph_id)
        if graph is None:
            raise HTTPException(404, "graph not found")
        try:
            proposal = make_candidate_proposal(
                graph_id=graph_id, graph_version=graph.graph_version, body=body
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        app.state.evidence_store.save_candidate_approval_proposal(proposal)
        return {"proposal": proposal.response_payload()}

    def apply_candidate_approval(graph_id: str, proposal_id: str, body: ApproveCandidateBody) -> tuple[Any, Any]:
        proposal = app.state.evidence_store.get_candidate_approval_proposal(proposal_id)
        if proposal is None or proposal.graph_id != graph_id:
            raise HTTPException(404, "candidate proposal not found")
        try:
            receipt = make_approval_receipt(proposal, body)
            graph, _ = store.apply_parameter_overrides_atomically(
                graph_id,
                expected_graph_version=proposal.graph_version,
                overrides=proposal.candidate_parameter_overrides,
                actor=body.approved_by,
                reason=f"approved candidate proposal {proposal.id}",
            )
        except ValidationError as exc:
            raise HTTPException(409, str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        return receipt, graph

    @app.post("/authoring/graphs/{graph_id}/candidate-proposals/{proposal_id}/approve")
    def approve_candidate_proposal(
        graph_id: str, proposal_id: str, body: ApproveCandidateBody
    ) -> dict[str, Any]:
        receipt, graph = apply_candidate_approval(graph_id, proposal_id, body)
        return {
            "approval_receipt": json.loads(receipt.model_dump_json()),
            "graph": json.loads(graph.model_dump_json()),
        }

    @app.post("/projects/{project_id}/candidate-proposals/{proposal_id}/approve")
    def approve_project_candidate_proposal(
        project_id: str, proposal_id: str, body: ApproveCandidateBody
    ) -> dict[str, Any]:
        project = require_project(project_id)
        if project.graph_id is None:
            raise HTTPException(409, "project has no approved graph")
        proposal = app.state.evidence_store.get_candidate_approval_proposal(proposal_id)
        if proposal is None or proposal.graph_id != project.graph_id:
            raise HTTPException(404, "candidate proposal not found for project graph")
        if project.active_graph_version != proposal.graph_version:
            raise HTTPException(409, "project active graph version does not match candidate proposal")
        receipt, graph = apply_candidate_approval(project.graph_id, proposal_id, body)
        updated = app.state.workspace_store.update_project(
            project_id,
            WorkspaceProjectPatch(stage="decide", active_graph_version=graph.graph_version),
        )
        return {
            "approval_receipt": json.loads(receipt.model_dump_json()),
            "graph": json.loads(graph.model_dump_json()),
            "project": updated.model_dump(mode="json"),
        }

    @app.post("/graphs")
    def create_graph(body: CreateGraphBody) -> dict[str, Any]:
        if body.from_seed:
            if body.seed_kind == "gas":
                g = build_gas_graph(
                    name=body.name or "us-gas-kalshi",
                    ticker=body.ticker,
                    threshold_usd=body.threshold_usd,
                    market_yes_mid=body.market_yes_mid,
                    title=body.title,
                )
            else:
                g = build_seed_graph(name=body.name)
        else:
            from lns_kernel.models import Graph
            import uuid

            g = Graph(id=str(uuid.uuid4()), name=body.name, nodes={}, layout={})
        store.create_graph(g)
        if g.nodes:
            snap = coord.run_now(g.id)
            return {
                "graph": json.loads(g.model_dump_json()),
                "snapshot": json.loads(snap.model_dump_json()),
                "seed_kind": body.seed_kind,
            }
        return {"graph": json.loads(g.model_dump_json()), "snapshot": None, "seed_kind": body.seed_kind}

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

    @app.get("/graphs/{graph_id}/snapshots")
    def list_snapshots(graph_id: str, limit: int = Query(default=20, ge=1, le=100)) -> dict[str, Any]:
        if not store.get_graph(graph_id):
            raise HTTPException(404, "graph not found")
        return {"snapshots": [json.loads(snapshot.model_dump_json()) for snapshot in store.list_snapshots(graph_id, limit=limit)]}

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

    @app.post("/graphs/{graph_id}/analysis/local-sensitivity")
    def local_sensitivity(graph_id: str, body: LocalSensitivityBody) -> dict[str, Any]:
        graph = store.get_graph(graph_id)
        if graph is None:
            raise HTTPException(404, "graph not found")
        try:
            return run_local_sensitivity(
                graph,
                target_node_id=body.target_node_id,
                perturbation_fraction=body.perturbation_fraction,
                seed=body.seed,
                n_samples=body.n_samples,
            )
        except ShadowSimulationError as exc:
            raise HTTPException(422, str(exc)) from exc

    @app.post("/analysis/weighted-ensemble")
    def weighted_ensemble(body: WeightedEnsembleBody) -> dict[str, Any]:
        member_samples: dict[str, Any] = {}
        member_receipts: list[dict[str, Any]] = []
        weights: dict[str, float] = {}
        for index, member in enumerate(body.members):
            graph = store.get_graph(member.graph_id)
            if graph is None:
                raise HTTPException(404, f"ensemble member graph not found: {member.graph_id}")
            if graph.graph_version != member.graph_version:
                raise HTTPException(409, f"ensemble member graph version is stale: {member.graph_id}")
            predictives, _, samples = run_ensemble(graph.nodes, seed=body.seed + index, n_samples=body.n_samples)
            predictive = predictives.get(member.target_node_id)
            outcome_samples = samples.get(member.target_node_id)
            if predictive is None or outcome_samples is None:
                raise HTTPException(422, f"ensemble member target is not active: {member.graph_id}:{member.target_node_id}")
            member_id = f"{member.graph_id}@{member.graph_version}:{member.target_node_id}"
            member_samples[member_id] = outcome_samples
            weights[member_id] = member.weight
            member_receipts.append({
                "member_id": member_id,
                "graph_id": member.graph_id,
                "graph_version": member.graph_version,
                "target_node_id": member.target_node_id,
                "weight": member.weight,
                "summary": json.loads(predictive.model_dump_json()),
            })
        try:
            mixture, normalized_weights = weighted_outcome_mixture(member_samples, weights, seed=body.seed)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        for receipt in member_receipts:
            receipt["normalized_weight"] = normalized_weights[receipt["member_id"]]
        return {
            "mixture": json.loads(mixture.model_dump_json()),
            "members": member_receipts,
            "seed": body.seed,
            "n_samples": body.n_samples,
            "active_graph_mutated": False,
            "limitations": [
                "This is a weighted distribution mixture, not an arithmetic average of member means.",
                "Weights express an explicit operator-selected mixture assumption; no member is recommended as more accurate.",
                "This comparison does not approve, activate, or persist an ensemble configuration.",
            ],
        }

    @app.post("/graphs/{graph_id}/nodes/{node_id}/wire")
    def wire_node(graph_id: str, node_id: str, body: WireBody) -> dict[str, Any]:
        """Wire this node (parent) into child_id's depends_on, then re-sim."""
        try:
            g2, ev = store.wire_parent(
                graph_id,
                parent_id=node_id,
                child_id=body.child_id,
                weight=body.weight,
                actor="human",
                reason=f"wire {node_id} -> {body.child_id}",
            )
        except ValidationError as e:
            raise HTTPException(400, str(e)) from e
        snap = coord.run_now(graph_id) if body.run_sim else store.get_latest_snapshot(graph_id)
        return {
            "graph": json.loads(g2.model_dump_json()),
            "event": json.loads(ev.model_dump_json()),
            "snapshot": json.loads(snap.model_dump_json()) if snap else None,
            "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
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

    # --- Kalshi / gas use-case ---

    @app.get("/kalshi/markets/{ticker}")
    def kalshi_market(ticker: str) -> dict[str, Any]:
        try:
            q = kalshi.get_market(ticker)
        except KalshiError as e:
            raise HTTPException(400, str(e)) from e
        return q.as_public_dict()

    @app.post("/use-cases/gas/graph")
    def create_gas_graph(body: GasGraphBody) -> dict[str, Any]:
        mid = body.market_yes_mid
        title = body.title
        if body.ticker and mid is None:
            try:
                q = kalshi.get_market(body.ticker)
                mid = q.yes_mid
                title = q.title or title
                if q.floor_strike is not None:
                    threshold = q.floor_strike
                else:
                    threshold = body.threshold_usd
            except KalshiError as e:
                raise HTTPException(400, str(e)) from e
        else:
            threshold = body.threshold_usd
        g = build_gas_graph(
            name=body.name,
            ticker=body.ticker,
            threshold_usd=threshold,
            market_yes_mid=mid,
            title=title,
        )
        store.create_graph(g)
        snap = coord.run_now(g.id) if body.run_sim else None
        return {
            "graph": json.loads(g.model_dump_json()),
            "snapshot": json.loads(snap.model_dump_json()) if snap else None,
            "kalshi": {"ticker": body.ticker, "yes_mid": mid, "threshold_usd": threshold},
            "exit_rule": {
                "move_pct": settings.kalshi_exit_move_pct,
                "description": "SELL when abs(yes_mid_now - entry_mid)/entry_mid >= move_pct",
            },
        }

    @app.post("/graphs/{graph_id}/kalshi/refresh-mid")
    def refresh_market_mid(graph_id: str, ticker: str = Query(...)) -> dict[str, Any]:
        g = store.get_graph(graph_id)
        if not g:
            raise HTTPException(404, "graph not found")
        try:
            q = kalshi.get_market(ticker)
        except KalshiError as e:
            raise HTTPException(400, str(e)) from e
        if q.yes_mid is None:
            raise HTTPException(400, f"No mid available for {ticker}")
        if "market_implied_yes" not in g.nodes:
            raise HTTPException(400, "graph has no market_implied_yes node — use gas seed")
        g2, ev = store.patch_node_parameters(
            graph_id,
            "market_implied_yes",
            {"value": float(q.yes_mid)},
            actor="kalshi",
            reason=f"refresh mid ticker={ticker}",
        )
        snap = coord.run_now(graph_id)
        return {
            "quote": q.as_public_dict(),
            "graph": json.loads(g2.model_dump_json()),
            "event": json.loads(ev.model_dump_json()),
            "snapshot": json.loads(snap.model_dump_json()),
            "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
        }

    @app.get("/journal/positions")
    def journal_list(status: str | None = "open") -> dict[str, Any]:
        return {"positions": journal.list_positions(status=status)}

    @app.post("/journal/positions")
    def journal_open(body: JournalOpenBody) -> dict[str, Any]:
        mid = body.entry_yes_mid
        quote = None
        if mid is None:
            try:
                q = kalshi.get_market(body.ticker)
                quote = q.as_public_dict()
                mid = q.yes_mid
            except KalshiError as e:
                raise HTTPException(400, str(e)) from e
        if mid is None:
            raise HTTPException(400, "could not determine entry_yes_mid")
        move = body.move_pct if body.move_pct is not None else settings.kalshi_exit_move_pct
        try:
            pos = journal.open_position(
                ticker=body.ticker,
                side=body.side,
                contracts=body.contracts,
                entry_yes_mid=float(mid),
                move_pct=float(move),
                graph_id=body.graph_id,
                notes=body.notes,
                meta={"quote_at_entry": quote},
            )
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        return {
            "position": pos,
            "exit_rule": {
                "move_pct": move,
                "description": "SELL when abs(yes_mid_now - entry_mid)/entry_mid >= move_pct",
            },
            "note": "Journal entry only — does not place a Kalshi order. Use MCP to place, then journal.",
        }

    @app.post("/journal/positions/{position_id}/check-exit")
    def journal_check_exit(position_id: str) -> dict[str, Any]:
        pos = journal.get(position_id)
        if not pos:
            raise HTTPException(404, "position not found")
        try:
            q = kalshi.get_market(pos["ticker"])
        except KalshiError as e:
            raise HTTPException(400, str(e)) from e
        if q.yes_mid is None:
            raise HTTPException(400, "no mid")
        ev = journal.evaluate_exit(pos, q.yes_mid)
        return {"evaluation": ev, "quote": q.as_public_dict()}

    @app.post("/journal/positions/check-all-exits")
    def journal_check_all() -> dict[str, Any]:
        open_pos = journal.list_positions(status="open")
        results = []
        for pos in open_pos:
            try:
                q = kalshi.get_market(pos["ticker"])
                mid = q.yes_mid
                if mid is None:
                    results.append({"position_id": pos["id"], "error": "no mid"})
                    continue
                ev = journal.evaluate_exit(pos, mid)
                results.append({"evaluation": ev, "quote": q.as_public_dict()})
            except KalshiError as e:
                results.append({"position_id": pos["id"], "error": str(e)})
        sells = [r for r in results if r.get("evaluation", {}).get("should_sell")]
        return {
            "checked": len(results),
            "should_sell_count": len(sells),
            "results": results,
            "action": "If should_sell, close via journal and place sell on Kalshi (MCP) with confirm.",
        }

    @app.post("/journal/positions/{position_id}/close")
    def journal_close(position_id: str, body: JournalCloseBody) -> dict[str, Any]:
        pos = journal.get(position_id)
        if not pos:
            raise HTTPException(404, "position not found")
        mid = body.exit_yes_mid
        if mid is None:
            try:
                q = kalshi.get_market(pos["ticker"])
                mid = q.yes_mid
            except KalshiError as e:
                raise HTTPException(400, str(e)) from e
        if mid is None:
            raise HTTPException(400, "no exit mid")
        try:
            closed = journal.close_position(
                position_id, exit_yes_mid=float(mid), exit_reason=body.exit_reason
            )
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        # rough mark-to-mid PnL in dollars: YES long ≈ contracts * (exit - entry)
        entry = float(closed["entry_yes_mid"])
        contracts = int(closed["contracts"])
        if closed["side"] == "yes":
            pnl_per = float(mid) - entry
        else:
            pnl_per = entry - float(mid)
        return {
            "position": closed,
            "approx_pnl_dollars_if_1_contract_is_1_usd_max": contracts * pnl_per,
            "note": "PnL estimate assumes $1 max per contract; verify against Kalshi fills.",
        }

    @app.post("/scoring/brier")
    def score_brier(p: float = Query(..., ge=0, le=1), y: int = Query(..., ge=0, le=1)) -> dict[str, Any]:
        return {"p": p, "y": y, "brier": brier(p, y)}

    @app.get("/kalshi/balance")
    def kalshi_balance() -> dict[str, Any]:
        try:
            bal = kalshi.get_balance()
        except KalshiError as e:
            raise HTTPException(400, str(e)) from e
        return {"env": kalshi.env_label, "balance": bal}

    @app.post("/kalshi/orders")
    def kalshi_order(body: TradeOrderBody) -> dict[str, Any]:
        """
        Preview (confirm=false) or place (confirm=true) a Kalshi order.
        Stake caps from settings. On buy+journal, opens journal with 20% exit rule.
        On sell+journal matching open ticker, closes journal entries.
        """
        try:
            if not body.confirm:
                preview = kalshi.preview_order(
                    ticker=body.ticker,
                    action=body.action,
                    side=body.side,
                    count=body.contracts,
                    limit_price_cents=body.limit_price_cents,
                )
                return {"executed": False, "preview": preview}
            placed = kalshi.place_order(
                ticker=body.ticker,
                action=body.action,
                side=body.side,
                count=body.contracts,
                limit_price_cents=body.limit_price_cents,
                max_notional_usd=settings.kalshi_max_notional_usd,
                max_contracts=settings.kalshi_max_contracts,
            )
        except KalshiError as e:
            raise HTTPException(400, str(e)) from e

        journal_out = None
        mid = placed["preview"]["quote"].get("yes_mid")
        if body.journal and mid is not None:
            if body.action == "buy":
                try:
                    journal_out = journal.open_position(
                        ticker=body.ticker,
                        side=body.side,
                        contracts=body.contracts,
                        entry_yes_mid=float(mid),
                        move_pct=settings.kalshi_exit_move_pct,
                        graph_id=body.graph_id,
                        notes=body.notes or f"live {body.action} via LNS",
                        meta={"order_response": placed.get("order_response"), "preview": placed.get("preview")},
                    )
                except ValueError as e:
                    raise HTTPException(400, str(e)) from e
            elif body.action == "sell":
                # close open journal rows for ticker
                closed = []
                for pos in journal.list_positions(status="open"):
                    if pos["ticker"] == body.ticker and pos["side"] == body.side:
                        closed.append(
                            journal.close_position(
                                pos["id"],
                                exit_yes_mid=float(mid),
                                exit_reason="kalshi_sell_order",
                            )
                        )
                journal_out = {"closed": closed}

        return {
            "executed": True,
            "env": kalshi.env_label,
            "placed": placed,
            "journal": journal_out,
            "disclaimer": "Real money if PROD. Not investment advice. Micro-stake project account.",
        }

    @app.post("/demo/gas/bootstrap")
    def demo_gas_bootstrap(body: GasBootstrapBody) -> dict[str, Any]:
        """One-shot: gas seed graph + live mid if ticker + optional AI dynamic factors."""
        mid = body.market_yes_mid
        title = body.title
        threshold = body.threshold_usd
        quote = None
        if body.ticker:
            try:
                q = kalshi.get_market(body.ticker)
                quote = q.as_public_dict()
                if mid is None:
                    mid = q.yes_mid
                title = q.title or title
                if q.floor_strike is not None:
                    threshold = float(q.floor_strike)
            except KalshiError as e:
                # allow offline bootstrap with warning
                quote = {"error": str(e), "ticker": body.ticker}

        g = build_gas_graph(
            name="gas-demo",
            ticker=body.ticker,
            threshold_usd=threshold,
            market_yes_mid=mid,
            title=title,
        )
        store.create_graph(g)
        snap = coord.run_now(g.id)

        expand_result = None
        if body.expand_ai:
            g_live = store.get_graph(g.id)
            assert g_live is not None
            try:
                raw_fac, nodes, errors = expand_gas_factors(
                    or_client,
                    graph_nodes=g_live.nodes,
                    ticker=body.ticker,
                    threshold_usd=threshold,
                    market_yes_mid=mid,
                    model=body.model or settings.default_model(),
                    hint=body.hint,
                )
            except OpenRouterError as e:
                raise HTTPException(400, str(e)) from e

            added = []
            layouts = layout_for_new_nodes(g_live.layout, [n.id for n in nodes])
            for n in nodes:
                if body.auto_activate_ai:
                    n = n.model_copy(update={"status": NodeStatus.ACTIVE})
                g2, ev = store.add_node(
                    g.id,
                    n,
                    layout=layouts.get(n.id),
                    actor="openrouter-gas",
                    reason="demo gas AI expand",
                )
                added.append({"node": json.loads(n.model_dump_json()), "event_id": ev.id})
                # auto-wire active nodes into model_price_index
                if n.status == NodeStatus.ACTIVE and "model_price_index" in g2.nodes:
                    try:
                        store.wire_parent(
                            g.id,
                            n.id,
                            "model_price_index",
                            weight=1.0,
                            actor="openrouter-gas",
                            reason="auto-wire AI factor",
                        )
                    except ValidationError:
                        pass
            snap = coord.run_now(g.id)
            expand_result = {
                "raw_factors": raw_fac,
                "added": added,
                "errors": errors,
            }

        g_final = store.get_graph(g.id)
        return {
            "graph": json.loads(g_final.model_dump_json()) if g_final else None,
            "snapshot": json.loads(snap.model_dump_json()),
            "quote": quote,
            "threshold_usd": threshold,
            "market_yes_mid": mid,
            "expand": expand_result,
            "exit_rule": {
                "move_pct": settings.kalshi_exit_move_pct,
                "description": "SELL when abs(yes_mid_now - entry_mid)/entry_mid >= move_pct",
            },
            "demo": "gas",
        }

    @app.post("/demo/gas/{graph_id}/expand")
    def demo_gas_expand(graph_id: str, body: GasExpandBody) -> dict[str, Any]:
        g = store.get_graph(graph_id)
        if not g:
            raise HTTPException(404, "graph not found")
        thr = 4.12
        mid = None
        if "threshold_usd" in g.nodes:
            thr = float(g.nodes["threshold_usd"].parameters.get("value", 4.12))
        if "market_implied_yes" in g.nodes:
            mid = float(g.nodes["market_implied_yes"].parameters.get("value", 0.5))
        ticker = ""
        for n in g.nodes.values():
            if "ticker=" in (n.description or ""):
                # crude extract
                part = n.description.split("ticker=", 1)[-1]
                ticker = part.split()[0].strip(".") if part else ""
                break
        try:
            raw_fac, nodes, errors = expand_gas_factors(
                or_client,
                graph_nodes=g.nodes,
                ticker=ticker,
                threshold_usd=thr,
                market_yes_mid=mid,
                model=body.model or settings.default_model(),
                hint=body.hint,
            )
        except OpenRouterError as e:
            raise HTTPException(400, str(e)) from e

        layouts = layout_for_new_nodes(g.layout, [n.id for n in nodes])
        added = []
        for n in nodes:
            if body.auto_activate:
                n = n.model_copy(update={"status": NodeStatus.ACTIVE})
            g2, ev = store.add_node(
                graph_id,
                n,
                layout=layouts.get(n.id),
                actor="openrouter-gas",
                reason="demo gas AI expand",
            )
            added.append(json.loads(n.model_dump_json()))
            if body.auto_activate and body.auto_wire and n.status == NodeStatus.ACTIVE:
                if "model_price_index" in g2.nodes:
                    try:
                        store.wire_parent(
                            graph_id,
                            n.id,
                            "model_price_index",
                            weight=1.0,
                            actor="openrouter-gas",
                            reason="auto-wire AI factor",
                        )
                    except ValidationError:
                        pass

        snap = coord.run_now(graph_id)
        g_final = store.get_graph(graph_id)
        return {
            "graph": json.loads(g_final.model_dump_json()) if g_final else None,
            "snapshot": json.loads(snap.model_dump_json()),
            "added_nodes": added,
            "raw_factors": raw_fac,
            "errors": errors,
            "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
        }

    @app.post("/demo/gas/{graph_id}/activate-all-proposed")
    def demo_activate_all(graph_id: str, wire: bool = True) -> dict[str, Any]:
        g = store.get_graph(graph_id)
        if not g:
            raise HTTPException(404, "graph not found")
        activated = []
        for nid, n in list(g.nodes.items()):
            if n.status != NodeStatus.PROPOSED:
                continue
            g2, ev = store.set_node_status(
                graph_id, nid, "active", actor="human", reason="activate all proposed"
            )
            activated.append(nid)
            if wire and "model_price_index" in g2.nodes:
                try:
                    store.wire_parent(
                        graph_id,
                        nid,
                        "model_price_index",
                        weight=1.0,
                        actor="human",
                        reason="wire activated AI factor",
                    )
                except ValidationError:
                    pass
        snap = coord.run_now(graph_id) if activated else store.get_latest_snapshot(graph_id)
        g_final = store.get_graph(graph_id)
        return {
            "activated": activated,
            "graph": json.loads(g_final.model_dump_json()) if g_final else None,
            "snapshot": json.loads(snap.model_dump_json()) if snap else None,
            "sim_status": json.loads(coord.status(graph_id).model_dump_json()),
        }

    @app.post("/kalshi/auto-sell-20pct")
    def kalshi_auto_sell(body: AutoSellBody) -> dict[str, Any]:
        """
        For each open journal position, refresh mid; if 20% move, sell on Kalshi
        (only when confirm=true) and close journal.
        """
        open_pos = journal.list_positions(status="open")
        plan = []
        for pos in open_pos:
            try:
                q = kalshi.get_market(pos["ticker"])
                if q.yes_mid is None:
                    plan.append({"position_id": pos["id"], "error": "no mid"})
                    continue
                ev = journal.evaluate_exit(pos, q.yes_mid)
                item: dict[str, Any] = {
                    "evaluation": ev,
                    "quote": q.as_public_dict(),
                }
                if ev["should_sell"] and body.confirm:
                    placed = kalshi.place_order(
                        ticker=pos["ticker"],
                        action="sell",
                        side=pos["side"],
                        count=int(pos["contracts"]),
                        max_notional_usd=settings.kalshi_max_notional_usd,
                        max_contracts=settings.kalshi_max_contracts,
                    )
                    closed = journal.close_position(
                        pos["id"],
                        exit_yes_mid=float(q.yes_mid),
                        exit_reason="auto_sell_20pct",
                    )
                    item["executed"] = True
                    item["placed"] = placed
                    item["closed"] = closed
                else:
                    item["executed"] = False
                plan.append(item)
            except KalshiError as e:
                plan.append({"position_id": pos["id"], "error": str(e)})
            except ValueError as e:
                plan.append({"position_id": pos["id"], "error": str(e)})

        sells = [
            p
            for p in plan
            if p.get("evaluation", {}).get("should_sell") or p.get("executed")
        ]
        return {
            "confirm": body.confirm,
            "env": kalshi.env_label,
            "open_checked": len(open_pos),
            "should_sell_or_sold": len(sells),
            "results": plan,
            "hint": "Pass confirm=true to actually sell on Kalshi when rule hits.",
        }

    return app


app = create_app()
