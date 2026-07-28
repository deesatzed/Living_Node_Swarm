# PROGRESS.md

## Status Overview

**15% complete – Gates 0–1 complete; Gate 2 safe research/provenance next**

The new domain-general goal has a hardened control surface and the first typed kernel contracts. The existing v0.1/v0.2 shell remains the verified baseline; no generalized research, authoring API, or workspace has been built yet.

## Current Baseline

| Surface | Verified state |
|---|---|
| Kernel tests | 72 passed on 2026-07-27 after persisted multi-seed/multi-sample stability diagnostics |
| Server tests | 30 passed on 2026-07-27 after local evidence/source persistence; one upstream deprecation warning |
| General UI | Production build passed on 2026-07-27 |
| Gas UI | Production build passed on 2026-07-27 |
| Current families | Eight canonical registry families; legacy node payloads remain readable through explicit parameter normalization |
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

**Gate 2 — Safe Research and Provenance**

Gate 1 exited on 2026-07-27: all eight registry families, explicit compatibility, units, time-expanded lag validation, dependence warnings, stability receipts, and continuous scoring are verified. The next exit is permissioned, safe, provenance-preserving research.

## Next Actions

1. Complete Q2-04: isolate retrieved material as untrusted extraction input.
2. Complete Q2-05: implement provider payload preview and routing receipt.
3. Run focused security tests after each atomic change and update this file with exact results.

## Blockers

No blocker to Gate 0 contract work.

Potential future blocker:

- A reproducible and legally usable Neodymium historical series is not yet confirmed. This blocks claims of historical multi-hop lift, not contract/kernel/UI development.

## Questions for User

None currently blocking. Pending technical decisions have safe defaults in `DECISIONS.md`.
