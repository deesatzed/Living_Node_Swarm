# PROGRESS.md

## Status Overview

**Gate 4 in progress – Gates 0–3 complete; Prediction Workspace is under active verification**

The domain-general contracts, scientific kernel, safe-research primitives, and
fixture-backed generalized authoring API are verified through Gate 3. The
existing v0.1/v0.2 UI shell remains the visual baseline; the generalized
Prediction Workspace has not been built yet.

## Current Baseline

| Surface | Verified state |
|---|---|
| Kernel tests | 72 passed on 2026-07-27 after persisted multi-seed/multi-sample stability diagnostics |
| Server tests | 55 passed on 2026-07-28 after workspace-persistence coverage; one upstream deprecation warning |
| General UI | Production build passed on 2026-07-28 after consuming `@lns/ui-shared` |
| Gas UI | Production build passed on 2026-07-28 after consuming `@lns/ui-shared` |
| Current families | Eight canonical registry families; legacy node payloads remain readable through explicit parameter normalization |
| Current graph | Static DAG with affine/sum/mean transforms |
| Current research/provenance | Local security, provenance, consent, and completeness primitives implemented; no live research/API journey yet |
| Current generalized authoring UX | Both apps consume the shared lifecycle package; typed client/catalog and deterministic fixture groundwork exist, but workspace journeys are not yet implemented |

## Current Assumptions

1. The user wants an ambitious, transparent product rather than a narrow gas demo.
2. Human approval remains mandatory before AI-proposed structure becomes active.
3. The initial eight-family registry is fixed for the first generalized release.
4. Time-expanded DAGs are sufficient for the first delayed-effect implementation.
5. Shared latent parents plus warnings are sufficient for first-release dependence handling.
6. Neodymium history may be difficult to obtain; inability to verify it blocks lift claims, not honest workflow development.
7. No live trading is needed or authorized for this goal.

## Task Tracker

| Task | Status | Owner | Notes |
|---|---|---|---|
| Harden `GOAL.md` | Complete | Codex | Added contracts, gates, proof, safety, UX, stop/complete rules |
| Create project standards | Complete | Codex | `STANDARDS.md` |
| Record architecture/product decisions | Complete | Codex | `DECISIONS.md` |
| Create phased implementation guidance | Complete | Codex | `IMPLEMENT.md` |
| Create actionable queue | Complete | Codex | `TASK_QUEUE.md` |
| Create detailed design and implementation plans | Complete | Codex | Saved under `docs/plans/` |
| Replace stale latest handoff | Complete | Codex | Active packet is `HANDOFF_2026-07-27_DOMAIN_GENERAL.md` |
| Q0-01 `TargetContract` | Complete | Codex | Immutable resolution-grade contract; 5 new tests, 25 kernel tests passed |
| Q0-02 through Q0-05 contract slices | Complete | Codex | Distribution, evidence/source/conflict, relationship, proposal/approval/run contracts; 34 kernel tests passed |
| Gate 0 compatibility and API schemas | Complete | Codex | Legacy graph defaults, public JSON-schema export, and canonical Neodymium contract doc; 37 kernel tests passed |
| Q1-01 distribution registry | Complete | Codex | Eight canonical families, support/parameter metadata, aliases; 42 kernel tests passed |
| Q1-02 validation/statistics | Complete | Codex | Registry-backed finite/parameter/support validation and explicit analytic statistics; 48 kernel tests passed |
| Q1-03 seeded sampling | Complete | Codex | Reproducible support-checked sampling for every canonical family; 57 kernel tests passed |
| Q1-04 parameter compatibility | Complete | Codex | Legacy node payloads round-trip; runtime normalizes documented legacy names to frozen registry parameterization; 60 kernel tests passed |
| Q1-05 relationship units | Complete | Codex | Affine coefficient dimensions and aggregate unit compatibility reject invalid graph edges; 63 kernel tests passed |
| Q1-06 time-expanded lags | Complete | Codex | Explicit lag clock, delayed-feedback expansion, and same-time cycle rejection; 66 kernel tests passed |
| Q1-07 dependence warnings | Complete | Codex | Warns on unresolved proxy correlation, duplicate links, and shared-evidence double counting; 69 kernel tests passed |
| Q1-09 continuous scoring | Complete | Codex | Empirical CRPS and interval coverage with reference/invalid-input tests; 71 kernel tests passed |
| Q1-08 stability diagnostics | Complete | Codex | Every successful snapshot persists a bounded multi-seed/multi-sample metric-range receipt and limitation; 72 kernel tests passed |
| Gate 1 scientific kernel | Complete | Codex | Registry, compatibility, units, temporal DAG, dependence warnings, stability receipts, and scoring verified |
| Q2-01 URL safety | Complete | Codex | HTTP(S)-only, credential-free, public-DNS destination validation; 24 server tests passed |
| Q2-02 bounded fetcher | Complete | Codex | Manual redirect revalidation, timeout, streamed byte cap, content-type allowlist; 28 server tests passed |
| Q2-03 evidence persistence | Complete | Codex | Local SQLite stores typed source receipts/claims, hashes, conflicts, and source references across restart; 30 server tests passed |
| Q2-04 untrusted extraction | Complete | Codex | Fixed trusted extraction task, bounded visible text, script/style exclusion, content hash; 32 server tests passed |
| Q2-05 routing receipt | Complete | Codex | Preview exposes provider/model/scope/hashes without source text; confirmed receipt persists; 34 server tests passed |
| Q2-06 research completeness | Complete | Codex | Bounded source/byte/time plan records diversity, contradiction search, saturation, and gaps; 36 server tests passed |
| Q2-07 security/provenance suite | Complete | Codex | Fixture-only end-to-end security/receipt journey, including unsafe redirect rejection; 38 server tests passed |
| Gate 2 safe research/provenance | Complete | Codex | Local safe retrieval, untrusted isolation, consent receipts, persistence, and completeness reporting verified; no live research claimed |
| Q3-01 target intake API | Complete | Codex | Resolution-grade `TargetContract` persists/retrieves; ambiguous target data rejects; 40 server tests passed |
| Q3-02 research-review API | Complete | Codex | Claims show source/conflict/classification and require explicit per-target include/exclude review; 41 server tests passed |
| Q3-03 candidate graph fixture | Complete | Codex | Explicitly labeled deterministic 15-factor, three-hop, proposed-only graph fixture; active graph untouched; 42 server tests passed |
| Q3-04 distribution elicitation | Complete | Codex | Median/P90 quantiles transparently derive Normal or LogNormal parameters, statistics, and a limitation-bearing receipt; 44 server tests passed |
| Q3-05 relationship authoring | Complete | Codex | Proposed-only relationship API validates contracts and returns unresolved-dependence warnings without graph mutation; 46 server tests passed |
| Q3-06 shadow simulation | Complete | Codex | Active/candidate paired runs simulate in memory and prove active graph immutability; 48 server tests passed |
| Q3-07 version-bound approval | Complete | Codex | Exact binding hash required; graph edits invalidate pending candidate; approved overrides apply atomically; 50 server tests and 72 kernel tests passed |
| Q3-08 authoring journey | Complete | Codex | Fixture-only target→review→15-factor→elicitation→shadow→approval API journey; 51 server tests and 72 kernel tests passed |
| Gate 3 generalized authoring | Complete | Codex | API supports reviewed, proposed-only, version-bound generalized authoring; fixture-only until live research is consented |
| Define autonomous hybrid GUI goal | Complete | Codex | `GOAL_GUI.md` specifies Build, Run, Edit, and Monitor workflows plus evidence-gated autonomous completion |
| Q4-01 shared UI package | Complete | Codex | `@lns/ui-shared` exports typed lifecycle/client boundaries and deterministic fixtures; both apps consume the shared lifecycle; its current 23-test Vitest 4 suite/type build, zero-vulnerability package audit, 55-server-test catalog/persistence coverage, and both consumer production builds passed on 2026-07-28 |
| Workspace project persistence | Complete | Codex | Typed SQLite project, draft, scenario, and fixture-monitoring metadata persists across restart; stale bases return 409, scenario operations preserve active graph state, and draft creation atomically records the draft plus Refine stage/base version (3 focused tests; 55 server tests, 2026-07-28) |
| Shared Project Home and workspace shell | Complete | Codex | Accessible New/Run/Edit/Monitor actions, project truth cards, lifecycle guard, and visible target/version/freshness/fixture state are implemented in shared components. The lifecycle rail now names and semantically marks the persisted project's current stage. Project Home loads persisted projects plus their target-contract question/horizon and provides explicit operator selection, so existing-model actions bind the chosen project ID. New project persists an Idea-stage workspace before target intake. The canonical app opens through this shared router, with distinct build/run/edit/monitor workspace shells. Server-backed local/live evidence classifications are typed (57 shared tests, shared type build, and canonical production build, 2026-07-28). Full run/edit/monitor controls and receipts remain. |
| Existing-model Run mode | In progress | Codex | Run mode calls the authoritative graph simulation endpoint only for the selected project's approved graph and renders its snapshot ID, graph version, seed, sample count, freshness receipt, per-node mean/median/p05/p95/standard-deviation summaries, and the server-computed multi-seed/multi-sample stability diagnostic with its no-accuracy limitation. Successful run metadata persists separately on the project and Project Home shows its snapshot ID; no structural edits occur. Named scenarios load visibly beside Run and are explicitly labeled not applied to the approved run until scenario simulation exists (66 shared tests, 3 focused server tests, and shared type build, 2026-07-28). Scenario application, prior-run comparison, sensitivity, and durable receipt history remain. |
| Existing-model Monitor mode | In progress | Codex | Monitor mode loads/saves project-scoped cadence, freshness threshold, and fixture/local/live mode through the persisted workspace API. Fixture events are explicitly labeled non-live; acknowledgement persists a timestamped receipt without mutating model structure. Inspect now shows an immutable event-detail surface and Branch to edit routes to the draft-only Edit workflow. Re-run action and external polling remain (56 shared tests, shared type build, and 3 focused server tests, 2026-07-28). |
| Existing-model Edit mode | In progress | Codex | Edit mode refuses to start without an approved graph version, otherwise atomically creates a typed server-persisted draft and records the persisted project stage as Refine with that draft base version before any candidate work. It renders the selected approved graph read-only as a target-centered map with filters, keyboard navigation, zoom/pan, textual alternative, selected-factor path tracing, and a plain-language edge list; relationship type/units/lag absent from this stored graph are explicitly marked not recorded. It reloads and labels durable draft history as non-active. Project-scoped approval now persists the confirmed graph version and Decide lifecycle state after the graph store accepts the exact binding; the active structure remains unchanged until that separate approval. Reversible structural refinement commands and candidate revision deltas remain (68 shared tests; 57 server tests; shared/canonical type builds; 5 E2E tests, 2026-07-28). |
| Candidate revision persistence | In progress | Codex | The workspace API persists typed, non-active revisions with exact base graph version, numeric parameter overrides, and validated active/excluded node- and existing-dependency-state overrides. Stale bases, unknown node IDs, and unknown relationship IDs reject; revisions survive restart, and saving one leaves the active graph unchanged. Edit now lists existing revisions and saves just-compared numeric overrides or explicitly staged node/dependency deltas through that API; structural deltas are visibly non-simulatable and non-approvable pending a separate structural-proposal contract (7 focused workspace tests; 70 shared tests; shared type build, 2026-07-28). New-node/new-relationship deltas, restore/undo, and full revision validation remain. |
| Active-versus-candidate comparison | In progress | Codex | Existing-model Edit loads the selected approved graph and stages/removes graph-derived numeric parameter changes as a reversible local candidate set before an in-memory shadow comparison. It renders active/candidate mean and median, a directed factor-to-target affected path, active graph immutability, and the limitation that a shift is structural impact rather than evidence of forecast improvement. A compared set can now persist as a separate version-bound candidate revision or be saved as the review/approval proposal; both paths remain distinct. The interaction is graph-generic and browser-fixture exercised, but does not provide structural graph deltas or model/ensemble comparison (65 shared tests; shared/canonical type builds; 5 E2E tests; 57 server tests, 2026-07-28). |
| Version-bound approval view | In progress | Codex | After a shadow result, Edit can persist the identical override as a server candidate proposal, show its exact graph version and binding hash, require a non-empty operator identity and explicit binding-review acknowledgment, then display the server approval receipt/new graph version and persisted project Decide lifecycle/version. The confirmed project payload immediately updates the workspace lifecycle rail. The graph apply is atomic in the graph store; the project lifecycle write is a subsequent verified workspace-store update. Full proposal diff/path impact and complete run-receipt analysis remain (62 shared tests; 56 server tests; shared/canonical type builds; 5 E2E tests, 2026-07-28). |
| Idea/Vet component foundation | In progress | Codex | Accessible target form distinguishes the Neodymium private-investor retail series, blocks incomplete contracts, collects every authoritative target-contract field with timezone-aware submission values, and has a reusable project-persistence wrapper that reports success/failure without attaching a failed target. In canonical Vet, Pause/Resume works, action-specific discovery entries and planned supply/demand/substitution/recycling/future-use/regime/external-driver categories persist as distinct brief records, and the operator can persist either a local-only preference or an explicit OpenRouter routing-consent receipt that names the limited future scope and states no content was sent. Proceed now does not itself grant provider consent (72 shared tests, shared type build, and 5 E2E tests, 2026-07-28). Provider execution and live research remain. |
| Build target-to-map transition | In progress | Codex | After persisted target intake succeeds, its project stage is durably set to Vet. Proceed now persists Map before showing the operator-triggered candidate-map step. That step loads only the explicit deterministic fixture endpoint and labels the graph fixture/not-live/proposal-only; no candidate becomes active. The canonical browser fixture contains 15 factors and one visible three-hop proposal path. Consented research, live proposal routing, and refinement remain (57 shared tests, shared type build, and 5 E2E tests, 2026-07-28). |
| Canonical viewport smoke evidence | In progress | Codex | Fixture-intercepted Playwright checks pass at `1440x900` and `1280x800` for Project Home → New project → target intake → durable Vet research categories and no-content-sent routing consent → explicit 15-factor fixture candidate map. The canonical suite also proves Monitor → read-only event inspection → draft-only Edit branch. Screenshots are saved in `docs/verification/gui/`. These cases do not prove live research or complete Run/Edit/Monitor journeys (5 E2E tests, 2026-07-28). |
| Shared graph and warning foundations | In progress | Codex | The fixture candidate map reached from the canonical Build route renders a target-centered, keyboard-selectable visual graph with deterministic no-default-overlap hop placement, search, state and hop filtering, drag pan, bounded zoom, fit-to-view, selected three-hop relationship trace, non-color selection status, and a full textual alternative. The canonical Map route now renders fixture-supplied limitations in a non-color Warning Center above the graph; a reusable relationship inspector exposes/editably stages type, units, lag, evidence provenance, and state (56 shared tests, shared type build, and 5 E2E tests, 2026-07-28). This remains fixture-only; richer relationship paths, server-backed edits, and evidence linking remain. |
| Distribution inspector foundation | In progress | Codex | The reusable inspector renders all eight canonical families with a labeled curve preview, plain-language fit, support, canonical parameters, as-of/provenance state, and optional mean/median/central interval values. In Edit it now binds to the selected persisted graph factor’s actual family and parameters; missing graph-node as-of/provenance remains explicit. It does not yet provide factor-bound derived values, elicitation, or quantitative revision persistence (61 shared tests, shared/canonical type builds, and 5 E2E tests, 2026-07-28). |
| Relationship inspector foundation | In progress | Codex | The reusable draft-only inspector now exposes editable/reviewable relationship type, sign, transform, coefficient distribution, source/target units, lag and lag unit, validity range, evidence links, warnings, and proposal state while stating that active structure is unchanged until separate approval (54 shared tests and shared/canonical type builds, 2026-07-28). It is not yet wired to persisted candidate revisions in the canonical workflow. |
| Evidence review foundation | In progress | Codex | The canonical Vet stage now mounts a read-only evidence drawer when the client is available. It loads per-target claims, source publisher, conflict IDs, and review status; Include/Exclude sends the server's explicit human-review decision and updates only the review state. Fixture journeys show the empty-claims state (57 shared tests, shared/canonical type builds, and 5 E2E tests, 2026-07-28). Live research, source capture, and evidence-to-graph linking remain. |
| Fixture workspace composition | Complete (fixture-only) | Codex | Shared fixture workspace composes target intake, graph, and warning surfaces inside the workspace shell (focused composition test and type build, 2026-07-28). It is not a substitute for the required persisted/live workflow. |
| Gate 4 visual workspace | Pending | Unassigned | Depends on Gate 3 API/contracts |
| Gate 5 Neodymium acceptance | Pending | Unassigned | Depends on Gates 1–4 |
| Gate 6 gas adapter | Pending | Unassigned | Depends on shared workspace |
| Gate 7 CI/handoff | Pending | Unassigned | Final gate |

## Decision Links

- Product/domain decisions: `DECISIONS.md` D-001 through D-005
- Modeling decisions: D-006 through D-010, D-016, D-017
- Approval/research decisions: D-011 through D-015
- UI/demo decisions: D-018, D-019
- Workflow/autonomy/ensemble decisions: D-021 through D-024

## Current Milestone

**Gate 4 — Prediction Workspace**

Gate 3 exited on 2026-07-28: fixture-tested target intake, evidence review, broad candidate proposal, distribution elicitation, relationship validation, shadow simulation, and hash-bound approval are verified. The next exit is the shared visual workspace that makes this reviewable logic usable.

## Next Actions

1. Complete Q4-02: target-intake and research-consent flow using the shared client and fixture labels.
2. Complete Q4-03: target-centered hop graph with deterministic layout and textual alternative.
3. Keep fixture proposals clearly labeled until live research is consented and completed.

## Blockers

No blocker to Gate 0 contract work.

Potential future blocker:

- A reproducible and legally usable Neodymium historical series is not yet confirmed. This blocks claims of historical multi-hop lift, not contract/kernel/UI development.

## Questions for User

None currently blocking. Pending technical decisions have safe defaults in `DECISIONS.md`.
