import {
  VISIBLE_NODE_STATES,
  type CandidateApprovalInput,
  type CandidateProposalInput,
  type CandidateGraphFixture,
  type ClaimReviewInput,
  type DistributionCatalog,
  type ElicitDistributionInput,
  type JsonObject,
  type ShadowSimulationInput,
  type TargetContractInput,
  type WorkspaceProjectInput,
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
  getResearchReview(targetId: string): Promise<JsonObject>;
  reviewResearchClaim(targetId: string, claimId: string, body: ClaimReviewInput): Promise<JsonObject>;
  createFixtureCandidateProposal(targetId: string): Promise<CandidateGraphFixture>;
  elicitDistribution(body: ElicitDistributionInput): Promise<JsonObject>;
  validateRelationships(body: JsonObject): Promise<JsonObject>;
  shadowSimulate(graphId: string, body: ShadowSimulationInput): Promise<JsonObject>;
  createCandidateProposal(graphId: string, body: CandidateProposalInput): Promise<JsonObject>;
  approveCandidateProposal(
    graphId: string,
    proposalId: string,
    body: CandidateApprovalInput,
  ): Promise<JsonObject>;
  getGraph(graphId: string): Promise<JsonObject>;
  runSimulation(graphId: string): Promise<JsonObject>;
  getSimulationStatus(graphId: string): Promise<JsonObject>;
  getSnapshot(graphId: string): Promise<JsonObject>;
  listGraphEvents(graphId: string): Promise<JsonObject>;
  listProjects(): Promise<{ projects: JsonObject[] }>;
  createProject(project: WorkspaceProjectInput): Promise<JsonObject>;
  getProject(projectId: string): Promise<JsonObject>;
  patchProject(projectId: string, patch: JsonObject): Promise<JsonObject>;
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
    elicitDistribution: (body) =>
      request<JsonObject>("/authoring/distributions/elicit", { method: "POST", body: JSON.stringify(body) }),
    validateRelationships: (body) =>
      request<JsonObject>("/authoring/relationships/validate", { method: "POST", body: JSON.stringify(body) }),
    shadowSimulate: (graphId, body) =>
      request<JsonObject>(`/authoring/graphs/${encodeURIComponent(graphId)}/shadow-simulate`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    createCandidateProposal: (graphId, body) =>
      request<JsonObject>(`/authoring/graphs/${encodeURIComponent(graphId)}/candidate-proposals`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    approveCandidateProposal: (graphId, proposalId, body) =>
      request<JsonObject>(
        `/authoring/graphs/${encodeURIComponent(graphId)}/candidate-proposals/${encodeURIComponent(proposalId)}/approve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    getGraph: (graphId) => request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}`, { method: "GET" }),
    runSimulation: (graphId) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/sim/run`, { method: "POST" }),
    getSimulationStatus: (graphId) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/sim/status`, { method: "GET" }),
    getSnapshot: (graphId) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/snapshot`, { method: "GET" }),
    listGraphEvents: (graphId) =>
      request<JsonObject>(`/graphs/${encodeURIComponent(graphId)}/events`, { method: "GET" }),
    listProjects: () => request<{ projects: JsonObject[] }>("/projects", { method: "GET" }),
    createProject: (project) => request<JsonObject>("/projects", { method: "POST", body: JSON.stringify(project) }),
    getProject: (projectId) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}`, { method: "GET" }),
    patchProject: (projectId, patch) => request<JsonObject>(`/projects/${encodeURIComponent(projectId)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  };
}
