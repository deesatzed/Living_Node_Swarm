# Gate 0 Contract Surface

`lns_kernel.contract_json_schemas()` is the canonical JSON-schema export for the versioned authoring contracts. The FastAPI layer and UI must consume that export or generated artifacts from it; they must not maintain a hand-copied schema.

All contracts are strict and immutable. A `schema_version` is present from version one so persisted data can migrate explicitly rather than silently changing meaning.

## Canonical Neodymium Target Example

```json
{
  "id": "nd-retail-2027",
  "question": "What will the private-investor retail price of neodymium be in one year?",
  "target_node_id": "nd_private_retail_price_usd_per_kg",
  "forecast_origin": "2026-07-27T00:00:00Z",
  "resolution_at": "2027-07-27T00:00:00Z",
  "product": "neodymium",
  "grade": "private-investor retail series",
  "purity": null,
  "price_basis": "retail",
  "geography": "publisher series",
  "currency": "USD",
  "unit": "USD/kg",
  "oracle_url": "https://strategicmetalsinvest.com/neodymium-prices/",
  "observation_rule": "First published value on the resolution date; record the page capture and displayed value.",
  "missing_source_fallback": "unresolved",
  "revision_policy": "Use the first captured value; retain later revisions as separate observations.",
  "schema_version": 1
}
```

This example defines a resolution rule; it does not assert that the source has been fetched, is authoritative, or is suitable for a historical performance claim.

## Compatibility Promise

Existing graph/node JSON continues to load with `schema_version: 1`, no target link, no approval link, and no evidence/relationship/distribution-spec links. Those defaults preserve the legacy simulation semantics. New generalized metadata is opt-in and must be validated before activation.
