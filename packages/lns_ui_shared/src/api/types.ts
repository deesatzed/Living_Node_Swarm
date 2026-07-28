export const VISIBLE_NODE_STATES = [
  "active",
  "proposed",
  "excluded",
  "unsupported",
  "stale",
] as const;

export type VisibleNodeState = (typeof VISIBLE_NODE_STATES)[number];
export type EvidenceClassification =
  | "fixture_unverified"
  | "user_provided"
  | "retrieved"
  | "model_inference"
  | "scenario_assumption"
  | "unknown";

export interface DistributionParameterCatalogEntry {
  id: string;
  label: string;
  description: string;
  lower: number | null;
  lower_open: boolean;
}

export interface DistributionCatalogEntry {
  id: string;
  label: string;
  plain_language: string;
  parameters: DistributionParameterCatalogEntry[];
  support: {
    lower: number | null;
    upper: number | null;
    lower_open: boolean;
    upper_open: boolean;
  };
}

export interface DistributionCatalog {
  families: DistributionCatalogEntry[];
}

export interface CandidateFactor {
  id: string;
  label: string;
  rank: number;
  hop_distance: number;
  state: VisibleNodeState;
  evidence_status: EvidenceClassification;
}

export interface CandidateGraphFixture {
  generation_basis: string;
  active_graph_mutated: boolean;
  limitations: string[];
  graph_proposal: Record<string, unknown>;
  factors: CandidateFactor[];
  relationships: Array<Record<string, unknown>>;
}

export interface TargetContractInput {
  id: string;
  question: string;
  target_node_id: string;
  forecast_origin: string;
  resolution_at: string;
  product: string;
  grade: string;
  purity?: string;
  price_basis: string;
  geography: string;
  currency: string;
  unit: string;
  oracle_url: string;
  observation_rule: string;
  missing_source_fallback: string;
  revision_policy: string;
}

export type JsonObject = Record<string, unknown>;
export interface WorkspaceProjectInput { id: string; name: string; stage: string; evidence_classification: "fixture_unverified" | "local_verified" | "live_provider_verified"; }

export interface ClaimReviewInput {
  decision: "include" | "exclude";
  rationale?: string;
}

export interface ElicitDistributionInput {
  id: string;
  family_id: "Normal" | "LogNormal";
  median: number;
  p90: number;
  evidence_claim_ids?: string[];
  as_of: string;
  confidence_rationale: string;
}

export interface ShadowSimulationInput {
  target_node_id: string;
  candidate_parameter_overrides: Record<string, Record<string, number>>;
  seed?: number;
  n_samples?: number;
}

export interface CandidateProposalInput {
  candidate_parameter_overrides: Record<string, Record<string, number>>;
}

export interface CandidateApprovalInput {
  approved_by: string;
  binding_hash: string;
}
