# Structural Node Retirement Implementation Plan

**Goal:** Retire a non-target active node only through an exact, version-bound structural proposal that removes all incident persisted relationships before changing node status.

**Architecture:** Extend `StructuralGraphProposal` with `retired_node_ids`. Trial validation must require all incident active relationship IDs in `removed_relationship_ids`, then remove those edges with affine coefficient reindexing and mark the isolated node `retired`. Project-scoped approval and structural shadow reuse the same complete delta. Edit creates a retirement proposal only where relationship metadata fully covers the node's incident edges.

## Task 1: Contract and trial validation

- Modify `packages/lns_server/src/lns_server/structural_proposals.py`.
- Test `packages/lns_server/tests/test_structural_proposal_api.py` first.
- Add `retired_node_ids`, reject duplicate/unknown IDs, target-node retirement, and missing incident removals.
- Verify with `cd packages/lns_server && uv run pytest tests/test_structural_proposal_api.py -q`.

## Task 2: Atomic apply

- Modify `packages/lns_kernel/src/lns_kernel/store.py` and `packages/lns_server/src/lns_server/app.py`.
- Test that a complete delta retires the node, removes incident metadata/edges, preserves `a0`, reindexes surviving affine coefficients, bumps graph version once, and leaves the active graph untouched until approval.
- Verify focused kernel/server tests, then commit `feat(authoring): atomically retire structural nodes`.

## Task 3: Edit mapping and receipts

- Modify `packages/lns_ui_shared/src/api/types.ts` and `packages/lns_ui_shared/src/simulation/ShadowComparison.tsx`.
- Test `ShadowComparison` first: an excluded metadata-complete node submits removal IDs plus `retired_node_ids`; the receipt names retirement; approval clears staging.
- Legacy/untracked incident edges stay revision-only with an explicit explanation rather than a partial proposal.

## Task 4: End-to-end proof

- Add project lifecycle proof in `packages/lns_server/tests/test_workspace_api.py`.
- Extend `packages/lns_ui/e2e/canonical-build.spec.ts` with stage exclusion → structural shadow → exact approval.
- Run full kernel/server/shared/UI browser regressions, restore generated artifacts, update `DECISIONS.md`, `PROGRESS.md`, and `TASK_QUEUE.md`.

**Limit:** This plan retires nodes; it does not physically delete them. Restoring a node requires a fresh reviewed structural proposal.
