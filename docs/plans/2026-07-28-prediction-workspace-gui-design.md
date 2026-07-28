# Prediction Workspace GUI Design

**Date:** 2026-07-28
**Status:** Approved
**Source of truth:** `GOAL_GUI.md`, `GOAL.md`, `STANDARDS.md`,
`DECISIONS.md` D-021 through D-023

## 1. Product Shape

The Prediction Workspace is a hybrid of a guided model-building workflow and
an analyst cockpit. It guides a new operator through the work in a logical
order without hiding the graph, assumptions, evidence, or model controls.

The canonical lifecycle is:

```text
Idea → Vet → Map → Refine → Quantify → Simulate → Decide → Monitor
```

The application also provides three operating paths:

```text
New project → Build lifecycle
Existing model → Run without structural mutation
Existing model → Edit through draft branch and approval
Existing model → Monitor and respond to drift/freshness events
```

Transparency and adaptability take priority over early streamlining. Usage
evidence may later justify shortcuts, but the first workspace must make the
entire reasoning chain inspectable.

## 2. Interaction Model

### Project Home

Project Home is the entry point rather than a blank graph. It lists each
project/model with target, horizon, stage, model version, freshness, last run,
warnings, and evidence classification. Four actions are always clear: New,
Run, Edit, and Monitor.

### Workspace

```text
┌ Target · horizon · version · freshness · classification · warnings ┐
├──────────────┬────────────────────────────┬──────────────────────────┤
│ Lifecycle    │ Target-centered graph      │ Context inspector        │
│ Idea         │ target and hop columns     │ node / edge / evidence   │
│ Vet          │ active + proposed states   │ distribution / warnings  │
│ Map          │ affected-path highlight    │ revision / receipt       │
│ Refine       │ search / filter / fit      │                          │
│ Quantify     │                            │                          │
│ Simulate     │                            │                          │
│ Decide       │                            │                          │
│ Monitor      │                            │                          │
├──────────────┴────────────────────────────┴──────────────────────────┤
│ Comparison · target distributions · sensitivity · run receipt       │
└─────────────────────────────────────────────────────────────────────┘
```

A collapsible discovery surface sits alongside the structured workspace. It
records user statements, app interpretations, open questions, exclusions, and
the structured objects produced from the exchange.

### Progressive Disclosure

- Default graph view: target, hop structure, state, central interval, warnings.
- Select a node: curve, family, parameters, provenance, parents/children.
- Select an edge: type, sign, transform, units, lag, evidence, state.
- Open comparison: candidate delta, affected paths, outcome changes.
- Open receipt: exact versions, seed, sample count, diagnostics, limitations.

Required information is never available only through hover or color.

## 3. Build Workflow

### Idea

Convert natural-language intent into a resolution-grade target. Missing
required fields are visible and block advancement; app suggestions remain
suggestions. The Neodymium journey explicitly identifies the supplied
private-investor retail series and avoids conflating it with other bases.

### Vet

Use a structured conversation to clarify thesis, sources, exclusions, research
scope, and external routing. The user can pause, correct, add directions, or
press **Proceed now**. Proceed skips optional questions but not target validity,
URL safety, or provider consent.

### Map

Show first-, second-, and third-order candidates in deterministic hop layers.
At least 15 candidates and one three-hop path fit without default overlap.
Nodes and edges expose state, evidence, distribution/relationship summaries,
and warnings.

### Refine

Support include, exclude, add, extend, merge, split, branch redo, whole-proposal
redo, and revision comparison. Each iteration produces an explicit delta.
Active state is immutable during refinement.

### Quantify

Inspect all eight registered distributions using intuitive values, curves,
ranges, means/medians, canonical parameters, provenance, and limitations.
Relationship controls expose units, lags, transforms, and evidence. User
importance is separate from numerical coefficients; an ambiguous “weight more”
request becomes an explicit scenario, confidence, inclusion, or parameter
choice.

### Simulate

Run named scenario/model variants in shadow mode and compare target ranges,
tails, stability, sensitivity, warnings, and affected paths. Long operations
have progress, cancellation, durable partial state, and preserved last success.

### Decide

Compare models on structure, evidence, warnings, ranges, sensitivity,
stability, and validation. Select one model, preserve several scenarios, or use
an explicit backend-owned weighted ensemble. Approval binds the exact member
versions and weights and records rationale.

### Monitor

Configure source cadence, freshness, drift thresholds, re-run rules, metrics,
and alert severity. Monitoring clearly identifies whether events are fixture,
local-live, or externally verified.

## 4. Existing-Model Workflows

### Run

Running starts from a selected approved version, reviews freshness and scenario
inputs, executes without graph mutation, compares with prior runs, and produces
a receipt.

### Edit

Editing branches from an exact version. Changes use the same lifecycle stages,
then run in shadow mode. Approval invalidates after any bound edit. A successful
approval creates a new version while preserving the prior model and receipt.

### Monitor Response

A monitoring event can lead to inspect, acknowledge, re-run, or branch edit.
It cannot silently rewrite the model.

## 5. Component Architecture

`packages/lns_ui_shared` owns:

```text
src/
  api/              shared typed client and contract adapters
  workflow/         lifecycle configuration, state, transition guards
  projects/         Project Home and model selectors
  workspace/        shell, header, rail, panels, status surfaces
  discovery/        vetting conversation and decision ledger
  graph/            layout, renderer, controls, textual alternative
  inspectors/       target, node, relationship, evidence, distribution
  refinement/       revision delta and proposal controls
  simulation/       scenario editor, comparisons, progress, receipts
  decisions/        model comparison, rationale, approval
  monitoring/       configuration, status, history, actions
  accessibility/    shared focus/status helpers
  testing/          deterministic fixtures and API fakes
```

`lns_ui` is the canonical application shell. `lns_gas_demo` becomes a preset
consumer. The shared package owns no authoritative forecasting math.

Lifecycle labels, guards, and completion summaries are a typed configuration,
allowing later evidence-backed streamlining without rewriting the workspace.

## 6. State and Data Flow

```text
Operator action
  → shared React component
  → typed API client
  → FastAPI validation/orchestration
  → SQLite contracts/graph/evidence/workflow state
  → kernel simulation where required
  → typed response and receipt
  → workspace graph/inspector/comparison
```

Scientific decisions are persisted server-side. Local UI preferences such as
open panels and zoom may remain browser-local.

Candidate changes use a separate draft/revision state. Shadow runs operate on
copies. Exact binding hashes and versions govern approval.

## 7. Error and Long-Task Design

Every asynchronous surface has explicit idle, loading, partial, success,
cancelled, stale, invalidated, and failed states.

- Unsafe source: reject before retrieval.
- Ambiguous target: show missing fields and block required transition.
- Partial research: preserve receipts and gaps.
- Invalid node/edge: retain draft, exclude from approval, show exact error.
- Approval invalidation: show changed fields and return to review.
- Simulation failure/cancel: preserve last successful run.
- Unavailable live monitoring/provider: use no silent fallback; show limitation.

## 8. Accessibility and Visual Behavior

The UI is desktop-first at `1440x900` and `1280x800`. It uses strong typography,
calm neutral surfaces, restrained color, and high information density.

Keyboard paths, focus states, semantic labels, reduced motion, contrast, and a
textual graph representation are required. Status always has a non-color
encoding. Tooltips supplement but never replace visible required information.

## 9. Verification Strategy

- Vitest and Testing Library for shared components and workflow guards.
- Contract/catalog drift tests against server schema exports.
- Deterministic layout tests for 30 nodes at both viewports.
- FastAPI tests for any new workflow persistence endpoints.
- Playwright for New, Run, Edit, and Monitor journeys.
- Automated accessibility scans plus explicit keyboard/reduced-motion tests.
- Screenshot and receipt artifacts saved under `docs/verification/gui/`.
- A repository-level `scripts/verify_gui.sh` enforces the complete evidence
  surface.

The canonical E2E journey uses labeled fixtures. Live research and historical
forecast lift remain separate acceptance concerns.

## 10. Autonomous Build Policy

The implementation agent does not stop for routine UX or engineering choices.
It follows safe defaults in `GOAL_GUI.md`, prototypes uncertain technical
choices against measurable criteria, records consequential decisions, and
continues.

Only safety, secrets, destructive actions, production deployment, unrecoverable
source loss, or repeated critical verification failure may stop the run.
