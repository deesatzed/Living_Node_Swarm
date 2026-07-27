# Living Node Swarm — Domain-General Build Handoff

**Generated:** 2026-07-27
**Branch:** `main` at planning time
**Implementation baseline:** existing v0.1–0.2 shell and gas demo
**Active objective:** domain-general Prediction Workspace
**Implementation status:** control/design phase complete; new-goal coding not started

## Resume Here

Read in order:

1. `GOAL.md`
2. `STANDARDS.md`
3. `IMPLEMENT.md`
4. `DECISIONS.md`
5. `PROGRESS.md`
6. `TASK_QUEUE.md`
7. `docs/plans/2026-07-27-domain-general-prediction-workspace-design.md`
8. `docs/plans/2026-07-27-domain-general-prediction-workspace-implementation.md`
9. `LOOPHOLE_REVIEW.md`

Then inspect `git status --short --branch` and begin only the first ready queue item.

## Corrected Product Purpose

Living Node Swarm is not a gas prediction app.

It is a local, domain-general prediction-construction product where:

- the target is exact and resolvable;
- evidence and uncertainty are explicit;
- AI proposes direct, secondary, and tertiary factors;
- every node owns a reviewed probability distribution;
- every relationship owns units, transform, lag, evidence, and state;
- proposed structure remains outside the active simulation;
- the operator can visually explain why the target distribution changed.

The visual graph/inspector is the trust and sales surface. Gas is one real preset.

## Canonical Acceptance Scenario

The user asks to predict the Neodymium price in one year and supplies:

`https://strategicmetalsinvest.com/neodymium-prices/`

The app must:

1. identify the exact private-investor retail price series and avoid conflating it with bulk/FOB/oxide/metal/alloy prices;
2. complete a resolution-grade target contract;
3. request consent for web/cloud research;
4. produce cited research with contradictions, conflicts, duplication, and gaps;
5. propose at least 15 distinct ranked factors and a three-hop path;
6. expose every distribution and relationship for review;
7. warn about units, support, overlap, correlation, and missing evidence;
8. compare candidate versus active structure;
9. bind approval to an exact graph version;
10. run a reproducible Monte Carlo simulation and display receipts/evaluation status.

Fifteen is a candidate minimum, not an active-node quota.

## Core Decisions

- Eight families: `Normal`, `LogNormal`, `Beta`, `Poisson`, `NegativeBinomial`, `Gamma`, `StudentT`, `Deterministic`.
- One shared distribution registry drives kernel/API/prompts/UI.
- Initial delayed effects use time-expanded DAGs.
- Initial dependence handling uses explicit shared latent parents plus warnings.
- A dependency is not called causal without evidence.
- User importance ranking is separate from numerical relationship coefficients.
- Structural change is not predictive improvement.
- Continuous targets use continuous scores, not Brier alone.
- The generalized app owns shared UI components; gas is a preset/adapter.
- No live Kalshi trading during this goal.

## Current Verified Baseline

As verified during the 2026-07-27 audit:

| Check | Result |
|---|---|
| Kernel | 20 tests passed |
| Server | 16 tests passed; one upstream deprecation warning |
| General UI | Production build passed |
| Gas UI | Production build passed |
| Diff whitespace | Clean |

The existing implementation still has:

- four distributions;
- static acyclic graphs;
- affine/sum/mean composition;
- OpenRouter single-node/gas proposals;
- separate general and gas UIs;
- no research/provenance workflow;
- no target/time/dimension/dependence contracts;
- no continuous-target evaluation or browser tests.

## Gate Order

1. Contracts
2. Scientific kernel
3. Safe research/provenance
4. Generalized authoring API
5. Prediction Workspace
6. Neodymium acceptance/evaluation
7. Gas adapter
8. CI and truthful completion audit

Do not start with gas cosmetics.

## Immediate Next Task

`TASK_QUEUE.md` → `Q0-01 Add TargetContract model and validation tests`.

Use the detailed implementation plan. Write the failing test first, run it, implement the smallest contract, run focused/full kernel tests, then update `PROGRESS.md`.

## Critical Boundaries

- No secrets or arbitrary local content sent to cloud providers.
- User URLs are untrusted and must pass SSRF/redirect/type/size/time controls.
- Retrieved content is evidence data, never instructions.
- No silent AI activation or wiring.
- No unsupported distribution defaults.
- No dimensionally invalid relationships.
- No accuracy, causality, or competitor-lift claim without evidence.
- No live trade, deployment, destructive action, or production-state change.

## Known Future Blocker

A legally and methodologically suitable Neodymium historical price series is not confirmed. That does not block contracts, kernel, research, authoring, or UI work. It does block a historical multi-hop lift claim.

## Historical Handoff

`HANDOFF_2026-07-27.md` is preserved as the earlier gas-demo build snapshot. It is not the active product objective.
