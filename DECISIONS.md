# DECISIONS.md

## Decision Log Overview

This file records product and architecture decisions that future agents must preserve unless a later entry explicitly supersedes them. “Pending” decisions are not permission to choose silently.

## Active Decisions

| ID | Date | Decision | Status | Rationale |
|---|---|---|---|---|
| D-001 | 2026-07-27 | Living Node Swarm is domain-general; gas is one real demonstration preset. | Accepted | The core value is generalized prediction construction. |
| D-002 | 2026-07-27 | The visual graph and inspectors are the primary trust/sales surface. | Accepted | Users will not trust an unexplained black-box prediction. |
| D-003 | 2026-07-27 | The canonical acceptance scenario is a one-year Neodymium price forecast beginning with a user-supplied price-monitoring source. | Accepted | It proves the product can leave the gas domain. |
| D-004 | 2026-07-27 | Generate at least 15 ranked candidate factors, including primary/secondary/tertiary factors; do not force all candidates active. | Accepted | Breadth supports discovery; activation must remain evidence-driven. |
| D-005 | 2026-07-27 | The initial registry contains `Normal`, `LogNormal`, `Beta`, `Poisson`, `NegativeBinomial`, `Gamma`, `StudentT`, and `Deterministic`. | Accepted | Covers common continuous, positive, bounded, count, heavy-tail, and fixed variables. |
| D-006 | 2026-07-27 | One shared distribution registry drives kernel, API, prompts, and UI. | Accepted | Prevents parameter/label drift and scattered validation. |
| D-007 | 2026-07-27 | Every forecast requires a versioned, resolution-grade `TargetContract`. | Accepted | An ambiguous oracle cannot be scored or reproduced. |
| D-008 | 2026-07-27 | Relationships are typed model dependencies with units, transform, lag, evidence, and approval state. | Accepted | A graph edge alone is not causal or numerically meaningful. |
| D-009 | 2026-07-27 | First-release delayed effects use a time-expanded DAG; same-time cycles are deferred. | Accepted | Preserves tractable simulation while representing lags/hysteresis approximations. |
| D-010 | 2026-07-27 | First-release dependence is represented through explicit shared latent parents plus unresolved-correlation warnings. | Accepted | Avoids implicit independence without committing to a full copula editor. |
| D-011 | 2026-07-27 | AI-created nodes and relationships remain proposed until version-bound human approval. | Accepted | Prevents silent model mutation. |
| D-012 | 2026-07-27 | The generalized workflow does not offer unreviewed bulk activation/wiring. | Accepted | Bulk weight-1 wiring undermines scientific review. |
| D-013 | 2026-07-27 | User importance/ranking controls are separate from numerical relationship coefficients. | Accepted | “Weight more” can otherwise hide dimensional or causal assumptions. |
| D-014 | 2026-07-27 | Web research is permissioned, bounded, provenance-preserving, and treats pages as untrusted data. | Accepted | Required for security, privacy, and reproducibility. |
| D-015 | 2026-07-27 | The user-selected Neodymium page may be an oracle only for its explicitly identified private-investor retail series. | Accepted | The page also references other price bases that must not be conflated. |
| D-016 | 2026-07-27 | Structural impact and predictive improvement are distinct labels. | Accepted | Output movement alone does not establish accuracy. |
| D-017 | 2026-07-27 | Continuous targets require continuous scoring and leakage-safe comparison; Brier remains binary-only. | Accepted | Correct scoring depends on target type. |
| D-018 | 2026-07-27 | The generalized UI lives in a shared package; `lns_ui` is canonical and gas consumes it as a preset/adapter. | Accepted | Prevents two drifting products. |
| D-019 | 2026-07-27 | No live Kalshi trade occurs during this goal. | Accepted | Trading is not required to prove the generalized product and has separate safety gaps. |

## Initial Default Decisions

| Topic | Default |
|---|---|
| Runtime | Localhost, single-user |
| Kernel | Python + NumPy, provider-agnostic |
| Server | FastAPI + SQLite |
| UI | React/Vite with a private shared UI package |
| Forecast representation | Parametric inputs, empirical Monte Carlo outputs |
| Human gate | Required for proposed structure |
| Cloud models | Explicit provider/model routing and payload disclosure |
| Evidence | Claim-level receipts with hashes and timestamps |
| Research failure | Preserve partial results and show gaps; fail closed |
| Accuracy claims | Prohibited without predeclared evidence |

## Superseded Decisions

| Previous decision | Superseded by | Reason |
|---|---|---|
| Gas demo as primary product surface | D-001, D-018 | Gas is a preset; generalized Prediction Workspace is canonical. |
| Four distribution families as complete scope | D-005, D-006 | The accepted general product needs eight registered families. |
| Bulk “activate all + wire weight 1.0” as preferred demo path | D-012 | Generalized scientific review requires validated relationship approval. |
| Brier score as the principal scoring story | D-017 | Neodymium is a continuous target and needs continuous scoring. |

## Decision Rules for Future Agents

1. Do not silently reinterpret an accepted decision.
2. To supersede a decision, add a new ID with:
   - the old ID;
   - evidence or user direction;
   - scope and migration impact;
   - verification changes.
3. If implementation reveals an inconsistency between accepted decisions, stop that task and record the conflict.
4. Assumptions belong in `PROGRESS.md`; durable choices belong here.
5. A UI convenience cannot weaken a modeling, provenance, security, or approval invariant.

## Pending Decision Questions

| ID | Needed by | Question | Default if unresolved |
|---|---|---|---|
| P-001 | Gate 1 | Which global sensitivity method should be the product default with correlated inputs? | Show local ablation only and label limitations. |
| P-002 | Gate 1/5 | Should discrete regimes be separate runs or a first-class mixture contract? | Separate scenario runs; no implicit mixture. |
| P-003 | Gate 2 | Retain full retrieved text locally or only normalized claims/excerpts/hash? | Minimize retention: normalized claims, permitted excerpts, hash, metadata. |
| P-004 | Gate 4 | Which graph renderer/layout library best satisfies 30-node readability and accessibility? | Prototype candidates; choose based on evidence. |
| P-005 | Gate 5 | Which Neodymium history is legally and methodologically suitable for hindcasting? | Do not claim lift until resolved. |
