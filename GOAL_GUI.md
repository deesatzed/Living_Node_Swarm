# GOAL_GUI.md

/goal

## OUTCOME

Complete the Living Node Swarm Prediction Workspace GUI as a transparent,
adaptable, localhost product with three coherent operating workflows:

1. **Build a new model** through:
   `Idea → Vet → Map → Refine → Quantify → Simulate → Decide → Monitor`.
2. **Run an existing model** without changing its approved structure.
3. **Edit an existing model** through a draft branch, shadow comparison, and
   version-bound approval.

The product must guide a non-specialist through the work while keeping every
material assumption, source, dependency, distribution, warning, model version,
and simulation receipt inspectable. The graph and its explanation surfaces are
the primary trust and sales experience.

This is an autonomous implementation goal. Codex must make safe, reversible
product and engineering decisions, record them, and continue without asking
the user to approve intermediate plans, mockups, libraries, styling, copy, or
task batches. Human review remains a required behavior *inside the finished
application* before proposed model structure becomes active; it is not a pause
in the development process.

## PRODUCT PRINCIPLES

1. **Workflow before screens.** The interface follows how a person develops
   confidence in a prediction, not the shape of backend objects.
2. **Transparency before streamlining.** Early versions expose assumptions and
   controls generously. Later evidence may justify simplifying common paths.
3. **Guidance without lock-in.** A lifecycle rail suggests the next useful
   step, while users can revisit earlier stages, inspect raw details, and branch
   alternatives.
4. **Conversation plus workspace.** The product supports back-and-forth
   discovery, but durable decisions become structured targets, nodes,
   relationships, distributions, scenarios, and receipts.
5. **No black-box claims.** Every result must answer:
   “What changed?”, “Why?”, “Through which paths?”, “Based on what?”, and
   “What remains uncertain?”
6. **Proposal is not activation.** AI/research suggestions remain proposed
   until the operator explicitly reviews and approves an exact version.
7. **Importance is not a coefficient.** User emphasis/ranking controls and
   numerical relationship parameters remain visibly distinct.
8. **Structural impact is not accuracy.** Candidate output may be described as
   changed, wider, narrower, shifted, or more/less sensitive, but never
   “better” without leakage-safe scoring evidence.

## PRIMARY INFORMATION ARCHITECTURE

### Project Home

The application opens to a project/model home that offers four clear actions:

- **New project**
- **Run model**
- **Edit model**
- **Monitor**

Each saved project/model row shows:

- target and horizon;
- mode and lifecycle stage;
- active graph/model version;
- draft/candidate status;
- freshness;
- last successful run;
- unresolved warning count;
- monitoring status;
- fixture/live-evidence classification.

Empty, loading, stale, partial, failed, and unavailable states must be designed,
not left as blank panels.

### Workspace Shell

The canonical workspace uses:

- a persistent header for project, target, horizon, version, freshness, run
  classification, and global warnings;
- a left lifecycle rail for workflow stage and completion state;
- a central target-centered dependency graph;
- a right contextual inspector for node, relationship, evidence, distribution,
  scenario, or receipt details;
- a bottom analysis tray for candidate comparison, outcome distributions,
  sensitivity/ablation, scenario/model comparison, and run receipts;
- a collapsible discovery/research conversation surface that records what the
  user said, what the app inferred, what remains unanswered, and which
  structured objects resulted.

The layout must remain usable at `1440x900` and `1280x800`. Panels may collapse
or become drawers, but scientific status and the target must not disappear.

## WORKFLOW A — BUILD A NEW MODEL

### Stage 1: Idea

The user describes the prediction in ordinary language.

The UI converts it into a visible target draft and collects or derives:

- human-readable question;
- exact outcome/series;
- forecast origin;
- target date or horizon;
- product/grade/purity where relevant;
- price or observation basis;
- geography/incoterm where relevant;
- currency and unit;
- timezone and observation-time rule;
- primary resolution source;
- missing-source fallback;
- revision policy.

The user-supplied Neodymium example must work:

> Predict the Neodymium price in one year, monitored at
> `https://strategicmetalsinvest.com/neodymium-prices/`.

The interface must visibly distinguish that private-investor retail series from
bulk, spot, oxide, metal, alloy, or FOB-China series. The app may propose
missing values but cannot silently invent a resolution-grade contract.

Exit condition: required `TargetContract` fields validate or the UI identifies
the exact missing/ambiguous fields.

### Stage 2: Vet

The app conducts a focused, resumable discovery exchange covering:

- why the user cares about the prediction;
- existing thesis and private background thoughts;
- known sources and desired source breadth;
- supply, demand, substitution, recycling, future uses, and regime risks;
- non-obvious external mechanisms;
- scenarios the user wants included or excluded;
- research and cloud-routing consent.

The surface must provide:

- **Pause and resume**
- **Proceed now**
- **Ask another question**
- **Add source**
- **Add direction**
- **Exclude direction**
- **Correct understanding**

“Proceed now” skips optional exploration but cannot bypass unresolved target
contract fields, unsafe URL handling, or provider-routing consent.

The exchange must show:

- confirmed facts;
- user claims;
- proposed interpretations;
- open questions;
- excluded directions;
- planned research categories;
- what data would leave the machine and to which provider/model.

Exit condition: the user has a valid target plus an explicit research brief,
including visible gaps and consent state.

### Stage 3: Map

The app renders ranked proposed factors around the target in deterministic hop
layers:

- target;
- first-order/direct dependencies;
- second-order dependencies;
- third-order and deeper dependencies.

At least 15 distinct candidate factors and one three-hop path must be supported
in the canonical fixture journey. Candidate breadth does not imply activation.

Every node card exposes at a glance:

- name and short role;
- hop distance;
- active/proposed/excluded/unsupported/stale state;
- evidence class and confidence;
- distribution family and central interval;
- warnings;
- whether it is observable/monitorable.

Every edge exposes:

- model-dependency type;
- sign;
- lag and lag unit;
- transform;
- source/target/coefficient units;
- evidence state;
- active/proposed status.

The graph includes deterministic no-overlap initial layout, zoom, pan, keyboard
navigation, search, filters, fit-to-view, hop focus, path highlight, and a
textual alternative representation.

Exit condition: the user can understand the proposed dependency structure and
trace a selected factor to the target without reading raw JSON.

### Stage 4: Refine

The user can iteratively:

- include or exclude a node;
- remove an unsupported direction;
- extend a selected branch;
- add a missing factor;
- merge or separate possible duplicates;
- challenge or edit a relationship;
- ask for alternatives;
- redo only a selected branch;
- redo the whole proposal while preserving the previous revision;
- undo/redo local changes;
- compare revisions.

After each revision, show:

- additions, removals, and edits;
- affected paths;
- new/resolved warnings;
- evidence changes;
- whether any approval was invalidated;
- what remains unchanged.

No proposed or edited structure may mutate the active model during this stage.

Exit condition: a complete candidate graph revision exists with explicit
exclusions, unresolved warnings, and a stable version identifier.

### Stage 5: Quantify

For every material node, show and allow review of:

- registered distribution family;
- plain-language reason that family fits;
- natural support and optional truncation;
- intuitive range/quantiles;
- mean and median;
- dispersion/tail behavior;
- canonical parameters;
- units and as-of time;
- elicitation or fitting method;
- source/evidence links;
- confidence rationale;
- limitations and alternatives.

Support all eight canonical families:

- `Normal`
- `LogNormal`
- `Beta`
- `Poisson`
- `NegativeBinomial`
- `Gamma`
- `StudentT`
- `Deterministic`

Use a curve preview, intuitive inputs, and derived read-only values. Do not ask
users to enter unfamiliar canonical parameters when supported quantile
elicitation can derive them consistently.

Relationships receive an equally explicit inspector for transform, coefficient
distribution, units, sign, lag, validity range, evidence, and warnings.

Provide user-facing factor emphasis as a scenario/modeling control, clearly
separated from coefficients. If the user asks to “weight this more,” the UI
must offer a transparent choice such as:

- increase confidence/emphasis for scenario comparison;
- modify a documented relationship parameter;
- include/exclude the mechanism;
- create a separate model variant.

Exit condition: all included nodes and relationships validate, or invalid
objects remain visibly excluded with actionable errors.

### Stage 6: Simulate

The user can create and compare named modeling runs such as:

- base;
- conservative;
- upside/downside;
- high-demand;
- supply disruption;
- substitution acceleration;
- custom.

Each run shows:

- exact graph/target/scenario version;
- seed and sample count;
- freshness;
- progress and cancellation;
- target distribution and quantiles;
- mean/median and central/tail intervals;
- convergence/stability diagnostics;
- unresolved-dependence warnings;
- sensitivity/ablation method and limitations;
- complete receipt;
- failed/partial state without overwriting the last successful result.

Multiple weighting/assumption variants must be comparable side-by-side, with
affected nodes and paths highlighted. No run may silently change the active
model.

Exit condition: at least one reproducible shadow or active run has an
inspectable receipt, or the UI presents a stable, actionable failure state.

### Stage 7: Decide

The app supports joint assessment of candidate model variants through cards or
a comparison table showing:

- included/excluded mechanisms;
- evidence coverage;
- unresolved warnings;
- target range and tails;
- sensitivity concentration;
- stability;
- overlap/difference from other variants;
- validation/scoring status;
- rationale and limitations.

The operator can:

- select one model;
- preserve several named scenarios without combining them;
- create an explicitly weighted ensemble through an authoritative backend
  contract;
- record a decision rationale;
- approve the exact graph/model version.

An ensemble must expose its member versions, weights, combination method, and
limitations. The UI must never implement authoritative ensemble math itself.

Exit condition: a version-bound decision/approval receipt exists, or the user
has explicitly retained the work as an unapproved scenario set.

### Stage 8: Monitor

The user can define:

- target observation source and cadence;
- material driver observations;
- source-freshness thresholds;
- assumption-drift thresholds;
- calibration/accuracy metrics where observations exist;
- re-run triggers;
- review-only versus automatic local re-run behavior;
- alert severity and acknowledgement.

Monitoring displays:

- last checked and next due;
- source availability/freshness;
- changed assumptions or observations;
- drift from the approved model;
- run history and target-resolution status;
- calibration history when legitimately measurable;
- actions: inspect, acknowledge, re-run, branch edit.

The first GUI release may use deterministic local fixture events for E2E proof,
but any unavailable live polling capability must be labeled limited and cannot
be portrayed as live.

Exit condition: monitoring configuration and its capability classification are
saved and inspectable.

## WORKFLOW B — RUN AN EXISTING MODEL

Running an existing model must be a short, safe operating path:

1. Select model and inspect target, version, approval, freshness, warnings, and
   last run.
2. Choose unchanged assumptions or create a named, non-mutating scenario.
3. Review changed inputs and resolution/source freshness.
4. Run with visible progress/cancellation.
5. Compare against prior runs.
6. Inspect distribution, affected paths, sensitivity, limitations, and receipt.
7. Save/export the local receipt without changing the approved structure.

The UI must prevent accidental transition from “run” into structural mutation.

## WORKFLOW C — EDIT AN EXISTING MODEL

Editing must branch from an exact approved version:

1. Select **Edit** and create a draft branch.
2. Preserve the active model and its last successful run.
3. Re-enter the relevant lifecycle stage: Vet, Map, Refine, Quantify, or
   Monitor.
4. Make changes with undo/revision history.
5. Validate all affected nodes and relationships.
6. Run active-versus-candidate shadow simulations.
7. Show paths, assumptions, distributions, warnings, and output changes.
8. Approve the candidate as a new version using an exact binding hash.
9. Treat an intervening edit or active-version change as approval
   invalidation.

The app must never silently overwrite an approved model.

## ADAPTABILITY REQUIREMENTS

1. Implement the lifecycle and workspace as typed, composable shared
   components rather than a monolithic `App.tsx`.
2. Keep stage definitions, labels, completion rules, and navigation in a
   central typed workflow configuration.
3. Keep API access in one shared client layer with explicit loading/error
   states.
4. Derive distribution UI metadata from the authoritative registry/catalog.
5. Make inspectors contextual and extensible through typed sections.
6. Keep graph layout data separate from graph rendering and scientific data.
7. Store panel/open-state preferences separately from model state.
8. Preserve durable workflow/model state through server contracts; do not make
   browser-local state the only copy of scientific decisions.
9. Use feature flags only for genuinely limited capabilities, with visible
   labels; do not hide unfinished required work behind a flag and call the goal
   complete.
10. Favor a clear desktop analytical workspace. Mobile optimization is
    deferred, but narrow-window failure must be graceful.

## VISUAL AND INTERACTION REQUIREMENTS

- Professional analytical character: calm neutral surfaces, high information
  density, strong typography, restrained color, and clearly layered panels.
- The target and outcome distribution remain the visual anchor.
- First-, second-, and third-order structure is immediately legible.
- Status uses text, icon, shape, and/or pattern; never color alone.
- Curves, ranges, means, medians, evidence, and uncertainty are visible without
  opening raw payloads.
- Every meaningful control has a label, focus state, disabled explanation, and
  keyboard path.
- Support reduced motion and adequate contrast.
- Tooltips supplement visible labels; they do not carry required information.
- Long tasks show stage, progress, elapsed state, cancellation, and retained
  partial receipts.
- Confirm only irreversible/high-impact actions; ordinary exploration remains
  fluid.
- Copy uses “model dependency” unless stronger causal language is supported.
- Copy never implies investment advice, guaranteed accuracy, or competitor
  superiority.

## SCOPE

### Primary scope

- `packages/lns_ui_shared/`
- `packages/lns_ui/`
- `packages/lns_gas_demo/` only where necessary to consume the shared package
- `packages/lns_server/` for narrowly required workflow persistence or UI API
  contracts
- `packages/lns_kernel/` only when an authoritative scientific operation
  required by this GUI is missing and is explicitly tested there
- UI/component/API/E2E tests
- `docs/plans/`, `docs/verification/gui/`, project control Markdown, and
  relevant test/build configuration

### Read and preserve

- `GOAL.md`
- `STANDARDS.md`
- `IMPLEMENT.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `TASK_QUEUE.md`
- `docs/plans/2026-07-27-domain-general-prediction-workspace-design.md`
- `docs/plans/2026-07-27-domain-general-prediction-workspace-implementation.md`
- current kernel/server contracts and schema exports

### Do not modify or expose

- `.env`, credentials, keys, accounts, private notes, or local user databases
- `agno/` third-party reference tree
- live Kalshi account state
- unrelated user changes
- real-money controls except to isolate/disable them safely

## REQUIRED DELIVERABLES

1. Private shared package `packages/lns_ui_shared`.
2. Typed shared API client and server-contract compatibility tests.
3. Project Home with New, Run, Edit, and Monitor entry paths.
4. Configurable lifecycle workspace for all eight Build stages.
5. Discovery/vetting conversation and structured-decision surface.
6. Target-centered multi-hop graph and accessible textual alternative.
7. Node, relationship, distribution, evidence, and warning inspectors.
8. Revision/refinement controls with visible candidate deltas.
9. Scenario/model comparison and active-versus-candidate views.
10. Approval, simulation, model/ensemble decision, and receipt views.
11. Existing-model Run and Edit journeys.
12. Monitoring configuration/status journey with honest fixture/live labels.
13. Component, API, accessibility, and E2E tests.
14. Screenshots at both required desktop viewports.
15. A GUI verification report mapping every proof item to evidence.
16. Updated `PROGRESS.md`, `TASK_QUEUE.md`, and `DECISIONS.md`.

## PROOF OF DONE

### Architecture and integration

1. Both `lns_ui` and `lns_gas_demo` consume shared types/client/components from
   `lns_ui_shared`; generalized workspace behavior is not duplicated.
2. The canonical UI builds without TypeScript errors.
3. Shared types/catalog compatibility tests fail on material API/registry drift.
4. Authoritative forecast, distribution, approval, and ensemble computation
   remains outside the browser UI.

### New-model journey

5. A deterministic Playwright journey creates the one-year Neodymium project,
   confirms the exact retail-series basis, completes/short-circuits vetting with
   **Proceed now**, reviews at least 15 proposed factors, and inspects a
   third-order path.
6. The journey removes one factor, extends one branch, requests/replays a branch
   revision, and shows a complete revision delta without mutating the active
   graph.
7. The journey inspects and changes a distribution through intuitive inputs,
   shows its curve/range/mean/median/provenance, and displays validation errors
   for an invalid value.
8. The journey creates at least two named weighting/assumption variants, runs
   them in shadow mode, and compares outcome ranges and affected paths.
9. The journey compares candidate model choices, records a rationale, approves
   one exact model version, creates and assesses a two-model weighted ensemble,
   runs the selected decision, and opens its reproducibility receipt.
10. The journey configures monitoring and shows fixture/live capability labels.

### Existing-model journeys

11. A Playwright journey runs an approved existing model and proves that graph
    structure/version remains unchanged.
12. A Playwright journey branches an approved model, edits it, compares active
    versus candidate, invalidates stale approval after a further edit, and
    approves a new version without overwriting the old one.
13. Monitoring history can lead to inspect, re-run, or branch-edit actions.

### Visual trust and usability

14. A deterministic 30-node fixture has no initial node overlap at `1440x900`
    and `1280x800`.
15. Target and hop layers remain legible; zoom, pan, search, filters,
    fit-to-view, keyboard focus, path highlight, and textual graph alternative
    are verified.
16. Every node/relationship status has a non-color indicator.
17. Every material number shows units, as-of/provenance state, and
    elicited/derived classification where applicable.
18. Active/candidate and multi-run comparisons identify changes without
    unsupported “improvement” language.
19. Loading, empty, partial, failed, stale, cancelled, invalidated, and
    permission-denied states have deterministic tests.
20. Automated accessibility checks show no serious/critical violations in the
    canonical journeys; keyboard-only workflow and reduced-motion behavior are
    covered.

### Evidence and truthfulness

21. Fixture research, fixture monitoring, and synthetic simulation evidence are
    labeled as fixtures everywhere they appear.
22. Unsafe URLs and unconfirmed provider routing cannot be bypassed through the
    GUI.
23. Proposed structure cannot affect the active simulation before a valid
    version-bound approval.
24. Screenshots and `docs/verification/gui/FINAL_GUI_REPORT.md` distinguish
    implemented, locally verified, live-provider verified, limited, and
    deferred behavior.
25. Existing kernel/server regressions, both UI builds, GUI tests, and
    `git diff --check` pass.

## REQUIRED VERIFICATION

The implementation must create any missing test scripts/configuration needed
for these commands, then run them from a clean working state:

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui_shared && npm test -- --run
cd packages/lns_ui_shared && npm run build
cd packages/lns_ui && npm run build
cd packages/lns_ui && npm run test:e2e
cd packages/lns_gas_demo && npm run build
git diff --check
```

Also create and run a repository-level deterministic GUI verifier:

```bash
./scripts/verify_gui.sh
```

The verifier must fail if required screenshots, E2E receipts, accessibility
results, fixture labels, or proof-to-evidence mappings are absent.

Save current command output and artifacts under `docs/verification/gui/`.

## AUTONOMOUS DECISION POLICY

Codex must continue without requesting routine human decisions.

### Decisions Codex must make autonomously

- component and file boundaries;
- typography, spacing, neutral palette, icons, and responsive panel behavior;
- exact microcopy consistent with the terminology in project truth files;
- graph renderer/layout choice after a bounded 30-node prototype;
- test libraries and accessibility tooling;
- whether to use a small dependency or local implementation;
- fixture shape and deterministic test seeds;
- API adapter details;
- task slicing, local commits, and repair order;
- whether a panel is inline, drawer, tab, or collapsible;
- safe defaults for optional workflow steps.

For each consequential choice:

1. prefer existing dependencies and patterns;
2. prototype the smallest viable option;
3. compare it against the measurable requirements here;
4. choose the option with the strongest verification evidence;
5. record the decision in `DECISIONS.md`;
6. continue.

Do not pause merely because several good solutions exist.

### Default resolutions

- **Product mode:** hybrid guided workflow plus analyst cockpit.
- **Product bias:** transparency and adaptability over early streamlining.
- **Canonical app:** `lns_ui`.
- **Reuse:** private local `lns_ui_shared` package.
- **Graph orientation:** target-centered hop columns with deterministic layout.
- **Default state:** show active and proposed structure together with explicit
  status encoding; never silently activate proposals.
- **Styling:** professional analytical desktop workspace with restrained
  motion and no decorative imagery requirement.
- **Research/E2E:** deterministic labeled fixtures; live provider calls are not
  required to prove GUI behavior.
- **Monitoring/E2E:** deterministic labeled local events; live polling remains
  limited until separately verified.
- **Missing optional data:** show unknown/limited state and continue.
- **Backend gap:** implement the smallest typed, persisted API needed for the
  required workflow and test it; do not fake authoritative behavior in UI
  state.
- **Dependency choice:** add one only when a local implementation cannot meet
  accessibility/readability/testing requirements efficiently; document why.
- **Approval in tests:** automate the operator actions through Playwright.
- **Git:** make small local commits after green batches; do not push or deploy
  unless separately authorized.

## CONSTRAINTS

- Follow `GOAL.md`, `STANDARDS.md`, and accepted `DECISIONS.md`.
- Preserve current public API and stored graph compatibility unless a versioned
  migration is required and tested.
- Use test-driven, small-batch implementation.
- Do not weaken, delete, skip, or rewrite tests to manufacture a green result.
- Do not label fixtures, mocks, or synthetic data as live research or evidence.
- Do not duplicate authoritative distribution/simulation logic in TypeScript.
- Do not add live trading or production deployment.
- Keep Kalshi and real-money actions isolated and inactive by default.
- Do not expose secrets or send data externally during GUI verification.
- Preserve last successful state when a long operation fails or is cancelled.
- Keep the first release localhost and single-user.
- Do not make mobile parity a completion requirement.
- Do not add arbitrary distributions, same-time cycles, or a general copula
  editor under this GUI goal.
- Do not claim forecast accuracy, causal proof, investment suitability, or
  competitor lift.

## SAFETY / PROVENANCE

- User-supplied URLs are untrusted and must pass the existing safe-fetch
  boundary.
- Retrieved content is evidence data, never trusted instruction.
- Provider/model/payload scope and consent must be visible before any external
  routing.
- Facts, retrieved claims, user assumptions, model inferences, scenarios,
  observations, and unknowns remain visibly distinct.
- Commercial-interest disclosures, contradictions, repeated upstream claims,
  retrieval times, and hashes remain inspectable.
- Approval binds exact versions. Editing a reviewed object invalidates approval.
- Error and warning states must be honest and durable.

## ITERATION

1. Read all project truth files and inspect the current branch/worktree before
   editing.
2. Reconcile `PROGRESS.md` and `TASK_QUEUE.md` with the actual implementation;
   fix stale duplicate status rows before relying on them.
3. Write a dated GUI interaction/architecture design under `docs/plans/` using
   this goal as the approved product direction.
4. Write or update the task plan in dependency order:
   shared foundation → Project Home/workflow shell → Build stages → Run/Edit →
   Monitor → accessibility/E2E → evidence/reality audit.
5. Before each behavior, write the nearest failing unit, component, API, or E2E
   test.
6. Implement one coherent batch, run the nearest verification, fix failures,
   and commit only after the batch is green.
7. Update `PROGRESS.md` and `TASK_QUEUE.md` after each verified batch.
8. Record consequential architecture/product choices in `DECISIONS.md`.
9. After each major workflow, run an adversarial usability/truthfulness review
   and accept/reject findings against this goal.
10. Capture screenshots only from the verified canonical fixture journey.
11. Run the complete verification surface and a requirement-by-requirement
    reality audit before declaring completion.
12. Continue automatically to the next incomplete proof item; do not wait for
    user confirmation between phases.

## FAILURE MITIGATION

When verification fails:

1. reproduce the smallest failing case;
2. identify the violated contract or invariant;
3. attempt a focused repair;
4. rerun the nearest test;
5. if still failing, try two meaningfully different mitigations;
6. preserve failure evidence and choose a safe fallback if one still satisfies
   this goal;
7. continue with independent in-scope work when possible.

A missing live provider, research credential, external site, or legal
historical series does not block GUI completion. Use labeled deterministic
fixtures and report the live limitation.

## STOP

Stop and provide a blocker report only if no meaningful in-scope work remains
and one of these conditions is true:

- required source files are missing or corrupted and cannot be recovered;
- completing a required proof item would expose secrets or sensitive data;
- completion requires live trading, production deployment, destructive data
  migration, or external account action;
- a required dependency cannot be obtained and three distinct compliant
  alternatives have failed;
- the same critical verification failure persists after three distinct,
  documented mitigation approaches;
- accepted project decisions contain a direct contradiction that cannot be
  resolved by choosing the stricter transparency, safety, provenance, or
  compatibility rule.

Do not stop for styling preferences, copy choices, layout-library selection,
fixture design, task ordering, optional data, noncritical warnings, or a desire
for user reassurance.

## COMPLETE

Mark this GUI goal complete only when:

1. every required deliverable exists;
2. every `PROOF OF DONE` item has direct current evidence;
3. every required verification command exits zero;
4. both viewport screenshot sets come from passing E2E runs;
5. `docs/verification/gui/FINAL_GUI_REPORT.md` maps each requirement to its
   test, artifact, or inspected implementation;
6. `PROGRESS.md`, `TASK_QUEUE.md`, and `DECISIONS.md` match the verified state;
7. no required workflow is represented only by a static mock, disabled button,
   hidden feature flag, or documentation claim;
8. fixture/live/limited/deferred states are truthful;
9. `git diff --check` is clean;
10. a final changed-file summary, test summary, limitations list, and remaining
    non-GUI `GOAL.md` work are reported.

If any required evidence is missing, continue working. Do not redefine
completion around the easiest passing subset.

## ASSUMPTIONS

- “No human in the loop” means autonomous software implementation without
  repeated user approvals. It does not remove runtime operator review from a
  product whose purpose is transparent, user-controlled modeling.
- The current Gate 0–3 feature worktree is the implementation base.
- Deterministic fixtures are acceptable for GUI and E2E verification when
  plainly labeled.
- Live Neodymium research and historical lift evaluation remain separate
  `GOAL.md` Gate 5 concerns unless credentials and suitable data are already
  available.
- The initial release is a desktop-first localhost application for a serious
  single operator.

## OUT OF SCOPE

- Production hosting or deployment
- Multi-user collaboration and permissions
- Mobile feature parity
- Live trading or autonomous investment decisions
- Guaranteed forecast accuracy
- Same-time cyclic simulation
- Arbitrary custom/empirical distributions
- General copula editing
- Autonomous self-modifying models
- Replacing the operator approval invariant
