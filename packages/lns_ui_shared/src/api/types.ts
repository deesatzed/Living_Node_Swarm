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
  | "local_verified"
  | "live_provider_verified"
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

export interface DistributionStatistics {
  mean: number | null;
  median: number | null;
  mode: number | null;
  variance: number | null;
  support_lower: number | null;
  support_upper: number | null;
}

export interface DistributionStatisticsResult {
  family_id: string;
  parameters: Record<string, number>;
  statistics: DistributionStatistics;
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
export interface MonitoringConfigInput { cadence: string; freshness_threshold_days: number; mode: "fixture" | "local" | "live"; }
export interface WorkspaceDraftInput { id: string; base_graph_version: number; }
export interface WorkspaceCandidateRevisionInput { id: string; base_graph_version: number; candidate_parameter_overrides?: Record<string, Record<string, number>>; candidate_node_state_overrides?: Record<string, "active" | "excluded">; candidate_relationship_state_overrides?: Record<string, "active" | "excluded">; candidate_relationship_contracts?: JsonObject[]; candidate_new_nodes?: JsonObject[]; }
export interface WorkspaceScenarioInput { id: string; name: string; assumptions: Record<string, string>; base_graph_version?: number; target_node_id?: string; parameter_overrides?: Record<string, Record<string, number>>; }

export interface ClaimReviewInput {
  decision: "included" | "excluded";
  reviewed_by: string;
  reason?: string;
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

export interface StructuralProposalInput {
  relationships?: JsonObject[];
  removed_relationship_ids?: string[];
}

export interface StructuralShadowSimulationInput {
  target_node_id: string;
  seed?: number;
  n_samples?: number;
}

export interface WeightedEnsembleMemberInput { graph_id: string; graph_version: number; target_node_id: string; weight: number; }
export interface WorkspaceEnsembleInput { id: string; name: string; members: WeightedEnsembleMemberInput[]; combination_method?: "weighted_distribution_mixture"; }
