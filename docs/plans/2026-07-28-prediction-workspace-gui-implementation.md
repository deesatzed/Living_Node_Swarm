# Prediction Workspace GUI Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and verify the transparent hybrid Prediction Workspace defined
by `GOAL_GUI.md`, including New, Run, Edit, and Monitor workflows.

**Architecture:** Create a private `@lns/ui-shared` React package that owns the
typed API client, lifecycle configuration, workspace components, graph,
inspectors, and deterministic fixtures. Keep authoritative contracts,
persistence, approval, and simulation in FastAPI/kernel code; add only the
smallest typed server endpoints needed to persist workspace state. Consume the
shared package from both the canonical and gas apps.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Vitest, Testing Library,
Playwright, SVG/CSS graph rendering, FastAPI, Pydantic, SQLite, Pytest.

---

## Execution Rules

1. Read `GOAL_GUI.md`, all standing truth files, and the dated GUI design before
   editing.
2. Execute tasks in order unless an independent test-only preparation can be
   safely batched.
3. Write a failing test before each behavior.
4. Run the nearest test after every small implementation step.
5. Record verified status in `PROGRESS.md` and `TASK_QUEUE.md`.
6. Record consequential choices in `DECISIONS.md`.
7. Commit each green task locally; do not push or deploy.
8. Use labeled deterministic fixtures for E2E. Do not call live providers.
9. Continue autonomously under `GOAL_GUI.md`; do not pause for routine design
   choices.

### Task 1: Reconfirm Baseline and Create the Shared Test Harness

**Files:**

- Create: `packages/lns_ui_shared/package.json`
- Create: `packages/lns_ui_shared/tsconfig.json`
- Create: `packages/lns_ui_shared/vitest.config.ts`
- Create: `packages/lns_ui_shared/src/test/setup.ts`
- Create: `packages/lns_ui_shared/src/index.ts`
- Create: `packages/lns_ui_shared/src/smoke.test.ts`
- Modify: `packages/lns_ui/package.json`
- Modify: `packages/lns_gas_demo/package.json`
- Modify: both UI lockfiles

**Step 1: Re-run the verified baseline**

Run:

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui && npm run build
cd packages/lns_gas_demo && npm run build
```

Expected: the current kernel/server suites and both builds pass. Record exact
counts; do not assume the counts in `PROGRESS.md`.

**Step 2: Write the shared-package smoke test**

```tsx
import { describe, expect, it } from "vitest";
import { WORKFLOW_STAGES } from "./workflow/stages";

describe("shared package", () => {
  it("exports the approved lifecycle in order", () => {
    expect(WORKFLOW_STAGES.map((stage) => stage.id)).toEqual([
      "idea", "vet", "map", "refine",
      "quantify", "simulate", "decide", "monitor",
    ]);
  });
});
```

**Step 3: Run it and verify failure**

Run:

```bash
cd packages/lns_ui_shared && npm install && npm test -- --run
```

Expected: FAIL because `workflow/stages` does not exist.

**Step 4: Add the minimal package and stage export**

Use package name `@lns/ui-shared`. Configure:

- `test`: `vitest`
- `build`: `tsc -p tsconfig.json`
- React as a peer dependency
- Vitest, jsdom, Testing Library, and user-event as development dependencies

Create the typed stage IDs and export them from `src/index.ts`.

**Step 5: Link both apps**

Add:

```json
"@lns/ui-shared": "file:../lns_ui_shared"
```

Run `npm install` in each consumer to update its lockfile.

**Step 6: Verify and commit**

Run:

```bash
cd packages/lns_ui_shared && npm test -- --run && npm run build
cd packages/lns_ui && npm run build
cd packages/lns_gas_demo && npm run build
git diff --check
```

Expected: all commands pass.

Commit:

```bash
git add packages/lns_ui_shared packages/lns_ui/package.json packages/lns_ui/package-lock.json packages/lns_gas_demo/package.json packages/lns_gas_demo/package-lock.json PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): create shared workspace package"
```

### Task 2: Add Typed API Contracts, Client, and Deterministic Fixtures

**Files:**

- Create: `packages/lns_ui_shared/src/api/types.ts`
- Create: `packages/lns_ui_shared/src/api/client.ts`
- Create: `packages/lns_ui_shared/src/api/client.test.ts`
- Create: `packages/lns_ui_shared/src/testing/neodymiumFixture.ts`
- Create: `packages/lns_ui_shared/src/testing/graphFixture.ts`
- Create: `packages/lns_ui_shared/src/testing/fakeApi.ts`
- Modify: `packages/lns_ui_shared/src/index.ts`
- Modify: `packages/lns_server/src/lns_server/app.py` only if a read-only
  registry/catalog endpoint is missing
- Test: `packages/lns_server/tests/test_distribution_catalog_api.py`

**Step 1: Write the contract/client tests**

Tests must prove:

- all eight canonical family IDs parse in frozen order;
- target/research/candidate/shadow/approval/run payloads parse;
- unknown states produce a typed error rather than disappearing;
- non-2xx responses preserve status and server detail;
- fixture objects carry `fixture_unverified`.

Representative test:

```ts
it("preserves an actionable server error", async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ detail: "price_basis is required" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    }),
  );
  await expect(client.createTarget(invalidTarget)).rejects.toMatchObject({
    status: 422,
    detail: "price_basis is required",
  });
});
```

**Step 2: Verify failure**

Run:

```bash
cd packages/lns_ui_shared && npm test -- --run src/api/client.test.ts
```

Expected: FAIL because client/types do not exist.

**Step 3: Implement the minimal client**

Create one injected-fetch client with methods for the existing target, research,
candidate fixture, elicitation, relationship validation, shadow simulation,
approval, graph, run, status, event, and snapshot routes.

If the authoritative distribution catalog is not exposed, add a read-only
server route backed by `lns_kernel.distributions`; test exact IDs and metadata.
Do not hardcode distribution math in TypeScript.

**Step 4: Add deterministic fixtures**

Create a canonical Neodymium target and a 30-node graph fixture with:

- at least 15 candidates;
- first/second/third-order nodes;
- one `weather → freight → refining → target` path;
- active, proposed, excluded, unsupported, stale statuses;
- explicit fixture labels;
- evidence and dependence warnings.

**Step 5: Verify and commit**

Run:

```bash
cd packages/lns_ui_shared && npm test -- --run src/api/client.test.ts
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
git diff --check
```

Commit:

```bash
git add packages/lns_ui_shared/src packages/lns_server/src packages/lns_server/tests PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): add typed workspace client and fixtures"
```

### Task 3: Persist Project Workflow, Draft, Scenario, and Monitoring State

**Files:**

- Create: `packages/lns_server/src/lns_server/workspace_models.py`
- Create: `packages/lns_server/src/lns_server/workspace_store.py`
- Create: `packages/lns_server/tests/test_workspace_api.py`
- Modify: `packages/lns_server/src/lns_server/app.py`
- Modify: `packages/lns_server/src/lns_server/settings.py`

**Step 1: Write failing API tests**

Cover:

- create/list/get project;
- stage update with allowed stage ID;
- save discovery ledger and target/graph references;
- create draft from exact graph version;
- save named scenario without mutating active graph;
- save monitoring configuration and fixture event;
- restart persistence;
- stale draft base version returns `409`;
- unknown project returns `404`.

Target model:

```python
class WorkspaceProject(BaseModel):
    id: str
    name: str
    target_id: str | None = None
    graph_id: str | None = None
    stage: Literal[
        "idea", "vet", "map", "refine",
        "quantify", "simulate", "decide", "monitor",
    ]
    evidence_classification: Literal[
        "fixture_unverified", "local_verified", "live_provider_verified"
    ]
    active_graph_version: int | None = None
    draft_base_version: int | None = None
    updated_at: datetime
```

**Step 2: Verify failure**

Run:

```bash
cd packages/lns_server
PYTHONPATH=src:../lns_kernel/src pytest -q tests/test_workspace_api.py
```

Expected: FAIL because workspace routes do not exist.

**Step 3: Implement SQLite persistence**

Use a sibling `lns_workspace.db` path in app lifespan. Persist typed JSON and
timestamps in explicit project, revision, scenario, and monitoring tables.
Use transactions for version-sensitive edits.

Add routes:

```text
GET    /projects
POST   /projects
GET    /projects/{project_id}
PATCH  /projects/{project_id}
POST   /projects/{project_id}/drafts
GET    /projects/{project_id}/revisions
POST   /projects/{project_id}/scenarios
GET    /projects/{project_id}/scenarios
PUT    /projects/{project_id}/monitoring
GET    /projects/{project_id}/monitoring
POST   /projects/{project_id}/monitoring/fixture-events
```

These routes persist workflow metadata; graph and scientific state remain in
the existing graph/contracts stores.

**Step 4: Verify mutation invariants**

Tests must compare graph version and active node payloads before and after
project/draft/scenario operations.

**Step 5: Verify and commit**

Run:

```bash
cd packages/lns_server
PYTHONPATH=src:../lns_kernel/src pytest -q tests/test_workspace_api.py
PYTHONPATH=src:../lns_kernel/src pytest -q
git diff --check
```

Commit:

```bash
git add packages/lns_server/src/lns_server packages/lns_server/tests/test_workspace_api.py PROGRESS.md TASK_QUEUE.md DECISIONS.md
git commit -m "feat(server): persist prediction workspace state"
```

### Task 4: Build Project Home and the Configurable Workspace Shell

**Files:**

- Create: `packages/lns_ui_shared/src/projects/ProjectHome.tsx`
- Create: `packages/lns_ui_shared/src/projects/ProjectCard.tsx`
- Create: `packages/lns_ui_shared/src/projects/ProjectHome.test.tsx`
- Create: `packages/lns_ui_shared/src/workflow/stages.ts`
- Create: `packages/lns_ui_shared/src/workflow/guards.ts`
- Create: `packages/lns_ui_shared/src/workflow/guards.test.ts`
- Create: `packages/lns_ui_shared/src/workspace/WorkspaceShell.tsx`
- Create: `packages/lns_ui_shared/src/workspace/WorkspaceHeader.tsx`
- Create: `packages/lns_ui_shared/src/workspace/LifecycleRail.tsx`
- Create: `packages/lns_ui_shared/src/workspace/AnalysisTray.tsx`
- Create: `packages/lns_ui_shared/src/workspace/workspace.css`

**Step 1: Write failing component tests**

Prove:

- New, Run, Edit, Monitor actions exist;
- project cards show all required metadata and fixture label;
- all eight stages render in order;
- stages can be revisited;
- required target gaps block only guarded forward transitions;
- shell retains target/version/freshness/classification at both viewport sizes;
- empty/loading/error states are visible and actionable.

**Step 2: Verify failure**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/projects src/workflow src/workspace
```

**Step 3: Implement the shared shell**

Keep lifecycle definitions in `stages.ts`, including ID, label, purpose,
completion summary, allowed actions, and guard function. Use CSS grid with
collapsible left/right/bottom panels.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/projects src/workflow src/workspace
npm run build
git diff --check
```

Commit:

```bash
git add packages/lns_ui_shared/src/projects packages/lns_ui_shared/src/workflow packages/lns_ui_shared/src/workspace PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): add project home and workflow shell"
```

### Task 5: Implement Idea and Vet

**Files:**

- Create: `packages/lns_ui_shared/src/intake/TargetIntake.tsx`
- Create: `packages/lns_ui_shared/src/intake/TargetSummary.tsx`
- Create: `packages/lns_ui_shared/src/intake/TargetIntake.test.tsx`
- Create: `packages/lns_ui_shared/src/discovery/VettingConversation.tsx`
- Create: `packages/lns_ui_shared/src/discovery/DecisionLedger.tsx`
- Create: `packages/lns_ui_shared/src/discovery/ResearchConsent.tsx`
- Create: `packages/lns_ui_shared/src/discovery/VettingConversation.test.tsx`

**Step 1: Write failing tests**

Test:

- exact Neodymium retail-series distinction appears;
- missing basis/date/unit/fallback/revision fields block target submit;
- server errors map to fields or an error summary;
- Pause, Proceed now, Add source/direction, Exclude, Correct work;
- Proceed skips optional questions only;
- routing preview shows provider/model/data scope before consent;
- facts, user claims, inferences, scenarios, and unknowns have distinct text.

**Step 2: Verify failure**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/intake src/discovery
```

**Step 3: Implement accessible forms and ledger**

Use a real `<form>`, label every control, focus the error summary after invalid
submit, and store structured discovery entries through the project API.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/intake src/discovery
npm run build
git diff --check
```

Commit:

```bash
git add packages/lns_ui_shared/src/intake packages/lns_ui_shared/src/discovery PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): guide target intake and vetting"
```

### Task 6: Build the Target-Centered Hop Graph

**Files:**

- Create: `packages/lns_ui_shared/src/graph/types.ts`
- Create: `packages/lns_ui_shared/src/graph/layout.ts`
- Create: `packages/lns_ui_shared/src/graph/layout.test.ts`
- Create: `packages/lns_ui_shared/src/graph/HopGraph.tsx`
- Create: `packages/lns_ui_shared/src/graph/GraphToolbar.tsx`
- Create: `packages/lns_ui_shared/src/graph/GraphTextView.tsx`
- Create: `packages/lns_ui_shared/src/graph/HopGraph.test.tsx`
- Create: `packages/lns_ui_shared/src/graph/graph.css`
- Modify: `DECISIONS.md`

**Step 1: Write deterministic layout tests**

For the 30-node fixture and both viewport dimensions, assert:

```ts
for (const [left, right] of everyPair(layout.nodes)) {
  expect(rectanglesOverlap(left.bounds, right.bounds)).toBe(false);
}
expect(layout.nodes.find((n) => n.id === targetId)?.hop).toBe(0);
```

Also test stable output for the same input and bounded coordinates.

**Step 2: Write interaction/accessibility tests**

Test zoom, pan, fit, search, state/hop filters, keyboard selection, selected path
highlight, non-color statuses, and equivalent parent/child paths in text view.

**Step 3: Verify failure**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/graph
```

**Step 4: Prototype and choose renderer**

First implement deterministic layout plus semantic SVG/CSS. If it cannot satisfy
the tests after a bounded prototype, compare one mature renderer/layout
dependency. Record the measured choice in `DECISIONS.md`.

**Step 5: Verify and commit**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/graph
npm run build
git diff --check
```

Commit:

```bash
git add packages/lns_ui_shared/src/graph DECISIONS.md PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): render inspectable multi-hop graph"
```

### Task 7: Implement Refine and Revision Deltas

**Files:**

- Create: `packages/lns_ui_shared/src/refinement/RefinementPanel.tsx`
- Create: `packages/lns_ui_shared/src/refinement/RevisionDelta.tsx`
- Create: `packages/lns_ui_shared/src/refinement/reducer.ts`
- Create: `packages/lns_ui_shared/src/refinement/refinement.test.tsx`
- Modify: `packages/lns_server/src/lns_server/workspace_models.py`
- Modify: `packages/lns_server/src/lns_server/workspace_store.py`
- Modify: `packages/lns_server/src/lns_server/app.py`
- Modify: `packages/lns_server/tests/test_workspace_api.py`

**Step 1: Write failing UI and API tests**

Cover include, exclude, add, extend, duplicate merge/split, selected-branch
redo, whole-proposal redo, undo/redo, saved revision, and exact delta.

Prove the active graph payload/version is unchanged throughout refinement.

**Step 2: Verify failure**

Run:

```bash
cd packages/lns_server
PYTHONPATH=src:../lns_kernel/src pytest -q tests/test_workspace_api.py
cd ../lns_ui_shared
npm test -- --run src/refinement
```

**Step 3: Implement revision commands**

Represent edits as typed commands with reversible before/after payloads. Persist
revision snapshots and delta metadata, not only the latest browser state.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q tests/test_workspace_api.py
cd packages/lns_ui_shared && npm test -- --run src/refinement
git diff --check
```

Commit:

```bash
git add packages/lns_server packages/lns_ui_shared/src/refinement PROGRESS.md TASK_QUEUE.md
git commit -m "feat(authoring): persist reversible graph refinement"
```

### Task 8: Build Distribution, Node, Relationship, Evidence, and Warning Inspectors

**Files:**

- Create: `packages/lns_ui_shared/src/inspectors/InspectorRouter.tsx`
- Create: `packages/lns_ui_shared/src/inspectors/NodeInspector.tsx`
- Create: `packages/lns_ui_shared/src/inspectors/RelationshipInspector.tsx`
- Create: `packages/lns_ui_shared/src/inspectors/EvidenceInspector.tsx`
- Create: `packages/lns_ui_shared/src/inspectors/WarningCenter.tsx`
- Create: `packages/lns_ui_shared/src/distributions/DistributionForm.tsx`
- Create: `packages/lns_ui_shared/src/distributions/DistributionCurve.tsx`
- Create: `packages/lns_ui_shared/src/distributions/familyFields.ts`
- Create: `packages/lns_ui_shared/src/inspectors/inspectors.test.tsx`
- Create: `packages/lns_ui_shared/src/distributions/distributions.test.tsx`

**Step 1: Write failing tests**

For each family, test visible support, intuitive inputs, canonical parameters,
curve, mean, median, quantiles, units, as-of, provenance, rationale, and errors.

Test relationship type/sign/lag/transform/units/evidence/state. Test source
conflicts, commercial interest, unknowns, duplicated mechanisms, unresolved
dependence, and unsupported evidence.

Test that “weight more” opens transparent options and never silently changes a
coefficient.

**Step 2: Verify failure**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/inspectors src/distributions
```

**Step 3: Implement from registry metadata**

Generate field labels/help from the server catalog. Send elicitation inputs to
the server and render returned derived values. Keep browser calculations
presentational only.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/inspectors src/distributions
npm run build
git diff --check
```

Commit:

```bash
git add packages/lns_ui_shared/src/inspectors packages/lns_ui_shared/src/distributions PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): expose distributions evidence and warnings"
```

### Task 9: Build Scenario Runs and Model Comparisons

**Files:**

- Create: `packages/lns_ui_shared/src/simulation/ScenarioEditor.tsx`
- Create: `packages/lns_ui_shared/src/simulation/RunProgress.tsx`
- Create: `packages/lns_ui_shared/src/simulation/DistributionComparison.tsx`
- Create: `packages/lns_ui_shared/src/simulation/SensitivityPanel.tsx`
- Create: `packages/lns_ui_shared/src/simulation/RunReceipt.tsx`
- Create: `packages/lns_ui_shared/src/simulation/simulation.test.tsx`
- Modify: `packages/lns_server/src/lns_server/workspace_models.py`
- Modify: `packages/lns_server/src/lns_server/workspace_store.py`
- Modify: `packages/lns_server/tests/test_workspace_api.py`

**Step 1: Write failing tests**

Cover two named scenarios, explicit assumption/weight deltas, shadow runs,
side-by-side quantiles, affected paths, seed/sample/version receipt, progress,
cancel, partial failure, stale result, last-success preservation, stability, and
limitation labels.

**Step 2: Verify failure**

Run focused UI and API tests.

**Step 3: Implement scenario persistence and UI**

Use existing shadow simulation and run/status/stream APIs. Add only missing
scenario receipt fields to workspace persistence. Do not implement forecast
math in React.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui_shared && npm test -- --run src/simulation && npm run build
git diff --check
```

Commit:

```bash
git add packages/lns_server packages/lns_ui_shared/src/simulation PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): compare transparent scenario runs"
```

### Task 10: Implement Decide, Approval, and Ensemble Capability

**Files:**

- Create: `packages/lns_ui_shared/src/decisions/ModelComparison.tsx`
- Create: `packages/lns_ui_shared/src/decisions/DecisionRationale.tsx`
- Create: `packages/lns_ui_shared/src/decisions/ApprovalReview.tsx`
- Create: `packages/lns_ui_shared/src/decisions/EnsembleSummary.tsx`
- Create: `packages/lns_ui_shared/src/decisions/decisions.test.tsx`
- Modify: server workspace models/store/tests for decision rationale and
  selected model references
- Create: `packages/lns_kernel/src/lns_kernel/model_ensemble.py`
- Create: `packages/lns_kernel/tests/test_model_ensemble.py`
- Create: `packages/lns_server/src/lns_server/model_ensemble.py`
- Create: `packages/lns_server/tests/test_model_ensemble_api.py`
- Modify: `packages/lns_server/src/lns_server/app.py`

**Step 1: Write failing tests**

Test model comparison fields, preserved scenarios, rationale, exact binding
hash, approval receipt, and invalidation after edits.

For ensembles, require a typed kernel/server contract with member graph/run
versions, non-negative weights summing to one, an explicit mixture-sampling
combination method, seeded reproducibility, validation status, and limitations.
Invalid weights, missing/stale members, and mixed target contracts must fail
before simulation.

**Step 2: Verify failure**

Run focused UI tests and the existing candidate approval API tests.

**Step 3: Implement decision flow**

Never call output movement “improvement” without scoring evidence. Approval
must show exact target, graph, node, relationship, distribution, and evidence
versions included in the binding receipt.

Implement the smallest authoritative output-mixture contract in the kernel,
persist its definition/receipt server-side, and expose create/get/run endpoints.
The browser only submits member references/weights and renders returned
distributions.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui_shared && npm test -- --run src/decisions
git diff --check
```

Commit:

```bash
git add packages/lns_kernel packages/lns_server packages/lns_ui_shared/src/decisions PROGRESS.md TASK_QUEUE.md DECISIONS.md
git commit -m "feat(ui): review and approve model decisions"
```

### Task 11: Implement Monitoring Configuration and Event Response

**Files:**

- Create: `packages/lns_ui_shared/src/monitoring/MonitoringSetup.tsx`
- Create: `packages/lns_ui_shared/src/monitoring/MonitoringStatus.tsx`
- Create: `packages/lns_ui_shared/src/monitoring/MonitoringHistory.tsx`
- Create: `packages/lns_ui_shared/src/monitoring/monitoring.test.tsx`
- Modify: workspace server models/store/routes/tests

**Step 1: Write failing tests**

Test source cadence, freshness threshold, drift threshold, metric, re-run rule,
alert severity, next due, fixture/live label, acknowledge, inspect, re-run, and
branch-edit actions.

Test that fixture events cannot display as live and that no automatic structural
edit occurs.

**Step 2: Verify failure**

Run focused server and UI tests.

**Step 3: Implement local monitoring surface**

Persist configuration and deterministic fixture event history. Reuse current
snapshot freshness and event APIs where possible. Label unavailable external
polling as limited.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q tests/test_workspace_api.py
cd packages/lns_ui_shared && npm test -- --run src/monitoring
git diff --check
```

Commit:

```bash
git add packages/lns_server packages/lns_ui_shared/src/monitoring PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): configure transparent model monitoring"
```

### Task 12: Implement Existing-Model Run Mode

**Files:**

- Create: `packages/lns_ui_shared/src/modes/RunModel.tsx`
- Create: `packages/lns_ui_shared/src/modes/RunModel.test.tsx`
- Modify: `packages/lns_ui_shared/src/projects/ProjectHome.tsx`
- Modify: shared workspace router

**Step 1: Write failing tests**

Test select model, inspect approval/freshness/warnings, choose unchanged inputs
or named scenario, run, compare prior run, inspect receipt, and preserve graph
version/structure.

**Step 2: Verify failure**

Run:

```bash
cd packages/lns_ui_shared
npm test -- --run src/modes/RunModel.test.tsx
```

**Step 3: Implement mode guard**

Disable structural edit controls in Run mode and provide an explicit “Branch to
edit” action.

**Step 4: Verify and commit**

Run focused tests and shared build, then commit:

```bash
git add packages/lns_ui_shared/src/modes packages/lns_ui_shared/src/projects PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): run approved models without mutation"
```

### Task 13: Implement Existing-Model Edit Mode

**Files:**

- Create: `packages/lns_ui_shared/src/modes/EditModel.tsx`
- Create: `packages/lns_ui_shared/src/modes/EditModel.test.tsx`
- Modify: shared workspace router
- Modify: workspace API only for missing draft-version fields

**Step 1: Write failing tests**

Test exact-version branch creation, lifecycle re-entry, revision save,
active-versus-candidate comparison, stale approval invalidation, new approval,
and preservation of the old model/version/receipt.

**Step 2: Verify failure**

Run focused UI and server tests.

**Step 3: Implement edit orchestration**

Compose existing Refine/Quantify/Simulate/Decide components under a draft
context. Never duplicate their scientific logic.

**Step 4: Verify and commit**

Run all shared UI tests plus workspace API tests, then commit:

```bash
git add packages/lns_ui_shared/src/modes packages/lns_server PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): edit models through versioned drafts"
```

### Task 14: Integrate the Canonical App and Add Playwright Harness

**Files:**

- Modify: `packages/lns_ui/src/App.tsx`
- Modify: `packages/lns_ui/src/styles.css`
- Modify: `packages/lns_ui/src/api/client.ts` or remove after migration
- Modify: `packages/lns_ui/package.json`
- Create: `packages/lns_ui/playwright.config.ts`
- Create: `packages/lns_ui/e2e/fixtures.ts`
- Create: `packages/lns_ui/e2e/smoke.spec.ts`
- Create: `packages/lns_ui/e2e/global-setup.ts` if required

**Step 1: Write a failing smoke E2E**

Test that Project Home loads, shows the four actions, opens New Project, and
shows all eight lifecycle stages at both required viewports.

**Step 2: Configure deterministic web servers**

Use temporary database paths and fixture mode. Configure Playwright to start:

- FastAPI on a fixed localhost test port;
- Vite on a fixed localhost test port.

Do not read `.env` or make provider/network calls.

**Step 3: Replace the old app shell**

Mount the shared Project Home and workspace router. Keep any still-useful legacy
graph path under an explicitly labeled legacy entry until later removal.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_ui
npm run build
npm run test:e2e -- --grep "workspace smoke"
git diff --check
```

Commit:

```bash
git add packages/lns_ui PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): mount canonical prediction workspace"
```

### Task 15: Add Canonical New, Run, Edit, and Monitor E2E Journeys

**Files:**

- Create: `packages/lns_ui/e2e/new-neodymium.spec.ts`
- Create: `packages/lns_ui/e2e/run-existing.spec.ts`
- Create: `packages/lns_ui/e2e/edit-existing.spec.ts`
- Create: `packages/lns_ui/e2e/monitor.spec.ts`
- Create: `packages/lns_ui/e2e/a11y.spec.ts`
- Create: `packages/lns_ui/e2e/helpers/receipts.ts`
- Create: `packages/lns_ui/e2e/helpers/graphAssertions.ts`

**Step 1: Write New journey**

Automate:

```text
New → Neodymium target → exact retail basis → Vet → Proceed now
→ labeled research fixture → 15+ candidates → inspect third-order path
→ remove factor → extend/redo branch → inspect delta
→ edit distribution → invalid value error → valid value
→ two named scenarios → shadow comparison
→ model decision/rationale → exact approval → active run/receipt
→ monitoring setup
```

**Step 2: Write Run journey**

Record graph version and serialized structure before/after. Assert equality.

**Step 3: Write Edit journey**

Assert old version remains, stale approval invalidates after another edit, and
new approval creates a distinct version/receipt.

**Step 4: Write Monitor journey**

Inject a labeled fixture freshness/drift event and cover inspect, acknowledge,
re-run, and branch edit.

**Step 5: Add accessibility assertions**

Use Playwright plus an accessibility scanner. Assert no serious/critical
violations, visible focus, keyboard-only completion of the core path, and
reduced-motion behavior.

**Step 6: Verify and commit**

Run:

```bash
cd packages/lns_ui
npm run test:e2e
```

Expected: all four journeys pass at `1440x900` and `1280x800`.

Commit:

```bash
git add packages/lns_ui/e2e packages/lns_ui/package.json packages/lns_ui/package-lock.json PROGRESS.md TASK_QUEUE.md
git commit -m "test(ui): prove prediction workspace journeys"
```

### Task 16: Make Gas Consume the Shared Workspace

**Files:**

- Modify: `packages/lns_gas_demo/src/App.tsx`
- Modify: `packages/lns_gas_demo/src/api.ts`
- Modify: `packages/lns_gas_demo/src/styles.css`
- Create: `packages/lns_gas_demo/src/gasPreset.ts`
- Create: `packages/lns_gas_demo/src/gasPreset.test.ts`

**Step 1: Write failing preset test**

Assert gas maps to shared target, project, graph, distribution, status, and
receipt types. Assert real-money controls are absent or explicitly isolated and
inactive by default.

**Step 2: Verify failure**

Run the shared test harness against the gas preset test.

**Step 3: Convert to a thin preset**

Mount shared workspace components with gas-specific initial content. Do not
duplicate generic inspectors or graph behavior.

**Step 4: Verify and commit**

Run:

```bash
cd packages/lns_gas_demo && npm run build
cd packages/lns_ui_shared && npm test -- --run
git diff --check
```

Commit:

```bash
git add packages/lns_gas_demo PROGRESS.md TASK_QUEUE.md
git commit -m "feat(gas): consume shared prediction workspace"
```

### Task 17: Capture Visual Evidence and Build the GUI Verifier

**Files:**

- Create: `scripts/verify_gui.sh`
- Create: `docs/verification/gui/README.md`
- Create: `docs/verification/gui/PROOF_MATRIX.md`
- Create: `docs/verification/gui/screenshots/1440x900/`
- Create: `docs/verification/gui/screenshots/1280x800/`
- Create: `docs/verification/gui/receipts/`
- Create: `docs/verification/gui/accessibility/`
- Modify: Playwright configuration/reporters

**Step 1: Write verifier failure conditions**

The script must fail unless:

- every `GOAL_GUI.md` proof item has a matrix row;
- required screenshot names exist at both viewports;
- E2E JSON/JUnit receipt exists and has zero failures;
- accessibility result exists and has no serious/critical issues;
- fixture labels are present in captured DOM/artifacts;
- `git diff --check` passes.

**Step 2: Run before artifacts**

Run:

```bash
./scripts/verify_gui.sh
```

Expected: FAIL with a list of missing evidence.

**Step 3: Capture from passing journeys**

Capture Project Home and each lifecycle stage, Run, Edit comparison, Monitor,
and final receipt at both viewports. Do not hand-edit screenshots.

**Step 4: Complete proof matrix**

For each proof item include:

- implementation file;
- test name;
- command;
- artifact;
- status;
- limitation.

**Step 5: Verify and commit**

Run:

```bash
./scripts/verify_gui.sh
git diff --check
```

Commit:

```bash
git add scripts/verify_gui.sh docs/verification/gui packages/lns_ui PROGRESS.md TASK_QUEUE.md
git commit -m "test(ui): save GUI proof and visual receipts"
```

### Task 18: Run Full Verification and Reality Audit

**Files:**

- Create: `docs/verification/gui/FINAL_GUI_REPORT.md`
- Modify: `PROGRESS.md`
- Modify: `TASK_QUEUE.md`
- Modify: `DECISIONS.md` if final evidence supersedes a pending choice
- Modify: `README.md` only for verified GUI behavior
- Modify: active handoff only after proof is complete

**Step 1: Run the full suite from current source**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui_shared && npm test -- --run
cd packages/lns_ui_shared && npm run build
cd packages/lns_ui && npm run build
cd packages/lns_ui && npm run test:e2e
cd packages/lns_gas_demo && npm run build
./scripts/verify_gui.sh
git diff --check
```

**Step 2: Audit every goal requirement**

Do not infer completion from green tests. For each requirement in
`GOAL_GUI.md`, inspect the relevant implementation, test coverage, runtime
artifact, and receipt. Classify as proved, contradicted, weak/missing, or
limited.

**Step 3: Fix every required gap**

If a required item is weak/missing, return to the owning task, add a failing
test, implement, rerun the nearest and full verification, and update evidence.

**Step 4: Write the final report**

Include:

- exact commands and results;
- proof matrix link;
- screenshots;
- changed-file summary;
- implemented/local/live/limited/deferred classification;
- known limitations;
- remaining non-GUI work from `GOAL.md`;
- explicit statement that fixtures do not prove forecast accuracy.

**Step 5: Update truth files**

Mark Gate 4 complete only if all GUI proof passes. Do not mark Gate 5 or the
overall `GOAL.md` complete.

**Step 6: Final commit**

```bash
git add README.md PROGRESS.md TASK_QUEUE.md DECISIONS.md docs/verification/gui HANDOFF_LATEST.md
git commit -m "docs(ui): record verified prediction workspace completion"
```

Run one final:

```bash
git status --short --branch
git log -1 --oneline
git diff --check
```

Expected: clean worktree, local completion commit present, no deployment or
push performed.
