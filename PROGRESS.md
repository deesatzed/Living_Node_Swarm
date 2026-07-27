# PROGRESS.md

## Status Overview

**0% complete – Initialization phase**

The new domain-general goal has a hardened control surface, but no implementation work under the new goal has begun. The existing v0.1/v0.2 shell remains the verified baseline.

## Current Baseline

| Surface | Verified state |
|---|---|
| Kernel tests | 20 passed on 2026-07-27 |
| Server tests | 16 passed on 2026-07-27; one upstream deprecation warning |
| General UI | Production build passed on 2026-07-27 |
| Gas UI | Production build passed on 2026-07-27 |
| Current families | Normal, LogNormal, Beta, Deterministic |
| Current graph | Static DAG with affine/sum/mean transforms |
| Current research/provenance | Not implemented |
| Current generalized authoring UX | Not implemented |

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
| Gate 0 contract implementation | Pending | Unassigned | First code milestone |
| Gate 1 scientific kernel | Pending | Unassigned | Depends on Gate 0 |
| Gate 2 safe research/provenance | Pending | Unassigned | Depends on Gate 0 |
| Gate 3 generalized authoring | Pending | Unassigned | Depends on Gates 1–2 |
| Gate 4 visual workspace | Pending | Unassigned | Depends on Gate 3 API/contracts |
| Gate 5 Neodymium acceptance | Pending | Unassigned | Depends on Gates 1–4 |
| Gate 6 gas adapter | Pending | Unassigned | Depends on shared workspace |
| Gate 7 CI/handoff | Pending | Unassigned | Final gate |

## Decision Links

- Product/domain decisions: `DECISIONS.md` D-001 through D-005
- Modeling decisions: D-006 through D-010, D-016, D-017
- Approval/research decisions: D-011 through D-015
- UI/demo decisions: D-018, D-019

## Current Milestone

**Gate 0 — Contracts and design**

Exit requires typed contract tests, compatible persistence/migration design, exact API shapes, and resolution of any blocking pending decision.

## Next Actions

1. Complete the detailed implementation plan under `docs/plans/`.
2. Start `Q0-01` in `TASK_QUEUE.md`: write failing tests for `TargetContract`.
3. Implement contracts in the queue order.
4. Run the focused test after each atomic change.
5. Update this file with exact commands and results.

## Blockers

No blocker to Gate 0 contract work.

Potential future blocker:

- A reproducible and legally usable Neodymium historical series is not yet confirmed. This blocks claims of historical multi-hop lift, not contract/kernel/UI development.

## Questions for User

None currently blocking. Pending technical decisions have safe defaults in `DECISIONS.md`.
