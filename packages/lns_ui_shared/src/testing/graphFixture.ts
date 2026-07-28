import type { CandidateFactor, CandidateGraphFixture, VisibleNodeState } from "../api/types";
import { createNeodymiumTargetFixture } from "./neodymiumFixture";

const FACTORS: ReadonlyArray<readonly [string, string, number, VisibleNodeState]> = [
  ["weather_disruption", "Weather disruption", 3, "proposed"],
  ["freight_capacity", "Freight capacity", 2, "proposed"],
  ["refining_throughput", "Rare-earth refining throughput", 1, "active"],
  ["china_export_controls", "Export-control regime", 2, "proposed"],
  ["mining_supply", "Primary mine supply", 1, "active"],
  ["recycling_rate", "Magnet recycling rate", 1, "proposed"],
  ["ev_demand", "Electric-vehicle demand", 1, "proposed"],
  ["wind_turbine_demand", "Wind-turbine demand", 1, "proposed"],
  ["chip_demand", "Semiconductor demand", 2, "proposed"],
  ["substitution_pressure", "Substitution pressure", 1, "excluded"],
  ["magnet_efficiency", "Magnet efficiency", 2, "proposed"],
  ["energy_prices", "Industrial energy prices", 2, "stale"],
  ["fx_usd_cny", "USD/CNY exchange-rate regime", 1, "proposed"],
  ["geopolitical_risk", "Geopolitical disruption risk", 2, "proposed"],
  ["inventory_policy", "Downstream inventory policy", 1, "proposed"],
  ["ore_grade", "Ore grade", 2, "proposed"],
  ["processing_reagents", "Processing reagent availability", 2, "proposed"],
  ["water_availability", "Industrial water availability", 3, "unsupported"],
  ["grid_reliability", "Grid reliability", 2, "proposed"],
  ["labor_capacity", "Skilled labor capacity", 2, "proposed"],
  ["port_congestion", "Port congestion", 2, "proposed"],
  ["sanctions_risk", "Sanctions risk", 2, "proposed"],
  ["magnet_inventory", "Magnet inventory", 2, "proposed"],
  ["defense_procurement", "Defense procurement", 2, "proposed"],
  ["robotics_demand", "Industrial robotics demand", 2, "proposed"],
  ["vehicle_efficiency", "Vehicle efficiency", 2, "proposed"],
  ["alternative_magnets", "Alternative magnet adoption", 2, "proposed"],
  ["scrap_collection", "End-of-life scrap collection", 2, "proposed"],
  ["refining_policy", "Refining policy", 2, "proposed"],
  ["credit_conditions", "Industrial credit conditions", 2, "proposed"],
];

export function createNeodymiumGraphFixture(): CandidateGraphFixture & {
  evidence_classification: "fixture_unverified";
} {
  const target = createNeodymiumTargetFixture();
  const factors: CandidateFactor[] = FACTORS.map(([id, label, hop_distance, state], index) => ({
    id,
    label,
    rank: index + 1,
    hop_distance,
    state,
    evidence_status: "fixture_unverified",
  }));

  return {
    evidence_classification: "fixture_unverified",
    generation_basis: "deterministic_fixture",
    active_graph_mutated: false,
    limitations: [
      "Fixture data demonstrates GUI mechanics and is not live Neodymium research.",
      "Proposed factors remain inactive unless a reviewed version is approved.",
    ],
    graph_proposal: {
      id: "fixture-neodymium-30-factor-proposal",
      target_contract_id: target.id,
      target_node_id: target.target_node_id,
    },
    factors,
    relationships: [
      { parent_node_id: "weather_disruption", child_node_id: "freight_capacity" },
      { parent_node_id: "freight_capacity", child_node_id: "refining_throughput" },
      { parent_node_id: "refining_throughput", child_node_id: target.target_node_id },
    ],
  };
}
