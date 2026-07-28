# TASK_QUEUE.md

## Queue Rules

1. Execute in dependency order.
2. One task equals one focused patch plus nearest verification.
3. Write or identify the failing test before implementation.
4. Update `PROGRESS.md` after verification.
5. Record any consequential deviation in `DECISIONS.md`.
6. Do not start a later gate while a required earlier gate is red.

## Gate 0 — Contracts

| ID | Task | Depends on | Acceptance | Status |
|---|---|---|---|---|
| Q0-01 | Add `TargetContract` model and validation tests | — | Exact oracle/basis/horizon/fallback fields validate; ambiguous targets fail | Complete (25 kernel tests, 2026-07-27) |
| Q0-02 | Add `DistributionSpec` and canonical schema version | Q0-01 | Registered family/parameters/provenance serialize and round-trip | Complete (4 focused tests, 34 kernel tests, 2026-07-27) |
| Q0-03 | Add `EvidenceClaim` and `SourceReceipt` | Q0-01 | Claim provenance, conflict, hash, classification round-trip | Complete (focused contract tests, 2026-07-27) |
| Q0-04 | Add `RelationshipContract` | Q0-01 | Type/units/lag/formula/provenance/state validate | Complete (focused contract tests, 2026-07-27) |
| Q0-05 | Add `GraphProposal`, `ApprovalReceipt`, `SimulationRun` | Q0-02–04 | Approval binds exact versions; run records complete provenance | Complete (focused contract tests, 2026-07-27) |
| Q0-06 | Extend graph/node schema compatibly | Q0-01–05 | Existing stored graph JSON loads with documented defaults | Complete (legacy fixture/default test, 2026-07-27) |
| Q0-07 | Expose contract JSON schemas and examples | Q0-01–06 | API/docs schemas match kernel contracts | Complete (`contract_json_schemas()` and canonical Neodymium doc, 2026-07-27) |

## Gate 1 — Scientific Kernel

| ID | Task | Depends on | Acceptance | Status |
|---|---|---|---|---|
| Q1-01 | Create distribution registry | Q0-02 | Eight canonical families and aliases defined once | Complete (5 focused tests, 42 kernel tests, 2026-07-27) |
| Q1-02 | Implement registry validation and derived statistics | Q1-01 | Invalid parameters/support fail; derived values match reference tolerances | Complete (6 focused tests, 48 kernel tests, 2026-07-27) |
| Q1-03 | Implement seeded sampling for all families | Q1-01 | Support, reproducibility, and approximate-moment tests pass | Complete (9 focused tests, 57 kernel tests, 2026-07-27) |
| Q1-04 | Migrate existing family parameter names | Q1-01–03 | Old graphs round-trip or migrate without silent semantic change | Complete (legacy round-trip/normalization tests, 60 kernel tests, 2026-07-27) |
| Q1-05 | Add dimension/unit validation | Q0-04 | Invalid affine/sum relationships fail before simulation | Complete (3 focused tests, 63 kernel tests, 2026-07-27) |
| Q1-06 | Add forecast origin/horizon and time-expanded lag validation | Q0-01, Q0-04 | Lagged paths work; same-time cycles still fail | Complete (3 focused tests, 66 kernel tests, 2026-07-27) |
| Q1-07 | Add shared-latent dependence warnings | Q0-04 | correlated/duplicate candidates surface unresolved warnings | Complete (3 focused tests, 69 kernel tests, 2026-07-27) |
| Q1-08 | Add convergence/stability diagnostics | Q1-03 | multi-seed/sample-size report saved with every run | Complete (persisted snapshot receipt test, 72 kernel tests, 2026-07-27) |
| Q1-09 | Add continuous scoring primitives | Q0-01 | CRPS/interval coverage tests pass on reference examples | Complete (2 focused tests, 71 kernel tests, 2026-07-27) |

## Gate 2 — Safe Research and Provenance

| ID | Task | Depends on | Acceptance | Status |
|---|---|---|---|---|
| Q2-01 | Implement URL safety validator | Q0-03 | private/reserved/metadata destinations and unsafe redirects fail | Complete (8 focused tests, 24 server tests, 2026-07-27) |
| Q2-02 | Implement bounded HTTP fetcher | Q2-01 | scheme/type/size/time/redirect controls tested | Complete (4 focused tests, 28 server tests, 2026-07-27) |
| Q2-03 | Implement evidence/source persistence | Q0-03 | receipts and claims survive restart and preserve hashes | Complete (restart/hash/conflict tests, 30 server tests, 2026-07-27) |
| Q2-04 | Implement untrusted-content extraction boundary | Q2-02 | page instructions cannot alter system/provider instructions | Complete (2 focused tests, 32 server tests, 2026-07-27) |
| Q2-05 | Implement provider payload preview and routing receipt | Q2-03–04 | user sees provider/model/data scope before send | Complete (preview/receipt persistence tests, 34 server tests, 2026-07-27) |
| Q2-06 | Implement bounded research plan | Q2-03–05 | source diversity, contradiction search, saturation, budget, gaps recorded | Complete (diversity/contradiction/saturation/budget tests, 36 server tests, 2026-07-27) |
| Q2-07 | Add research security/provenance suite | Q2-01–06 | all required attack/receipt cases pass | Complete (fixture-only end-to-end suite, 38 server tests, 2026-07-27) |

## Gate 3 — Generalized Authoring

| ID | Task | Depends on | Acceptance | Status |
|---|---|---|---|---|
| Q3-01 | Add target-intake API | Q0-07 | valid target stored; missing basis/horizon rejected | Complete (Neodymium target create/get and rejection tests, 40 server tests, 2026-07-27) |
| Q3-02 | Add research-review API | Q2-06 | user can accept/reject claims before model proposal | Complete (claim/source/conflict/review API test, 41 server tests, 2026-07-27) |
| Q3-03 | Add ranked candidate-graph proposal | Q1-01, Q2-06 | deterministic fixture yields 15 distinct candidates and a three-hop path | Complete (15-factor/three-hop fixture API test, 42 server tests, 2026-07-28) |
| Q3-04 | Add distribution elicitation/fit service | Q1-02 | quantiles map to valid family params with receipt | Complete (Normal/LogNormal median-P90 elicitation tests, 44 server tests, 2026-07-28) |
| Q3-05 | Add relationship proposal/validation | Q1-05–07 | units, lags, duplicates, dependence warnings returned | Complete (proposed-only validation/warning API tests, 46 server tests, 2026-07-28) |
| Q3-06 | Add shadow active-vs-candidate simulation | Q1-08, Q3-03–05 | candidate never mutates active graph; paired run IDs returned | Complete (paired-run/active-immutability API tests, 48 server tests, 2026-07-28) |
| Q3-07 | Add version-bound approval workflow | Q0-05, Q3-06 | edit invalidates approval; approved graph becomes active atomically | Complete (binding-hash/invalidation/atomic-apply tests, 50 server tests and 72 kernel tests, 2026-07-28) |
| Q3-08 | Add authoring API integration suite | Q3-01–07 | full fixture journey passes | Complete (fixture-only full authoring journey, 51 server tests and 72 kernel tests, 2026-07-28) |

## Gate 4 — Prediction Workspace

| ID | Task | Depends on | Acceptance | Status |
|---|---|---|---|---|
| Q4-00 | Freeze hybrid workflow and autonomous GUI completion contract | Gate 3 | `GOAL_GUI.md` covers Build, Run, Edit, Monitor, proof gates, safe defaults, and no intermediate user approval | Complete (2026-07-28) |
| Q4-01 | Scaffold private `lns_ui_shared` package | Q0-07 | both apps consume shared types/client | Complete (shared lifecycle/client boundary, deterministic fixtures, kernel-backed catalog API, and both consumer production builds passed, 2026-07-28) |
| Q4-02 | Build target-intake and research-consent flow | Q3-01–02, Q4-01 | accessible forms and error states tested | In progress — target intake, typed/persisted Vet actions, planned research categories, Pause/Resume, a restart-tested local-only no-egress preference, and an explicit no-content-sent provider-routing consent receipt are implemented; provider execution and complete review remain (2026-07-28) |
| Q4-03 | Build target-centered hop graph | Q3-03, Q4-01 | 30-node deterministic layout has no default overlap | In progress — canonical 15-factor fixture and selected approved Edit graph support no-default-overlap hop layers, pan/zoom/fit, filtering, keyboard selection, three-hop tracing, and textual alternative; richer relationship/evidence integration remains (2026-07-28) |
| Q4-04 | Build node distribution inspector | Q1-01–04, Q4-01 | eight family forms/curves/derived values tested | In progress — reusable eight-family inspector is bound to the selected persisted Edit graph node and now displays recorded units/support plus kernel-derived analytic values through a read-only statistics route; graph-node absence of as-of/provenance is explicit. Elicitation and quantitative revision persistence remain (2026-07-28) |
| Q4-05 | Build relationship inspector | Q3-05, Q4-01 | type, units, lag, evidence, state editable/reviewable | In progress — draft-only reusable inspector exposes complete relationship semantics and warnings. Canonical Edit can stage an existing dependency as a complete proposed kernel `RelationshipContract` with explicit type, transform, units, sign, lag, coefficient units, and evidence-claim IDs, then save it in an exact version-bound candidate revision after active-graph node and evidence-claim validation. The kernel contract now also supports typed finite coefficient parameters, though the current Edit controls do not yet elicit them. Its validation receipt explicitly distinguishes a clean warning set and is invalidated whenever the staged contract set changes, preventing stale warnings from being read as current. It never activates, simulates, or approves that structure (68 server tests; 95 shared tests; 6 fixture E2E tests; 78 kernel tests, 2026-07-28). Full inspector binding and structural application remain. |
| Q4-06 | Build evidence drawer and warning center | Q2-03, Q4-01 | claims/conflicts/unknowns trace to nodes | In progress — canonical Vet can load/review claims with source/conflict context and Map shows fixture limitations; graph-node traceability and live source capture remain (2026-07-28) |
| Q4-07 | Build active-vs-candidate and model/ensemble comparison | Q3-06, Q4-01 | paths and distribution changes visible; explicit two-model weighted ensemble is backend-owned and no false improvement label appears | In progress — Edit stages/removes a graph-derived multi-parameter local candidate set, runs it in memory with paired summaries/affected path/no-improvement limitation, and can persist exact numeric overrides or explicit active/excluded node/dependency-state deltas as non-active version-bound revisions. Run can execute a saved, version-bound numeric scenario and compare/save/reload two operator-specified graph versions as a backend-sampled weighted distribution mixture without a false improvement/recommendation label. A named exact-binding ensemble approval now persists and is read-only reviewable after refresh, without activating an ensemble or mutating a graph. Active graphs now persist relationship metadata as groundwork, but structural deltas are not simulated or approvable until a validated graph-proposal contract exists; new structural elements and restore/undo remain (2026-07-28) |
| Q4-08 | Build approval and run-receipt views | Q3-07, Q4-01 | version-bound review and receipts visible | In progress — Edit can save the exact shadow-compared override, display its server-issued binding hash/version, require a named operator plus explicit review acknowledgment, and display the approval receipt. Run displays bounded read-only persisted snapshot history, ensemble exact-binding approval receipt history, and explicit local finite-difference sensitivity rows/method limitations; project lifecycle/version synchronization and global analysis remain (2026-07-28) |
| Q4-09 | Add component/accessibility tests | Q4-02–08 | keyboard, labels, statuses, reduced motion pass | In progress — graph controls are label/status-covered and the visual graph is now keyboard-focusable with an explicit arrow-key instruction; canonical styles provide visible focus and reduced-motion overrides. Broader component and browser accessibility coverage remains (2026-07-28). |
| Q4-10 | Add Playwright canonical flow and screenshots | Q4-02–09 | full 15-factor journey passes at both viewports | In progress — fixture-intercepted canonical Build works at 1440x900 and 1280x800 through target/Vet/15-factor proposal map; Run covers its authoritative receipt plus saved ensemble exact-binding approval receipt, and Monitor→Edit draft branches are also exercised. Full approved Edit, structural proposal, and live-evidence journeys remain (6 E2E tests, 2026-07-28). |

## Gate 5 — Neodymium Acceptance

| ID | Task | Depends on | Acceptance | Status |
|---|---|---|---|---|
| Q5-01 | Confirm exact Neodymium target oracle | Q3-01 | private-investor retail basis explicitly confirmed and snapshotted | Pending |
| Q5-02 | Execute consented research packet | Q2-07, Q5-01 | claims, conflicts, contradictions, gaps preserved | Pending |
| Q5-03 | Generate/review 15+ candidate graph | Q3-08, Q5-02 | ranking, exclusions, three-hop path, warnings present | Pending |
| Q5-04 | Approve and simulate selected graph | Q4-10, Q5-03 | reproducible run and convergence receipt saved | Pending |
| Q5-05 | Run baseline/direct/multi-hop evaluation | Q1-09, Q5-04 | leakage-safe report or explicit data limitation saved | Pending |
| Q5-06 | Save acceptance and visual packet | Q5-01–05 | `docs/verification/neodymium/` complete | Pending |

## Gate 6 — Gas Adapter

| ID | Task | Depends on | Acceptance | Status |
|---|---|---|---|---|
| Q6-01 | Define gas preset contract | Q3-08 | gas-specific inputs map to general contracts | Pending |
| Q6-02 | Replace duplicate gas UI with shared workspace preset | Q4-10, Q6-01 | gas app uses shared components | Pending |
| Q6-03 | Isolate Kalshi panel and disable real-money actions by default | Q6-02 | no live action without separate explicit enable/review | In progress — Gas UI preserves preview and dry-run exits while hard-disabling live buy and live auto-sell controls; no UI source path sends `confirm: true` or `autoSell(true)` (gas production build, 2026-07-28). Separate execution enable/review surface remains intentionally absent. |
| Q6-04 | Remove/hard-gate bulk activation semantics | Q3-07, Q6-02 | invalid/unreviewed batch cannot activate | Pending |
| Q6-05 | Run gas regression suite | Q6-01–04 | existing and new gas tests/builds pass | Pending |

## Gate 7 — CI, Truthful Docs, Completion

| ID | Task | Depends on | Acceptance | Status |
|---|---|---|---|---|
| Q7-01 | Add CI workflows | Q1–Q6 complete | Python/UI/E2E/diff checks run from clean checkout | Pending |
| Q7-02 | Run release/reality audit | Q7-01 | claims match code and evidence | Pending |
| Q7-03 | Update README and handoff | Q7-02 | verified/current/limited/deferred states explicit | Pending |
| Q7-04 | Final completion review | Q7-01–03 | every `GOAL.md` proof item has current evidence | Pending |
