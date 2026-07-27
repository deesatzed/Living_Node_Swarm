# IMPLEMENT.md

## Implementation Mission

Build the generalized Prediction Workspace and scientific substrate defined by `GOAL.md`, then adapt the gas demo to prove reuse. Work gate-by-gate; do not begin with cosmetic gas UI changes.

## Recommended Agent Workflow

| Role | Responsibility | Required output |
|---|---|---|
| Orchestrator | Reads truth files, selects one queue item, protects scope, adjudicates reviews | Updated plan/progress and final decision |
| Implementer | Writes failing tests and the minimal scoped implementation | Focused patch and test output |
| Reviewer | Reviews contracts, scientific semantics, security, UX, and regressions | Accepted/rejected/needs-investigation findings |
| Tester | Runs focused and gate-level verification independently | Commands, outputs, artifacts, failures |

Roles may be separate passes by one agent. Delegation is optional and must remain bounded.

## Upfront Repository Reconnaissance

Current verified baseline:

- Python kernel with SQLite graph/event/snapshot persistence and NumPy Monte Carlo.
- Four families: `Normal`, `LogNormal`, `Beta`, `Deterministic`.
- Static acyclic dependency graph.
- Relationship transforms: `affine`, `sum_parents`, `mean_parents`.
- FastAPI server with OpenRouter proposals and gas/Kalshi endpoints.
- General React/Vite UI and separate gas React/Vite UI.
- 20 kernel tests and 16 server tests pass.
- Both UI production builds pass.
- No research service, source ledger, time model, dimension system, correlation model, scoring for continuous targets, shared UI package, browser tests, or CI.

Read before implementation:

- `GOAL.md`
- `STANDARDS.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `TASK_QUEUE.md`
- `REPO_MAP.md`
- `RISK_NOTES.md`
- `LOOPHOLE_REVIEW.md`
- `01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md`
- `docs/architecture/2026-07-27-living-node-swarm-ironclad.md`

## Clarification Questions That Would Have Been Ideal

These have been resolved by user direction or documented assumptions:

| Question | Resolution |
|---|---|
| Is gas the product boundary? | No. Gas is one real demonstration preset. |
| What is the product's key differentiator? | Extensive explicit node construction, especially second-/third-order dependencies, plus visual inspectability. |
| What is the canonical general example? | One-year Neodymium price forecast with a user-supplied monitoring source. |
| How many candidate factors? | At least 15 ranked candidates; activation remains evidence-driven. |
| Which initial distributions? | Eight registry families recorded in `GOAL.md` and `DECISIONS.md`. |
| Should users control factors? | Yes: include/exclude, revise assumptions, add factors, and edit validated relationship parameters. |
| Is the visual secondary? | No. The visual explanation is the trust and sales surface. |

## Architecture

### Kernel

Add contract and registry modules while preserving existing package boundaries:

```text
packages/lns_kernel/src/lns_kernel/
  contracts.py
  distributions.py
  dimensions.py
  temporal.py
  sensitivity.py
  scoring.py
  models.py
  ensemble.py
  validation.py
  store.py
```

The kernel remains provider-agnostic. Existing serialized nodes receive compatible defaults and an explicit schema version.

### Server

Add bounded research and authoring orchestration:

```text
packages/lns_server/src/lns_server/
  research.py
  url_safety.py
  evidence_store.py
  authoring.py
  prompt_contracts.py
  app.py
```

No source content is trusted as instruction. Provider calls receive only the approved payload.

### Web

Create `packages/lns_ui_shared/` as a private local package containing:

- canonical API types/client;
- Prediction Workspace shell;
- target intake;
- hop-layer graph;
- node/relationship inspectors;
- distribution forms/curves;
- evidence drawer;
- active/candidate comparison;
- run receipt and warnings.

`lns_ui` becomes the canonical application. `lns_gas_demo` becomes a thin preset/adapter consuming the same shared package.

## Architecture Decisions Needed Before Each Gate

| Gate | Decision |
|---|---|
| 0 | Contract schemas, canonical names, migration/version policy |
| 1 | Dimension representation, lag/time expansion, convergence definition |
| 2 | Retrieval library, content extraction/storage boundary, provider payload receipt |
| 3 | Candidate ranking and duplicate/overlap method |
| 4 | Graph layout library and shared-package integration |
| 5 | Neodymium oracle/history availability, continuous scoring metrics, sensitivity method |
| 6 | Gas preset API and removal/isolation of bulk activation/trading controls |

## Implementation Phases

### Phase 0 — Freeze contracts

Deliver:

- Pydantic contracts and JSON examples.
- Migration compatibility plan.
- API schemas for target/evidence/relationship/proposal/approval/run.
- Design report under `docs/plans/`.

Exit:

- Contract tests fail before implementation and pass afterward.
- No ambiguity remains around price basis, edge type, units, lag, or approval version.

### Phase 1 — Distribution registry and scientific kernel

Deliver:

- Eight-family registry.
- Validation, sampling, derived-statistics, support enforcement.
- Dimension validation.
- Target/horizon and time-expanded lags.
- Shared-latent dependence representation/warnings.
- convergence/stability report.

Exit:

- Unit/property tests pass for all families.
- Invalid scientific structures fail clearly.

### Phase 2 — Evidence and safe research

Deliver:

- Safe URL validator/fetcher.
- evidence/source persistence.
- claim extraction contract.
- research budget, contradiction search, saturation report.
- provider payload preview and receipt.

Exit:

- Security and provenance tests pass.
- A fixture-backed research flow preserves source-to-node traceability.

### Phase 3 — General authoring API

Deliver:

- target intake API.
- ranked candidate graph generation.
- distribution and relationship proposal APIs.
- duplicate/dependence/dimension warnings.
- active/candidate shadow simulation.
- version-bound approval.

Exit:

- Proposed structure cannot affect active simulation.
- A deterministic fixture creates 15 candidates and one three-hop path.

### Phase 4 — Prediction Workspace

Deliver:

- shared UI package.
- guided workflow.
- graph/inspector/evidence/comparison/run views.
- accessibility and responsive desktop behavior.

Exit:

- component tests and Playwright canonical flow pass.
- visual evidence shows a readable 15–30 node graph at both required viewports.

### Phase 5 — Neodymium acceptance and evaluation

Deliver:

- exact target contract for the user-selected series.
- consented live research run if credentials/provider access permit.
- preserved citations/receipts.
- candidate and approved graph.
- simulation, sensitivity, ablation, and continuous-outcome evaluation.

Exit:

- Acceptance packet exists under `docs/verification/neodymium/`.
- No unsupported accuracy/lift claim appears.

### Phase 6 — Gas adapter and regression

Deliver:

- gas preset using shared contracts/components.
- Kalshi panel isolated from authoring.
- real-money actions inactive by default.
- removal or hard gating of unsafe bulk activation semantics.

Exit:

- Gas workflow and all prior tests pass.
- General app contains no gas-specific product assumptions.

### Phase 7 — CI and handoff

Deliver:

- CI for Python tests, UI tests/builds, and diff checks.
- README/handoff aligned with verified state.
- final limitation and deferred-work report.

Exit:

- CI passes from a clean checkout.
- `GOAL.md` completion criteria are individually evidenced.

## Atomic Task Format

Every queue item must include:

```text
Task:
Purpose:
Files:
Preconditions:
Failing test:
Minimal implementation:
Verification command:
Expected result:
Evidence artifact:
Decision/update required:
```

Keep implementation tasks small enough for one focused patch and one nearest verification cycle.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Beautiful but invalid graph | Typed relationships, dimensions, time, dependence warnings, approval receipts |
| LLM false precision | Elicitation receipts, citations, intuitive quantiles, derived parameters |
| Research prompt injection/SSRF | Untrusted-data isolation and strict network validation |
| Fifteen-factor filler | Ranking, observability, duplicate checks, explicit exclusions |
| Correlated double counting | Shared latent parents and unresolved-dependence warnings |
| UI becomes overwhelming | Progressive disclosure, hop filters, search, inspector, tested viewports |
| Base/demo drift | Shared package and preset architecture |
| No proof of multi-hop value | Baseline/direct/multi-hop evaluation with honest negative results |
| Scope explosion | Gate exits and queue order; defer empirical/custom/copula/cycles |
| Existing database breakage | Schema versioning, defaults, migration/round-trip tests |

## Open Decisions

These do not block documentation but must be resolved at the named gate:

1. Select the exact global sensitivity/attribution method for correlated inputs.
2. Decide whether the first scenario layer is separate-run aggregation or a first-class mixture contract.
3. Confirm legally/reproducibly usable Neodymium historical data.
4. Select the graph layout/rendering library after a 30-node prototype.
5. Choose whether full retrieved page text is retained locally or only hashes, excerpts, and normalized claims.
