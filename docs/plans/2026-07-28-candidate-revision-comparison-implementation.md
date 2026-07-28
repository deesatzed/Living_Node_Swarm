# Candidate Revision Comparison Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let an operator compare two durable candidate revisions against their shared active graph version without activating, simulating, or overwriting either revision.

**Architecture:** Add a small pure TypeScript comparator that consumes already-persisted candidate revision payloads and returns labeled additions, removals, and changed values for parameters, node states, relationship states, relationship contracts, and proposed nodes. `ShadowComparison` supplies two revision selectors and renders the result as a read-only receipt; different-base revisions remain visible but cannot be compared as if they shared an active graph.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Playwright.

---

## Alternatives considered

1. **Compare browser staging to a saved revision.** Fast, but staging is transient and would blur durable state with local exploration.
2. **Create a server-side comparison endpoint.** Appropriate only if comparison requires authoritative calculations; these payloads are already locally available and the comparison must not imply a scientific simulation.
3. **Compare two durable revisions in shared UI (chosen).** Gives an inspectable, reproducible structural delta while retaining the existing server persistence boundary.

## Task 1: Pure comparator and red test

**Files:**

- Create: `packages/lns_ui_shared/src/refinement/revisionComparison.ts`
- Create: `packages/lns_ui_shared/src/refinement/revisionComparison.test.ts`

**Step 1: Write failing tests**

Cover two same-base revisions with parameter changes, node/relationship-state changes, contracts, and proposed nodes. Assert that unchanged fields are omitted and that values are classified as added, removed, or changed.

**Step 2: Run test to verify it fails**

Run: `cd packages/lns_ui_shared && npm test -- --run src/refinement/revisionComparison.test.ts`

Expected: FAIL because the comparator module does not exist.

**Step 3: Implement minimal pure comparator**

Return typed string receipts only; do not call server APIs, perform shadow simulation, or mutate either input.

**Step 4: Run test to verify it passes**

Run the focused test and `npm run build`.

## Task 2: Read-only Edit receipt and red component test

**Files:**

- Modify: `packages/lns_ui_shared/src/simulation/ShadowComparison.tsx`
- Modify: `packages/lns_ui_shared/src/simulation/ShadowComparison.test.tsx`

**Step 1: Write failing component test**

Load two persisted same-base revisions, select them, compare, and assert the rendered receipt names differences and confirms the active graph remains unchanged. Test that differing base versions produce an actionable non-comparison message.

**Step 2: Run test to verify it fails**

Run: `cd packages/lns_ui_shared && npm test -- --run src/simulation/ShadowComparison.test.tsx`

**Step 3: Implement minimal UI state**

Use only `listCandidateRevisions` data. Require distinct selected revisions with matching `base_graph_version`; show no “improvement” claim and no approval/simulation control.

**Step 4: Run focused tests and shared build**

## Task 3: Canonical browser proof and truth update

**Files:**

- Modify: `packages/lns_ui/e2e/canonical-build.spec.ts`
- Modify: `DECISIONS.md`
- Modify: `PROGRESS.md`
- Modify: `TASK_QUEUE.md`

**Step 1: Add a Playwright red proof**

Fixture two same-version durable revisions, compare them from Edit, and assert a non-mutating receipt. The route must return fixture-labeled data only.

**Step 2: Run the focused E2E test, then canonical suite**

**Step 3: Record scope and limits**

State that this is a payload-delta comparison, not a structural simulation, scoring result, or active graph mutation.

**Step 4: Run regressions and commit**

Run `uv run pytest` in kernel/server, all shared UI tests/build, canonical E2E, gas build, and `git diff --check`; restore generated artifacts before committing.

## Completion receipt

- Completed on 2026-07-28 as a payload-delta comparison of two durable same-base revisions.
- Verified: 78 kernel tests, 78 server tests, 103 shared UI tests, canonical/UI/gas production builds, and 7 Playwright tests.
- Boundary retained: no shadow simulation, scientific score, evidence-history inference, or activation occurs during revision comparison.
