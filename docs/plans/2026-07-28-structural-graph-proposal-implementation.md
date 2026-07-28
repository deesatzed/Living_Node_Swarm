# Structural Graph Proposal Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `test-driven-development` to implement this plan task-by-task.

**Goal:** Permit a complete, validated structural candidate graph to be reviewed, shadow-simulated, and atomically activated only after an exact human approval receipt.

**Architecture:** Persist executable relationship metadata inside the versioned `Graph` aggregate. Keep a structural proposal immutable and separate from numeric candidate approval; build and validate a trial graph before storing the proposal, then apply the exact approved trial in one graph-store transaction.

**Tech Stack:** Python 3.13, Pydantic v2, SQLite, FastAPI, pytest, React, TypeScript, Vitest, Playwright.

---

### Task 1: Persist active relationship metadata

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/models.py`
- Modify: `packages/lns_kernel/src/lns_kernel/store.py`
- Test: `packages/lns_kernel/tests/test_graph_relationship_metadata.py`

1. Write a failing test for an active `RelationshipContract` graph-store round trip plus a legacy graph with no relationship records.
2. Run `cd packages/lns_kernel && PYTHONPATH=src pytest -q tests/test_graph_relationship_metadata.py`; it must fail because `Graph` has no relationship aggregate.
3. Add a default-empty relationship aggregate and SQLite relationship table. Validate active relationship parent/child edges against the child node’s `depends_on`; legacy graphs remain readable.
4. Re-run focused and full kernel tests.
5. Commit `feat(kernel): persist graph relationship metadata`.

### Task 2: Require executable coefficients for structural proposals

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/contracts.py`
- Modify: `packages/lns_kernel/src/lns_kernel/validation.py`
- Test: `packages/lns_kernel/tests/test_authoring_contracts.py`
- Test: `packages/lns_kernel/tests/test_relationship_units.py`

1. Write failing tests that reject missing/non-finite coefficient values for an executable proposed affine relationship and accept a finite, dimensionally valid value.
2. Preserve legacy relationship decoding only through an explicit metadata-only compatibility path; never infer coefficients from importance/ranking.
3. Implement the smallest typed coefficient collection and proposal-only validation rule.
4. Run focused and full kernel tests, then commit `feat(kernel): require executable structural coefficients`.

### Task 3: Persist a validated structural proposal

**Files:**

- Create: `packages/lns_server/src/lns_server/structural_proposals.py`
- Modify: `packages/lns_server/src/lns_server/app.py`
- Modify: `packages/lns_server/src/lns_server/evidence_store.py`
- Test: `packages/lns_server/tests/test_structural_proposal_api.py`

1. Write failing API tests for a complete structural delta that returns an immutable exact-version proposal, validation warnings, changed paths, and binding hash while leaving the active graph unchanged.
2. Add failure cases for stale version, unknown evidence/node, invalid unit, and cycle.
3. Materialize and validate a trial graph from the exact stored base; save only the proposal and report.
4. Run focused/full server tests and commit `feat(authoring): persist validated structural proposals`.

### Task 4: Atomically activate an approved structural proposal

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/store.py`
- Modify: `packages/lns_server/src/lns_server/structural_proposals.py`
- Modify: `packages/lns_server/src/lns_server/app.py`
- Test: `packages/lns_kernel/tests/test_graph_store.py`
- Test: `packages/lns_server/tests/test_structural_proposal_api.py`

1. Write failing tests for exact-hash activation, one version increment, active relationship persistence, restart durability, and no mutation after stale hash/version or validation failure.
2. Implement `GraphStore.apply_structural_proposal_atomically` using `BEGIN IMMEDIATE` for trial validation, node/relationship writes, graph version/freshness, and event append.
3. Update project lifecycle only after graph success, per D-029.
4. Run focused/full kernel and server tests, then commit `feat(authoring): atomically apply structural proposals`.

### Task 5: Bind structural review and approval in Edit

**Files:**

- Modify: `packages/lns_ui_shared/src/api/types.ts`
- Modify: `packages/lns_ui_shared/src/simulation/ShadowComparison.tsx`
- Modify: `packages/lns_ui_shared/src/simulation/ShadowComparison.test.tsx`
- Modify: `packages/lns_ui/src/ExistingProjectWorkspace.tsx`
- Modify: `packages/lns_ui/e2e/canonical-build.spec.ts`

1. Add failing component/browser tests for a distinct structural review/approval receipt, named operator acknowledgment, stale rejection, and active graph version update.
2. Keep numeric-only and structural approval controls separate. Label output movement as structural impact, never accuracy.
3. Run shared tests/build and canonical E2E; commit `feat(edit): review and approve structural proposals`.

### Task 6: Record only verified evidence

**Files:**

- Modify: `PROGRESS.md`
- Modify: `TASK_QUEUE.md`
- Modify: `DECISIONS.md` when migration behavior changes
- Create: `docs/verification/STRUCTURAL_PROPOSAL_MATRIX_2026-07-28.md`

Run the required kernel, server, shared UI, canonical UI/E2E, gas build, and `git diff --check` matrix. Record actual outcomes and remaining Gate 4/5 limits; do not claim structural predictive lift or Neodymium acceptance.
