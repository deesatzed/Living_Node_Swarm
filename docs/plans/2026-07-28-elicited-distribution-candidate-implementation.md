# Elicited distribution candidate implementation

## Scope

Connect the existing Normal/LogNormal median–P90 elicitation service to the
Edit/Quantify workspace without converting a provenance-bearing distribution
assumption into an untracked numeric override.

## Contract

1. A candidate revision may store `candidate_distribution_specs` keyed by an
   existing active node ID.
2. Each stored spec must match the active node family, validate through the
   kernel distribution registry, cite only known evidence claims, and exactly
   match the candidate numeric override after documented legacy-name
   normalization.
3. The UI supports only the existing service's Normal/LogNormal median/P90
   path, stages the full returned `DistributionSpec`, and derives the matching
   persisted node parameter names for the in-memory shadow comparison.
4. A candidate carrying a distribution spec cannot enter the legacy numeric
   approval flow, because that flow binds only numeric overrides and cannot
   preserve or approve elicitation provenance.

## Verification

- focused server persistence/restart/no-active-mutation test;
- focused component test for elicitation, staging, comparison mapping,
  durable save, and withheld numeric approval;
- full server and shared UI suites plus shared type build.

## Completion receipt

- `uv run pytest packages/lns_server/tests -q`: 79 passed.
- `npm run test -- --run` in `packages/lns_ui_shared`: 30 files, 105 tests
  passed.
- `npm run build` in `packages/lns_ui_shared`: passed.

## Explicit limits

This is not all-eight-family intuitive editing, curve fitting, live evidence
capture, or an activation workflow for distribution specifications. It is a
non-active Normal/LogNormal candidate-review path only.
