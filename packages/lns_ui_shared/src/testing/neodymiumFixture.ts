import type { TargetContractInput } from "../api/types";

export function createNeodymiumTargetFixture(): TargetContractInput {
  return {
    id: "fixture-nd-retail-2027",
    question: "What will the private-investor retail price of neodymium be in one year?",
    target_node_id: "nd_private_retail_price_usd_per_kg",
    forecast_origin: "2026-07-28T00:00:00Z",
    resolution_at: "2027-07-28T00:00:00Z",
    product: "neodymium",
    grade: "private-investor retail series",
    price_basis: "retail",
    geography: "publisher series",
    currency: "USD",
    unit: "USD/kg",
    oracle_url: "https://strategicmetalsinvest.com/neodymium-prices/",
    observation_rule: "first published value on the resolution date",
    missing_source_fallback: "unresolved",
    revision_policy: "use the first captured value",
  };
}
