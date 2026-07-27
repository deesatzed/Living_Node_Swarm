# LOOPHOLE_REVIEW.md

## Strategy Under Review

`GOAL.md` proposes evolving Living Node Swarm into a domain-general, visually inspectable prediction-construction product. The canonical acceptance scenario is a one-year Neodymium price forecast built from a researched, human-reviewed graph with at least 15 candidate factors and explicit probability distributions. The gas/Kalshi application remains a secondary proof scenario.

This review tests whether the goal is specific enough to prevent a polished but scientifically weak or unresolvable implementation from being declared complete.

## Confidence Estimate Before Review

| Area | Confidence | Reason |
|---|---:|---|
| Product thesis | 85% | Explicit probabilistic nodes and visible multi-hop assumptions are a strong transparency thesis. |
| Neodymium user journey | 75% | The sequence is coherent, but target and evidence contracts are not resolution-grade. |
| Modeling semantics | 35% | Edge meaning, time, units, dependence, parameter elicitation, and attribution are under-specified. |
| Research/provenance | 40% | The desired states are named, but retrieval, source quality, snapshots, conflicts, and prompt-injection controls are missing. |
| UX completion contract | 50% | The visual direction is right, but the proof is subjective and can pass with an unreadable graph. |
| Verification strength | 30% | Existing tests prove the current shell; the goal lacks explicit scientific and end-to-end acceptance gates. |

## Loopholes Found

| Loophole | Severity | Why It Matters | Fix |
|---|---|---|---|
| The forecast target is not resolution-grade | Critical | “Neodymium price” can mean metal, oxide, magnet alloy, purity/grade, retail/private-investor, bulk, FOB China, or another benchmark. A result cannot be scored if the oracle changes or the basis is ambiguous. | Require an immutable TargetContract: exact series/product, grade/purity, geography/incoterm, currency, unit, observation timestamp rule, resolution date, missing-source fallback, revision policy, and source snapshot/hash. |
| The nominated source mixes price bases | Critical | The live page labels its displayed value as a private-investor retail price while discussing an FOB-China forecast. Treating those as one series would invalidate calibration and driver interpretation. | Store the retail series as the user-selected oracle only if explicitly confirmed; model wholesale/FOB series as separate nodes with basis/spread transforms. Flag source commercial interest. |
| A visual dependency is not necessarily causal | Critical | Calling every edge causal can turn LLM hypotheses or correlations into false causal claims. | Give edges an explicit type: causal hypothesis, accounting identity, correlation/proxy, scenario assumption, or observed relation. Use “model dependency” unless causal evidence is recorded. |
| Edge mathematics and units are undefined | Critical | Arbitrary weights can add counts, probabilities, percentages, and dollars. Current affine/sum/mean composition permits dimensionally meaningless forecasts. | Define a typed RelationshipContract with source/target units, transform formula, sign, lag, coefficient units, parameter provenance, validity domain, and validation tests. Reject dimensionally invalid graphs. |
| A one-year forecast has no time model | Critical | Static nodes do not represent forecast origin, horizon, seasonality, delays, inventories, policy expiry, or path-dependent shocks. | Add forecast origin/horizon to every graph and observation/as-of times to evidence. For v1 use a time-expanded DAG with explicit lags; defer arbitrary cyclic simulation. |
| COVID motifs require feedback and hysteresis, but the kernel requires a DAG | High | The premise names feedback and slow recovery, while current cycle checks reject loops. A few extra hops do not model hysteresis. | Represent feedback through time-indexed nodes or a defined state-transition model. State explicitly that same-time cycles are unsupported in the first release. |
| Root factors are implicitly independent | Critical | Commodity demand, FX, energy, freight, war, and policy factors are correlated. Independent sampling plus overlapping causal paths can materially exaggerate or suppress tail risk. | Add a dependence contract: shared latent causes and/or validated correlation groups/copulas. Require positive-semidefinite checks and show unresolved dependence warnings. |
| “At least 15” can reward filler | High | A model can satisfy the count by inventing weak, duplicated, or unobservable factors. More nodes can create false sophistication. | Require at least 15 distinct candidates, ranked by evidence, expected relevance, observability, and non-duplication. Active-node count remains evidence-driven. Record excluded candidates and reasons. |
| Distribution parameters can be fabricated with false precision | Critical | An LLM can output plausible means/ranges without data or calibration, and Monte Carlo will faithfully propagate invented numbers. | Define a ParameterElicitationReceipt: data-derived, literature-derived, transformed from elicited quantiles, or explicit expert judgment. Store method, citations, as-of date, sample size where applicable, uncertainty, and warnings. |
| Elicited and derived statistics can contradict | High | Asking independently for family, range, mean, and median can create an impossible parameter set. LogNormal parameters are especially easy to misunderstand because `mu` and `sigma` are in log space. | Elicit intuitive quantiles/support plus method; fit or derive canonical parameters. Show derived mean/median/range from the registered family and reject inconsistent inputs. |
| Distribution family IDs and parameterizations are not canonical | High | `Student-t`/`StudentT`, `Negative Binomial`/`NegativeBinomial`, and alternative parameterizations will drift across kernel, API, prompts, and UI. | Freeze canonical IDs and one parameterization per family in a shared registry, with aliases only at ingestion. |
| The selected family set lacks regime/scenario mixtures | High | War, export controls, mine closure, and substitution breakthroughs are discrete regimes. A Student-t tail is not always a defensible substitute for a mixture of states. | Add an explicit scenario/regime layer or defer regime-weighted forecasts and mark the limitation. Do not smuggle regimes into arbitrary heavy tails. |
| Support bounds are display-only in the current shell | High | Current nodes contain lower/upper support fields, but sampling does not enforce them. Negative prices or impossible percentages can appear. | The registry must enforce natural support and any node-specific truncation consistently in validation, sampling, and UI. |
| “Influence” editing is ambiguous | Critical | A user moving a weight may be changing a unit conversion, causal coefficient, subjective importance, or presentation ranking. Those are not interchangeable. | Separate inclusion/ranking controls from numerical relationship parameters. Label uncalibrated edits as scenario assumptions; require coefficient units and provenance. |
| “Contribution” and “sensitivity” have no method | High | Naive one-at-a-time changes or edge thickness can misattribute importance when variables interact or correlate. | Select and document methods for local sensitivity, global sensitivity, and candidate ablation. Display method, uncertainty, and correlated-input caveats. |
| Visual comparison can imply model improvement without scoring | High | A changed distribution is not evidence of a better prediction. More tail mass can look sophisticated while reducing accuracy. | Label comparisons as structural impact until resolved/backtested. “Improvement” requires a predeclared score and leakage-safe evidence. |
| Calibration is deferred too broadly | Critical | A prediction product can be functionally complete while never testing whether forecasts resolve well. Brier score is only appropriate for binary targets, not continuous prices. | Keep automated learning deferred, but require resolution storage and continuous-target scoring (for example CRPS, interval coverage, and calibration diagnostics) plus at least one leakage-safe hindcast before product-complete status. |
| No baseline or ablation proves multi-hop lift | High | The central competitive premise is that second-/third-order nodes add value, but the goal only proves that they change the output. | Require baseline versus direct-only versus multi-hop comparison on predeclared historical cases. Report mixed or negative results honestly. |
| Web research has no trust or security boundary | Critical | User-supplied URLs can trigger SSRF; retrieved pages can contain prompt injection; untrusted content can influence model instructions or exfiltrate context. | Allow only HTTP(S), block private/local addresses and redirects to them, cap size/time/type, sanitize content, treat page instructions as data, isolate secrets, and record retrieval receipts. |
| Cloud disclosure and sensitive-context handling are missing | High | User notes and retrieved content may be sent to OpenRouter. The operator needs to know what leaves the machine. | Add explicit provider routing/consent, redaction, a payload preview, and a rule that secrets/credentials are never included. |
| Source quality and conflicts are not scored | High | A vendor selling physical Neodymium has a commercial interest. Multiple pages can repeat the same upstream claim and appear independent. | Track publisher, original source, conflicts, claim-level citations, corroboration, duplication, retrieval time, and confidence rationale. |
| No durable evidence snapshot guarantees reproducibility | Critical | A web page may change before resolution, making the model inputs and target oracle unrecoverable. | Store normalized claim records plus content hash, retrieval timestamp, canonical URL, quotation limits, and an allowed local snapshot or archive reference. |
| Research completeness has no stopping rule | High | “Find what you can” can run indefinitely or stop after shallow search, depending on cost and model behavior. | Define budget, source diversity, query coverage, contradiction search, saturation rule, partial-failure behavior, and user-visible gaps. |
| AI approval can be reduced to bulk activation | High | The current gas UI has “Activate all proposed + wire,” and the server wires each node at weight `1.0`. This bypasses the intended node-by-node scientific review. | Remove bulk activation from the generalized workflow. Permit batch approval only after every node and relationship passes validation and the user reviews a summarized receipt. |
| “Visibly explains” is not an objective UX gate | High | A dense 15-node graph can technically contain all fields while being illegible and unusable. | Add measurable UX acceptance: target-centered layout, zoom/pan/search/filter, hop layers, no default overlap, keyboard access, non-color status cues, source drawer, and tested 15–30 node readability at defined viewport sizes. |
| Base app and gas demo can drift into two products | High | Updating both independently will duplicate authoring logic and undermine the domain-general claim. | Put the generalized Prediction Workspace, node inspector, distribution forms, and comparison UI in a shared package. Gas is a preset/adapter using the same components and contracts. |
| Proof-of-done commands are not explicit | Medium | “Tests pass” does not identify commands, browser coverage, or required artifacts. | Put exact commands, fixtures, acceptance receipts, and expected results in `GOAL.md`. Add a `COMPLETE` section and protected/allowed scope. |
| One umbrella goal is too broad for a single autonomous pass | High | Kernel semantics, research security, AI prompts, visualization, acceptance research, and demo migration can fail independently and create partial completion. | Keep the umbrella `GOAL.md`, but require phase gates and separate implementation plans/receipts for contracts, kernel, research, UI, Neodymium acceptance, and gas adaptation. |

## Revised Strategy

1. **Contract gate:** Freeze `TargetContract`, `EvidenceClaim`, `SourceReceipt`, `DistributionSpec`, `RelationshipContract`, `GraphProposal`, `ApprovalReceipt`, and `SimulationRun` semantics before code changes.
2. **Scientific substrate gate:** Implement the distribution registry, dimensional validation, time-expanded lags, support enforcement, dependence handling, reproducibility, convergence checks, and declared sensitivity methods.
3. **Research gate:** Implement consent, safe retrieval, prompt-injection isolation, claim-level provenance, conflict/duplication checks, and bounded research with explicit gaps.
4. **Authoring gate:** Produce ranked candidate factors and relationships. Do not activate any factor until its distribution, evidence, units, edge semantics, and overlap checks pass.
5. **Visual trust gate:** Build the shared Prediction Workspace and prove a 15–30 node graph remains legible and inspectable. The UI must distinguish hypothesis, evidence, assumption, and resolved observation.
6. **Neodymium acceptance gate:** Confirm a resolution-grade price oracle, run the complete user journey, preserve all receipts, and produce direct-only versus multi-hop impact and leakage-safe hindcast reports.
7. **Gas adaptation gate:** Rebuild gas as a preset/adapter on the same shared workflow. Keep Kalshi and trading controls isolated and inactive by default.

## Confidence Estimate After Fixes

| Area | Confidence | Reason |
|---|---:|---|
| Product thesis | 90% | The thesis is coherent when framed as transparent hypothesis construction, not guaranteed prediction lift. |
| Completion contract | 85% | Phase gates and typed contracts close most “polished toy” loopholes. |
| Modeling credibility | 75% | Dimensional, temporal, dependence, and scoring contracts make the first release defensible; real predictive performance remains empirical. |
| Research/provenance | 80% | Safe retrieval and claim-level receipts make the research trace auditable. |
| UX credibility | 80% | Measurable graph-readability and inspection gates support the visual trust claim. |

## Remaining Uncertainty

- Whether second- and third-order factors produce measurable out-of-sample lift for Neodymium or other markets.
- Availability and licensing of a stable, resolution-grade Neodymium price history.
- Whether the initial eight parametric families are sufficient without an explicit regime-mixture representation.
- Which global sensitivity/attribution method is most useful with correlated inputs and nonlinear transforms.
- How much research depth and visual complexity users will tolerate before the workflow becomes burdensome.

## Proceed / Do Not Proceed Decision

**Original audit decision: DO NOT PROCEED with broad implementation under the pre-audit wording.**

The product direction is sound, but `GOAL.md` should first be amended with the critical contracts and phase gates above. A narrow contract-and-registry implementation may proceed only after that revised design is approved.

### Disposition after goal hardening

On 2026-07-27, `GOAL.md`, `STANDARDS.md`, `IMPLEMENT.md`, `DECISIONS.md`, `PROGRESS.md`, and `TASK_QUEUE.md` were created or revised to incorporate this review:

- resolution-grade target contracts;
- typed evidence, distribution, relationship, proposal, approval, and run contracts;
- explicit units, lags, time-expanded DAGs, and dependence warnings;
- safe research and cloud-routing boundaries;
- scoring/ablation gates;
- measurable visual acceptance;
- shared base-app/gas-preset architecture;
- phase-specific stop and completion rules.

**Current decision: PROCEED TO GATE 0 CONTRACT WORK ONLY.** Later gates remain blocked until their declared predecessors pass.

## Required Verification

1. Exact target-resolution contract test, including missing/changed source behavior.
2. Registry validation and seeded sampling tests for all eight families, including support and parameterization semantics.
3. Unit/dimension rejection tests for invalid relationships.
4. Time-lag and horizon tests using a time-expanded DAG.
5. Correlated-input/dependence tests and positive-semidefinite validation.
6. Monte Carlo stability/convergence evidence across seeds and sample sizes.
7. Provenance tests from source retrieval through claim, node, graph version, and simulation receipt.
8. SSRF, redirect, size-limit, prompt-injection, and secret-isolation tests for research ingestion.
9. Candidate duplication/correlation warnings and human-approval invariant tests.
10. Defined sensitivity/ablation method tests with correlated and interacting factors.
11. Playwright flow for target intake → research review → 15-factor candidate graph → node edits → approval → simulation → receipt.
12. Visual inspection at agreed desktop viewport(s), including zoom, filters, status cues, and no default node overlap.
13. Leakage-safe Neodymium hindcast and direct-only versus multi-hop comparison, with continuous-outcome scoring.
14. Regression verification for the gas preset and existing kernel/server behavior.
