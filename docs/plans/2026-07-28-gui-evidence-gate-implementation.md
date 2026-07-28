# GUI Evidence Gate Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make GUI verification fail closed when canonical visual evidence, automated accessibility results, fixture labels, or requirement-to-evidence mappings are missing.

**Architecture:** Add an axe-backed Playwright smoke assertion to the canonical journey, then commit small JSON/Markdown evidence artifacts that identify the test scope and its fixture-only limitations. `scripts/verify_gui.sh` validates these artifacts and their required fields without invoking live providers or treating files alone as fresh execution.

**Tech Stack:** Bash, Node JSON parsing, Playwright, `@axe-core/playwright`.

---

## Task 1: Install and prove automated accessibility gate

**Files:**

- Modify: `packages/lns_ui/package.json`
- Modify: `packages/lns_ui/package-lock.json`
- Modify: `packages/lns_ui/e2e/canonical-build.spec.ts`

**Step 1: Add a failing canonical axe assertion**

After a deterministic project-home journey loads, assert axe reports no serious or critical violations. Run the focused E2E test and confirm failure occurs until the dependency is installed.

**Step 2: Add `@axe-core/playwright` as a dev dependency**

Install only in `packages/lns_ui`; do not add browser-side accessibility logic or transmit data.

**Step 3: Run focused and full canonical E2E**

Capture exact check scope in the receipt; any pre-existing lower-severity findings remain visible rather than filtered into success.

## Task 2: Write fail-closed verifier before artifacts

**Files:**

- Create: `scripts/verify_gui.sh`
- Create: `scripts/verify_gui.test.sh`

**Step 1: Write a shell test that expects the missing verifier/artifact state to fail**

The test should call the future verifier against a temporary synthetic root with one required file absent, expecting nonzero exit and a named missing artifact.

**Step 2: Implement minimal verifier**

Require all four screenshot paths, E2E receipt, accessibility receipt, and `FINAL_GUI_REPORT.md`; parse machine-readable required fields with Node; require fixture labels and a report mapping all 25 `GOAL_GUI.md` proof IDs.

**Step 3: Run the shell test to green**

## Task 3: Add truthful receipts and proof map

**Files:**

- Create: `docs/verification/gui/e2e-receipt.json`
- Create: `docs/verification/gui/accessibility-receipt.json`
- Create: `docs/verification/gui/FINAL_GUI_REPORT.md`

**Step 1: Add committed receipts**

Name the exact command/test scope, result, fixture-only classification, date, and limitations. Do not claim live-provider, research, or accessibility coverage beyond what ran.

**Step 2: Add report mapping every GUI proof item**

Map implemented items to direct evidence and mark all remaining items limited/deferred. The report must be explicit that it is not a completion declaration.

**Step 3: Run `./scripts/verify_gui.sh`**

## Task 4: Full verification and truth files

**Files:**

- Modify: `DECISIONS.md`
- Modify: `PROGRESS.md`
- Modify: `TASK_QUEUE.md`

Run all required package checks, the verifier, and `git diff --check`. Restore generated screenshots/test-result files, update truthful status, then commit.

## Completion receipt

- Completed on 2026-07-28: axe-backed Project Home fixture scan, committed fixture receipts, P01–P25 report map, and fail-closed `scripts/verify_gui.sh`.
- Verified: 78 kernel tests, 78 server tests, 103 shared UI tests, 8 canonical Playwright tests, UI/gas builds, verifier negative/positive checks, and `git diff --check`.
- Scope retained: the report and verifier distinguish evidence presence from live-provider proof, complete accessibility conformance, or overall GUI-goal completion.
