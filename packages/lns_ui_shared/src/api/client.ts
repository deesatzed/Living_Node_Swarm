import {
  VISIBLE_NODE_STATES,
  type CandidateApprovalInput,
  type CandidateProposalInput,
  type CandidateGraphFixture,
  type ClaimReviewInput,
  type DistributionCatalog,
  type DistributionStatisticsResult,
  type DeriveDistributionInput,
  type ElicitDistributionInput,
  type JsonObject,
  type MonitoringConfigInput,
  type ShadowSimulationInput,
  type StructuralShadowSimulationInput,
  type StructuralProposalInput,
  type TargetContractInput,
  type WorkspaceProjectInput,
  type WorkspaceCandidateRevisionInput,
  type WorkspaceDraftInput,
  type WorkspaceScenarioInput,
  type WorkspaceEnsembleInput,
  type WeightedEnsembleMemberInput,
  type VisibleNodeState,
} from "./types";

export const CANONICAL_DISTRIBUTION_FAMILY_IDS = [
  "Normal",
  "LogNormal",
  "Beta",
  "Poisson",
  "NegativeBinomial",
  "Gamma",
  "StudentT",
  "Deterministic",
] as const;

export type CanonicalDistributionFamilyId =
  (typeof CANONICAL_DISTRIBUTION_FAMILY_IDS)[number];

export class WorkspaceApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "WorkspaceApiError";
  }
}

export class UnknownWorkspaceStateError extends Error {
  constructor(readonly value: string) {
    super(`Unknown visible workspace state: ${value}`);
    this.name = "UnknownWorkspaceStateError";
  }
}

export interface WorkspaceClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface WorkspaceClient {
  createTarget(target: Partial<TargetContractInput>): Promise<JsonObject>;
  getTarget(targetId: string): Promise<JsonObject>;
  getDistributionCatalog(): Promise<DistributionCatalog>;
  getDistributionStatistics(familyId: string, parameters: Record<string, number>): Promise<DistributionStatisticsResult>;
  getResearchReview(targetId: string): Promise<JsonObject>;
  reviewResearchClaim(targetId: string, claimId: string, body: ClaimReviewInput): Promise<JsonObject>;
  createFixtureCandidateProposal(targetId: string): Promise<CandidateGraphFixture>;
  materializeFixtureCandidateProposal(targetId: string): Promise<JsonObject>;
  elicitDistribution(body: ElicitDistributionInput): Promise<JsonObject>;
  deriveDistribution(body: DeriveDistributionInput): Promise<JsonObject>;
  validateRelationships(body: JsonObject): Promise<JsonObject>;
  shadowSimulate(graphId: string, body: ShadowSimulationInput): Promise<JsonObject>;
  shadowStructuralProposal(graphId: string, proposalId: string, body: StructuralShadowSimulationInput): Promise<JsonObject>;
  createCandidateProposal(graphId: string, body: CandidateProposalInput): Promise<JsonObject>;
  createStructuralProposal(graphId: string, body: StructuralProposalInput): Promise<JsonObject>;
  approveCandidateProposal(
    graphId: string,
    proposalId: string,
    body: CandidateApprovalInput,
  ): Promise<JsonObject>;
  approveProjectCandidateProposal(
    projectId: string,
    proposalId: string,
    body: CandidateApprovalInput,
  ): Promise<JsonObject>;
  approveProjectStructuralProposal(
    projectId: string,
    proposalId: string,
    body: CandidateApprovalInput,
  ): Promise<JsonObject>;
  approveStructuralProposal(
    graphId: string,
    proposalId: string,
    body: CandidateApprovalInput,
  ): Promise<JsonObject>;
  getGraph(graphId: string): Promise<JsonObject>;
  runSimulation(graphId: string): Promise<JsonObject>;
  runLocalSensitivity(graphId: string, body: { target_node_id: string; perturbation_fraction: number }): Promise<JsonObject>;
  runWeightedEnsemble(members: WeightedEnsembleMemberInput[]): Promise<JsonObject>;
  getSimulationStatus(graphId: string): Promise<JsonObject>;
  getSnapshot(graphId: string): Promise<JsonObject>;
  listSnapshots(graphId: string, limit?: number): Promise<{ snapshots: JsonObject[] }>;
  listGraphEvents(graphId: string): Promise<JsonObject>;
  listProjects(): Promise<{ projects: JsonObject[] }>;
  createProject(project: WorkspaceProjectInput): Promise<JsonObject>;
  createDraft(projectId: string, draft: WorkspaceDraftInput): Promise<JsonObject>;
  listDrafts(projectId: string): Promise<{ drafts: JsonObject[] }>;
  createCandidateRevision(projectId: string, revision: WorkspaceCandidateRevisionInput): Promise<JsonObject>;
  listCandidateRevisions(projectId: string): Promise<{ candidate_revisions: JsonObject[] }>;
  createScenario(projectId: string, scenario: WorkspaceScenarioInput): Promise<JsonObject>;
  listScenarios(projectId: string): Promise<{ scenarios: JsonObject[] }>;
  simulateScenario(projectId: string, scenarioId: string): Promise<JsonObject>;
  createEnsemble(projectId: string, ensemble: WorkspaceEnsembleInput): Promise<JsonObject>;
  listEnsembles(projectId: string): Promise<{ ensembles: JsonObject[] }>;
  approveEnsemble(projectId: string, ensembleId: string, body: { approved_by: string; binding_hash: string }): Promise<JsonObject>;
  listEnsembleApprovals(projectId: string): Promise<{ approval_receipts: JsonObject[] }>;
  getProject(projectId: string): Promise<JsonObject>;
  patchProject(projectId: string, patch: JsonObject): Promise<JsonObject>;
  getMonitoring(projectId: string): Promise<JsonObject>;
  saveMonitoring(projectId: string, config: MonitoringConfigInput): Promise<JsonObject>;
  acknowledgeMonitoringEvent(projectId: string, eventId: string): Promise<JsonObject>;
}

function parseVisibleNodeState(value: unknown): VisibleNodeState {
  if (typeof value !== "string" || !VISIBLE_NODE_STATES.includes(value as VisibleNodeState)) {
    throw new UnknownWorkspaceStateError(String(value));
  }
  return value as VisibleNodeState;
}

export function parseCandidateGraphFixture(payload: unknown): CandidateGraphFixture {
  if (typeof payload !== "object" || payload === null) {
    throw new TypeError("Candidate graph fixture must contain factors");
  }
  const candidate = payload as { factors?: unknown[] };
  if (!Array.isArray(candidate.factors)) {
    throw new TypeError("Candidate graph fixture must contain factors");
  }
  return {
    ...(payload as Omit<CandidateGraphFixture, "factors">),
    factors: candidate.factors.map((factor: unknown) => {
      if (typeof factor !== "object" || factor === null || !("state" in factor)) {
        throw new TypeError("Candidate factor must contain state");
      }
      return { ...(factor as CandidateGraphFixture["factors"][number]), state: parseVisibleNodeState(factor.state) };
    }),
  };
}

function readDetail(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = payload.detail;
    return typeof detail === "string" ? detail : JSON.stringify(detail);
  }
  return fallback;
}

export function createWorkspaceClient({
  baseUrl = "/api",
  fetch: fetchImplementation = globalThis.fetch,
}: WorkspaceClientOptions = {}): WorkspaceClient {
  if (!fetchImplementation) {
    throw new Error("A fetch implementation is required for the workspace client");
  }

  async function request<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
    const response = await fetchImplementation(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new WorkspaceApiError(response.status, readDetail(payload, response.statusText));
    }
    return payload as TResponse;
  }

  return {
    createTarget: (target: Partial<TargetContractInput>) =>
      request<JsonObject>("/targets", {
        method: "POST",
        body: JSON.stringify(target),
      }),
    getTarget: (targetId) => request<JsonObject>(`/targets/${encodeURIComponent(targetId)}`, { method: "GET" }),
    getDistributionCatalog: () => request<DistributionCatalog>("/catalog/distributions", { method: "GET" }),
    getDistributionStatistics: (familyId, parameters) => request<DistributionStatisticsResult>("/authoring/distributions/statistics", { method: "POST", body: JSON.stringify({ family_id: familyId, parameters }) }),
    getResearchReview: (targetId) =>
      request<JsonObject>(`/research/targets/${encodeURIComponent(targetId)}/review`, { method: "GET" }),
    reviewResearchClaim: (targetId, claimId, body) =>
      request<JsonObject>(
        `/research/targets/${encodeURIComponent(targetId)}/claims/${encodeURIComponent(claimId)}/review`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    createFixtureCandidateProposal: async (targetId) =>
      parseCandidateGraphFixture(
        await request<unknown>(
          `/authoring/targets/${encodeURIComponent(targetId)}/candidate-proposals/fixture`,
          { method: "POST" },
        ),
      ),
    materializeFixtureCandidateProposal: (targetId) =>
      request<JsonObject>(`/authoring/targets/${encodeURIComponent(targetId)}/candidate-proposals/fixture/materialize`, { method: "POST" }),
    elicitDistribution: (body) =>
      request<JsonObject>("/authoring/distributions/elicit", { method: "POST", body: JSON.stringify(body) }),
    deriveDistribution: (body) =>
      request<JsonObject>("/authoring/distributions/derive", { method: "POST", body: JSON.stringify(body) }),
    validateRelationships: (body) =>
      request<JsonObject>("/authoring/relationships/validate", { method: "POST", body: JSON.stringify(body) }),
    shadowSimulate: (graphId, body) =>
      request<JsonObject>(`/authoring/graphs/${encodeURIComponent(graphId)}/shadow-simulate`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    shadowStructuralProposal: (graphId, proposalId, body) =>
      request<JsonObject>(`/authoring/graphs/${encodeURIComponent(graphId)}/structural-proposals/${encodeURIComponent(proposalId)}/shadow-simulate`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    createCandidateProposal: (graphId, body) =>
      request<JsonObject>(`/authoring/graphs/${encodeURIComponent(graphId)}/candidate-proposals`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    createStructuralProposal: (graphId, body) =>
      request<JsonObject>(`/authoring/graphs/${encodeURIComponent(graphId)}/structural-proposals`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    approveCandidateProposal: (graphId, proposalId, body) =>
      request<JsonObject>(
        `/authoring/graphs/${encodeURIComponent(graphId)}/candidate-proposals/${encodeURIComponent(proposalId)}/approve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    approveProjectCandidateProposal: (projectId, proposalId, body) =>
      request<JsonObject>(
        `/projects/${encodeURIComponent(projectId)}/candidate-proposals/${encodeURIComponent(proposalId)}/approve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    approveProjectStructuralProposal: (projectId, proposalId, body) =>
      request<JsonObject>(
        `/projects/${encodeURIComponent(projectId)}/structural-proposals/${encodeURIComponent(proposalId)}/approve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    approveStructuralProposal: (graphId, proposalId, body) =>
      request<JsonObject>(
        `/authoring/graphs/${encodeURIComponent(graphId)}/structural-proposals/${encodeURIComponent(proposalId)}/approve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    getGraph: (graphId) => request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}`, { method: "GET" }),
    runSimulation: (graphId) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/sim/run`, { method: "POST" }),
    runLocalSensitivity: (graphId, body) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/analysis/local-sensitivity`, { method: "POST", body: JSON.stringify(body) }),
    runWeightedEnsemble: (members) =>
      request<JsonObject>("/analysis/weighted-ensemble", { method: "POST", body: JSON.stringify({ members }) }),
    getSimulationStatus: (graphId) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/sim/status`, { method: "GET" }),
    getSnapshot: (graphId) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/snapshot`, { method: "GET" }),
    listSnapshots: (graphId, limit = 20) =>
      request<{ snapshots: JsonObject[] }>(`/graphs/${encodeURIComponent(graphId)}/snapshots?limit=${encodeURIComponent(String(limit))}`, { method: "GET" }),
    listGraphEvents: (graphId) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/events`, { method: "GET" }),
    listProjects: () => request<{ projects: JsonObject[] }>("/projects", { method: "GET" }),
    createProject: (project) => request<JsonObject>("/projects", { method: "POST", body: JSON.stringify(project) }),
    createDraft: (projectId, draft) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/drafts`, { method: "POST", body: JSON.stringify(draft) }),
    listDrafts: (projectId) => request<{ drafts: JsonObject[] }>(`/projects/${encodeURIComponent(projectId)}/revisions`, { method: "GET" }),
    createCandidateRevision: (projectId, revision) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/candidate-revisions`, { method: "POST", body: JSON.stringify(revision) }),
    listCandidateRevisions: (projectId) => request<{ candidate_revisions: JsonObject[] }>(`/projects/${encodeURIComponent(projectId)}/candidate-revisions`, { method: "GET" }),
    createScenario: (projectId, scenario) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/scenarios`, { method: "POST", body: JSON.stringify(scenario) }),
    listScenarios: (projectId) => request<{ scenarios: JsonObject[] }>(`/projects/${encodeURIComponent(projectId)}/scenarios`, { method: "GET" }),
    simulateScenario: (projectId, scenarioId) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/scenarios/${encodeURIComponent(scenarioId)}/simulate`, { method: "POST" }),
    createEnsemble: (projectId, ensemble) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/ensembles`, { method: "POST", body: JSON.stringify(ensemble) }),
    listEnsembles: (projectId) => request<{ ensembles: JsonObject[] }>(`/projects/${encodeURIComponent(projectId)}/ensembles`, { method: "GET" }),
    approveEnsemble: (projectId, ensembleId, body) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/ensembles/${encodeURIComponent(ensembleId)}/approve`, { method: "POST", body: JSON.stringify(body) }),
    listEnsembleApprovals: (projectId) => request<{ approval_receipts: JsonObject[] }>(`/projects/${encodeURIComponent(projectId)}/ensemble-approvals`, { method: "GET" }),
    getProject: (projectId) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}`, { method: "GET" }),
    patchProject: (projectId, patch) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}`, { method: "PATCH", body: JSON.stringify(patch) }),
    getMonitoring: (projectId) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/monitoring`, { method: "GET" }),
    saveMonitoring: (projectId, config) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/monitoring`, { method: "PUT", body: JSON.stringify(config) }),
    acknowledgeMonitoringEvent: (projectId, eventId) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}/monitoring/events/${encodeURIComponent(eventId)}/acknowledge`, { method: "POST" }),
  };
}
