# GOAL.md

/goal

## OUTCOME

Evolve Living Node Swarm into a domain-general, localhost prediction-construction product in which a user can define a resolvable target, conduct consented and cited research, review at least 15 ranked primary/secondary/tertiary candidate factors, inspect and revise every distribution and relationship, approve an explicit graph version, run a reproducible Monte Carlo simulation, and visually understand exactly why the target distribution moved.

Gas/Kalshi remains a real demonstration preset. It must use the same generalized contracts and visual workspace rather than becoming a separate product.

## PRODUCT THESIS

The differentiator is not an opaque prediction score. It is the visible and auditable construction of explicit probabilistic nodes, especially indirect variables several hops away from the target.

COVID-era resource diversion is the canonical motif: a shock can redirect transport, labor, container, refining, energy, or production capacity and thereby create delayed effects in apparently unrelated industries. Living Node Swarm must make those pathways visible, testable, editable, and reversible.

This thesis is a hypothesis, not a performance claim:

- A deeper graph does not automatically produce a better forecast.
- Monte Carlo propagates declared assumptions; it does not turn unsupported assumptions into evidence.
- A visual dependency is not automatically causal.
- A changed distribution is structural impact, not improvement, until it is scored or compared without leakage.

## USER VALUE

The operator receives:

1. A prediction with an exact resolution contract rather than an ambiguous question.
2. A researched map of direct and non-obvious factors, with evidence and unknowns.
3. Human control over which factors and relationships affect the active model.
4. Full distributional output rather than a single point estimate.
5. A visual explanation of paths, assumptions, uncertainty, provenance, and before/after effects.
6. A reproducible receipt that another operator can inspect and rerun.

## CANONICAL ACCEPTANCE SCENARIO — NEODYMIUM, ONE YEAR

The product must support the following complete user journey:

1. The user asks: **“Predict the Neodymium price in one year.”**
2. The app asks which exact price series will resolve the prediction. The user supplies `https://strategicmetalsinvest.com/neodymium-prices/`.
3. The app identifies that the page's displayed value is a private-investor retail price and does not silently conflate it with bulk, spot, oxide, metal, magnet-alloy, or FOB-China series.
4. The app requires confirmation of product/grade, purity if applicable, price basis, geography/incoterm, currency, unit, forecast origin, target date, observation-time rule, missing-source fallback, and revision policy.
5. The app asks for additional sources, private background thoughts, and explicit permission before web research or cloud-model routing.
6. The research workflow explores supply, demand, future uses, substitution, recycling, primary/secondary/tertiary effects, regime risks, and non-Neodymium drivers such as weather, wars, chips, energy, freight, FX, and replacement technologies.
7. Research produces claim-level citations, source conflicts, retrieval times, content hashes, contradictions, unknowns, and a bounded research-completeness report.
8. The app proposes at least 15 distinct candidate factors ranked by evidence, expected relevance, observability, uncertainty, and non-duplication. At least one proposed path must extend to three hops.
9. Each proposed node shows its registered distribution, elicitation method, support, intuitive quantiles, derived mean/median, dispersion, units, as-of time, evidence, confidence rationale, hop distance, and unknowns.
10. Each proposed relationship shows its type, transform, sign, lag, source/target units, coefficient units, provenance, and validity range.
11. The operator can include/exclude a factor, edit assumptions, add missing factors, request alternatives, and change a numerical relationship only through an explicit scenario/calibration control.
12. The app warns about duplicated mechanisms, correlated factors, unit mismatches, unsupported evidence, and unresolved dependence.
13. The operator reviews an active-versus-candidate comparison and approves a specific graph version.
14. The simulation produces a target distribution, intervals, scenario/tail views, sensitivity and ablation reports, freshness, convergence information, and a complete provenance receipt.
15. The system labels the result as a forecast, scenario analysis, or hypothesis-only run according to the evidence and validation actually available.

Generating 15 candidates never requires activating 15 factors. Candidate breadth is an ideation gate; active structure remains evidence-driven.

## REQUIRED CONTRACTS

The following contracts must be designed, tested, persisted, and exposed through the API/UI before the full authoring workflow:

### TargetContract

- target node and human-readable question
- forecast origin and horizon/target date
- exact resolution oracle
- product, grade/purity, price basis, geography/incoterm
- currency, units, timezone, observation-time rule
- missing-source fallback and revision policy
- source receipt and immutable contract version

### DistributionSpec

- canonical family ID and version
- canonical parameterization
- natural support and optional validated truncation
- intuitive elicitation fields
- derived mean, median, variance, and quantiles
- parameter provenance and elicitation method
- as-of time and uncertainty/confidence rationale

### EvidenceClaim and SourceReceipt

- claim text/normalized value and units
- publisher, original source, canonical URL, retrieval time
- content hash or permitted snapshot reference
- claim-level citation/pointer
- source type, commercial/conflict disclosure, corroboration
- user-provided/retrieved/model-inferred/unknown classification
- model/provider routing receipt where applicable

### RelationshipContract

- parent and child node IDs
- relationship type: `causal_hypothesis`, `accounting_identity`, `observed_relation`, `proxy_correlation`, or `scenario_assumption`
- transform/formula and version
- sign, lag, coefficient parameters and coefficient units
- source/target units and dimensional validation
- evidence/provenance, validity range, confidence rationale
- active/proposed state and approval receipt

### GraphProposal and ApprovalReceipt

- complete candidate graph version
- added/removed/changed nodes and relationships
- validation results and unresolved warnings
- active-versus-candidate simulation IDs
- operator decision and timestamp
- no implicit activation or wiring

### SimulationRun

- graph and contract versions
- seed, sample count, engine version, start/finish time
- convergence/stability diagnostics
- output samples/quantiles and freshness
- sensitivity/ablation method and limitations
- provenance chain and run classification

## INITIAL DISTRIBUTION REGISTRY

Freeze these canonical IDs and parameterizations:

| Canonical ID | UI label | Parameters | Natural support |
|---|---|---|---|
| `Normal` | Normal / Gaussian | `loc`, `scale` | real |
| `LogNormal` | Log-normal | `log_loc`, `log_scale` | positive |
| `Beta` | Beta | `alpha`, `beta` | `[0,1]` |
| `Poisson` | Poisson | `rate` | non-negative integers |
| `NegativeBinomial` | Negative binomial | `mean`, `dispersion` | non-negative integers |
| `Gamma` | Gamma | `shape`, `scale` | positive |
| `StudentT` | Student-t | `df`, `loc`, `scale` | real |
| `Deterministic` | Fixed value | `value` | one value |

The registry is the single source of truth for validation, sampling, derived statistics, UI fields, descriptions, aliases, and AI prompt guidance. The UI should elicit intuitive support/quantiles where possible and derive canonical parameters rather than asking users to enter unfamiliar raw parameters blindly.

An explicit scenario/regime layer may combine separate simulation branches for war, export-control, mine-closure, or substitution regimes. It must not pretend that a heavy-tailed distribution alone represents a discrete regime. `Empirical`, arbitrary custom distributions, general copulas, and same-time cyclic simulation remain deferred unless a later approved decision brings them into scope.

## PHASE GATES

### Gate 0 — Contracts and design

- Approve the contracts above, shared UI architecture, distribution registry, safe-research boundary, time semantics, dependence policy, and scoring plan.
- No broad feature implementation before this gate passes.

### Gate 1 — Scientific kernel

- Implement registry-backed validation/sampling.
- Enforce support and dimensional validity.
- Add forecast origin/horizon and explicit lags using a time-expanded DAG.
- Represent correlated causes initially through explicit shared latent parents; unresolved correlation is a visible warning.
- Add reproducibility and convergence/stability checks.

### Gate 2 — Research and provenance

- Implement consented research with safe URL handling.
- Isolate retrieved content as untrusted data.
- Persist claim-level evidence and source receipts.
- Bound research by source diversity, contradiction search, saturation, time/cost budget, and visible gaps.

### Gate 3 — Generalized authoring

- Build target intake, research review, ranked candidate generation, distribution elicitation, relationship review, validation, and explicit approval.
- Proposed nodes and relationships never affect the active graph.

### Gate 4 — Visual trust product

- Make the shared Prediction Workspace the canonical UI.
- Provide target-centered hop layout, zoom/pan, search/filter, no-overlap defaults, curve/parameter inspector, evidence drawer, active/candidate comparison, path explanation, and run receipts.
- Status must not rely on color alone.

### Gate 5 — Neodymium acceptance and evaluation

- Complete the canonical journey.
- Preserve a resolution-grade target contract and evidence receipts.
- Run a simple baseline, direct-only graph, and multi-hop graph comparison on leakage-safe historical data when suitable data is available.
- Score continuous outcomes with predeclared metrics such as CRPS, interval coverage, and calibration diagnostics.
- If suitable history is unavailable, report that limitation and do not claim multi-hop lift.

### Gate 6 — Gas demonstration adapter

- Rebuild gas as a preset/adapter on the shared contracts and components.
- Keep Kalshi data/trading visibly separate and disabled by default.
- Do not place live trades during this goal.
- Remove generalized reliance on bulk “activate all + weight 1.0” behavior.

## PROOF OF DONE

1. All required contracts exist as typed, persisted, versioned objects with unit/API tests.
2. All eight distribution families pass parameter, support, seeded-sampling, derived-statistic, and invalid-input tests.
3. Invalid units, invalid lags, cycles, unsupported bounds, and invalid dependence declarations fail clearly.
4. A proposed graph does not change the active simulation until a valid approval receipt exists.
5. Safe-research tests cover private-address blocking, redirect checks, time/size/type limits, prompt-injection isolation, secret isolation, source hashing, and claim provenance.
6. The Neodymium workflow produces at least 15 ranked candidates, one three-hop path, explicit exclusions, warnings, an approved graph version, and a reproducible simulation receipt.
7. A 15–30 node graph is usable at `1440x900` and `1280x800`: no default node overlap; target and hop layers are legible; zoom, pan, search, filters, keyboard focus, and non-color statuses work.
8. Active-versus-candidate comparison identifies affected paths and output changes without calling them improvements unless scored evidence exists.
9. A predeclared continuous-target evaluation compares baseline, direct-only, and multi-hop variants when data permits; mixed or negative results remain visible.
10. Gas runs through the shared workspace/preset architecture, and real-money controls remain isolated and inactive by default.
11. Existing graph, API, gas, and trade-safety tests do not regress.
12. Documentation and screenshots distinguish implemented, verified, limited, and deferred capabilities.

## REQUIRED VERIFICATION

Run all commands from the repository root unless a `cd` is shown:

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui_shared && npm test
cd packages/lns_ui && npm run build && npm run test:e2e
cd packages/lns_gas_demo && npm run build
git diff --check
```

The future implementation may adjust package names only through a recorded decision. Verification output, Neodymium acceptance receipts, visual evidence, and evaluation reports must be saved under `docs/verification/`.

## SCOPE

### Modify

- `packages/lns_kernel/`
- `packages/lns_server/`
- `packages/lns_ui/`
- `packages/lns_gas_demo/`
- new shared UI package under `packages/lns_ui_shared/`
- `scripts/`, `.github/workflows/`, relevant configuration
- tests, `docs/`, and project control Markdown files

### Read/reference

- `01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md`
- `docs/architecture/2026-07-27-living-node-swarm-ironclad.md`
- existing plans, verification logs, handoffs, and integration docs
- `LOOPHOLE_REVIEW.md`, `RISK_NOTES.md`, and `REPO_MAP.md`

### Do not modify or expose

- `.env`, credentials, private keys, user accounts, or local database contents
- `agno/` third-party reference tree except read-only inspection
- live Kalshi account state
- unrelated user changes or untracked files

## SAFETY / PROVENANCE

- User-supplied URLs are untrusted. Permit only HTTP(S), block private/local destinations and unsafe redirects, and enforce size/time/content limits.
- Retrieved pages are evidence data, never trusted model instructions.
- Show what user content and evidence will leave the Mac before cloud-model routing.
- Never send secrets, credentials, private keys, or unrelated local content to an external model.
- Record publisher conflicts, duplicated upstream claims, contradictions, retrieval time, and content hash.
- Separate facts, sourced estimates, model inferences, user assumptions, scenarios, and unknowns.
- Use “model dependency” unless causal evidence supports stronger language.
- Do not provide investment advice or claim predictive superiority without evidence.

## UX STANDARDS

- The visual graph is the trust surface, not decoration.
- Every node and relationship must be inspectable without reading raw JSON.
- Every number must expose units, as-of time, origin, and whether it was elicited or derived.
- Proposed, active, stale, unsupported, failed, and resolved states must be textually distinguishable.
- The operator can always answer: “What changed?”, “Why?”, “Which paths?”, “Based on what?”, and “What remains uncertain?”
- Advanced statistical language must have plain-language explanations.
- Destructive or high-impact actions require explicit review; generalized workflows cannot silently bulk-activate AI structure.

## CONSTRAINTS

- Localhost, single-user, non-clinical.
- Keep current public behavior compatible where feasible; version and document intentional contract changes.
- Use test-driven, small-batch implementation.
- Do not weaken tests or label fixtures/synthetic evidence as live.
- Do not introduce a dependency without a recorded need and verification plan.
- Preserve honest freshness and graph-version semantics.
- Base app owns generalized behavior; demos use shared contracts/components.
- Performance targets must be measured before being claimed. Long research and simulation steps require progress and cancellation UI.

## ITERATION

1. Read the project truth files before editing.
2. Work one gate at a time in `TASK_QUEUE.md` order.
3. Write the failing test before implementation where practical.
4. Run the nearest verification after each atomic change.
5. Update `PROGRESS.md` with commands, evidence, remaining risks, and assumptions.
6. Record consequential product/architecture decisions in `DECISIONS.md`.
7. After each gate, run an adversarial review and do not proceed until its proof passes.
8. Preserve failed or contaminated evidence separately; never relabel it as success.

## STOP

Pause and summarize when:

- the target oracle cannot be made resolution-grade;
- the required data cannot be used legally or reproducibly;
- safe research or cloud routing would expose secrets/sensitive content;
- a new dependency or architecture change materially expands scope;
- time/dependence/scoring semantics require an unrecorded product decision;
- the same verification failure persists after three distinct mitigation attempts;
- completion would require live trading, production deployment, or destructive action;
- evidence does not support a requested performance claim.

## COMPLETE

Mark this goal complete only when every phase gate and every `PROOF OF DONE` item has current evidence, all required verification commands pass, `docs/verification/` contains the acceptance receipts and visual/evaluation evidence, `PROGRESS.md` has no required task remaining, and limitations/deferred work are stated without inflated claims.

## ASSUMPTIONS

- The user values transparency and inspectability over one-click opaque automation.
- AI is an authoring/research assistant; the kernel remains the authoritative calculator.
- Human review is required before proposed structure affects an active forecast.
- Suitable Neodymium historical data may be limited; absence of data is a reportable limitation, not permission to fabricate evidence.
- The initial release supports time-expanded acyclic graphs, not arbitrary dynamic feedback systems.

## OUT OF SCOPE / DEFERRED

- Multi-user or cloud deployment
- Clinical/medical prediction
- Autonomous investment decisions or live trading
- General same-time cyclic/feedback simulation
- Arbitrary custom distributions
- General empirical-distribution import
- Full copula/dependence editor
- Automated self-learning or automatic motif promotion
- Claims of competitor lift without a predeclared comparative evaluation
