# Domain-General Prediction Workspace Design

**Date:** 2026-07-27
**Status:** Approved product direction; hardened after reality and loophole review
**Source of truth:** `GOAL.md`, `STANDARDS.md`, `DECISIONS.md`

## 1. Purpose

Living Node Swarm will become a domain-general prediction-construction product. It will help a user turn a resolvable question into a researched, explicit, probabilistic dependency graph and a reproducible simulation.

The product does not sell certainty. It sells inspectability:

- what is being predicted;
- what evidence was used;
- which factors and multi-hop pathways were considered;
- how every uncertainty was represented;
- which proposals the operator accepted;
- how the target distribution changed;
- what remains unsupported or unknown.

Gas is retained as a demonstration preset. The canonical generalized acceptance scenario is a one-year Neodymium price forecast.

## 2. Product Boundary

### In

- Local single-user target definition.
- Permissioned web research and user-provided context.
- Claim-level provenance.
- AI-assisted factor and relationship proposals.
- Explicit parametric distributions.
- Human review and version-bound approval.
- Acyclic, time-expanded dependency graphs.
- Monte Carlo simulation, sensitivity, ablation, and continuous-target evaluation.
- A shared visual Prediction Workspace.

### Out

- Autonomous investment decisions.
- Live trading during this build.
- Multi-user/cloud service.
- Same-time cyclic dynamics.
- Arbitrary custom/empirical distributions.
- Guaranteed accuracy or competitor lift.

## 3. Core User Journey

```text
Question
  → Target contract
  → Evidence consent and research brief
  → Bounded cited research
  → Ranked candidate factors and relationships
  → Node/edge distribution and evidence review
  → Warnings: units, overlap, dependence, support, missing evidence
  → Active-versus-candidate shadow comparison
  → Version-bound human approval
  → Monte Carlo run
  → Visual explanation, receipt, and evaluation status
```

The workflow is resumable. Long research/simulation work preserves progress and partial receipts.

## 4. Trust Model

Every displayed statement belongs to one of six classes:

1. **User input**
2. **Retrieved evidence**
3. **Model inference**
4. **Scenario assumption**
5. **Resolved observation**
6. **Unknown**

The UI always exposes the class and provenance. A source page is evidence data, never model instruction.

Relationships are “model dependencies” unless their evidence supports a causal label. The graph visual must not convert visual direction into a causal claim.

## 5. Data Contracts

### TargetContract

Defines the prediction oracle and prevents benchmark drift. It includes the exact series/product, price basis, units, forecast origin, resolution rule, source receipt, fallback, and revision policy.

For Neodymium, the private-investor retail series from the supplied site is distinct from bulk, FOB-China, oxide, metal, and alloy prices. Related series may become separate nodes joined by explicit basis/spread relationships.

### DistributionSpec

References one registry family and canonical parameters. It also stores support/truncation, intuitive elicitation values, derived summaries, parameter source, as-of time, and confidence rationale.

### EvidenceClaim / SourceReceipt

Captures claim-level provenance, conflicts, corroboration, retrieval metadata, content hash, and classification. Full-page storage is minimized by default.

### RelationshipContract

Defines parent/child, relation type, transform, units, sign, lag, coefficient uncertainty, evidence, validity range, state, and approval version.

### GraphProposal / ApprovalReceipt

Captures a complete candidate delta and all validation warnings. Editing any bound input invalidates approval.

### SimulationRun

Records graph/contract versions, seed, sample count, engine version, convergence/stability, outputs, sensitivity method, run classification, and provenance.

## 6. Distribution Registry

The registry is a shared conceptual contract implemented authoritatively in Python and exported as JSON schema/catalog for the UI.

| ID | Canonical parameters | Intended use |
|---|---|---|
| `Normal` | `loc`, `scale` | symmetric real-valued uncertainty |
| `LogNormal` | `log_loc`, `log_scale` | multiplicative positive uncertainty |
| `Beta` | `alpha`, `beta` | proportions/probabilities |
| `Poisson` | `rate` | equidispersed counts |
| `NegativeBinomial` | `mean`, `dispersion` | overdispersed counts |
| `Gamma` | `shape`, `scale` | positive skewed quantities/waits |
| `StudentT` | `df`, `loc`, `scale` | symmetric heavy-tailed uncertainty |
| `Deterministic` | `value` | explicit fixed scenario/input |

The user sees intuitive descriptions, units, curve previews, and quantiles. The system derives canonical parameters when it can do so consistently. Natural support and optional truncation are enforced in both validation and sampling.

## 7. Graph and Time Semantics

The first release uses a directed acyclic graph.

- `depends_on` means the child is computed from its parents through an explicit relationship.
- Delays are represented with time-indexed nodes/relationships.
- Same-time cycles are rejected.
- Feedback/hysteresis motifs are approximated through time expansion.
- Relationships carry coefficient units so dimension checks can reject invalid sums.

Correlated exogenous factors should share explicit latent parents. If dependence is suspected but unresolved, activation can proceed only with a visible warning and receipt; the UI must not claim independence.

## 8. Research Architecture

### Intake

The user supplies:

- target source(s);
- background thoughts/private context;
- research breadth;
- explicit web/cloud permission.

### Retrieval

The server:

- allows HTTP(S);
- blocks unsafe destinations and redirects;
- limits time, size, redirects, and types;
- extracts content through an untrusted-data boundary;
- records hashes and metadata;
- never sends secrets or unrelated context to a provider.

### Research completion

A run declares:

- queries/categories covered;
- source diversity;
- contradictions searched;
- repeated upstream claims;
- saturation/stopping reason;
- budget consumed;
- partial failures;
- unresolved gaps.

### Candidate generation

Candidates are ranked on:

- evidence;
- expected relevance;
- observability;
- uncertainty;
- hop contribution;
- novelty/non-duplication.

The minimum of 15 applies to reviewed candidates, not active nodes.

## 9. Simulation and Evaluation

### Simulation

The kernel runs only the active approved graph. Candidate comparisons use shadow runs and never mutate active state.

Every run records:

- seed and sample count;
- stability across configured seeds/sample sizes;
- support violations;
- unresolved-dependence warnings;
- target quantiles and retained samples;
- method-specific sensitivity/ablation output.

### Evaluation

Binary targets may use Brier scoring. Continuous targets use predeclared continuous metrics such as CRPS, interval coverage, and calibration diagnostics.

Three model variants should be compared where suitable history exists:

1. simple baseline;
2. direct factors only;
3. approved multi-hop graph.

The report preserves mixed or negative findings.

## 10. Visual Architecture

### Shared package

`packages/lns_ui_shared` owns reusable contracts, API types, and components.

`packages/lns_ui` is the canonical generalized app. `packages/lns_gas_demo` loads a gas preset through the same components.

### Primary workspace

```text
┌──────────────── Target / horizon / freshness / graph version ───────────────┐
│ Research progress | warnings | run classification | approve/run controls   │
├───────────────┬───────────────────────────────┬─────────────────────────────┤
│ Workflow      │ Target-centered graph         │ Inspector                   │
│ Target        │ hop columns                   │ Node / relationship         │
│ Sources       │ proposed vs active            │ Curve / params / evidence   │
│ Candidates    │ highlighted affected paths    │ Warnings / approval         │
│ Approval      │ zoom / pan / search / filters │ Before/after contribution   │
├───────────────┴───────────────────────────────┴─────────────────────────────┤
│ Distribution comparison | scenario/tails | sensitivity | run receipt       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Progressive disclosure

- Default: target, hop structure, status, central interval.
- Select node: distribution/evidence.
- Select edge: transform/units/lag/evidence.
- Open comparison: affected paths and output changes.
- Open receipt: complete reproducibility data.

Status uses text/icon/shape in addition to color.

## 11. Error Handling

| Failure | Required behavior |
|---|---|
| Ambiguous target | Block run and identify missing contract fields |
| Source unavailable | Apply declared fallback or leave unresolved; never silently substitute |
| Unsafe URL | Reject before fetch with safe explanation |
| Research partial failure | Preserve receipts and visible gaps |
| Invalid distribution | Keep draft, show family-specific error, exclude from approval |
| Unit mismatch | Block relationship activation |
| Suspected duplicate/correlation | Warn and require acknowledgment/structural fix |
| Provider failure | Preserve approved local state and retry boundary |
| Simulation failure | Keep last successful snapshot; mark current graph failed/stale |
| Approval invalidated | Return proposal to review with exact changed fields |

## 12. Testing Design

- Contract serialization/validation and migration tests.
- Registry property/statistical tests.
- Dimension/time/dependence invariant tests.
- Research SSRF, redirect, prompt-injection, size/time/type, and provenance tests.
- Authoring integration tests with labeled deterministic fixtures.
- Component/accessibility tests.
- Playwright canonical workflow at two viewports.
- Leakage-safe evaluation harness with saved methodology and data cutoff.
- Existing gas and trade-safety regression tests.

## 13. Acceptance Narrative

A new user should be able to ask for a one-year Neodymium price forecast, specify the exact retail series, approve research routing, review a cited 15+ factor map, inspect a third-order resource-diversion pathway, correct a distribution or relationship, reject weak factors, compare candidate versus active output, approve the graph, run the simulation, and explain the result to another person from the visual and receipt without appealing to an opaque model answer.

## 14. Remaining Decisions

- Sensitivity method for correlated/nonlinear inputs.
- Separate-run versus first-class regime mixture.
- Neodymium historical data source and license.
- Graph renderer/layout library.
- Exact permitted evidence retention.

Safe defaults are recorded in `DECISIONS.md`.
