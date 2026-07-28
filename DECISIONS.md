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
| D-020 | 2026-07-27 | Every nonzero relationship lag declares `day`, `week`, `month`, `quarter`, `year`, or `step`; one time-expanded graph uses one shared lag clock. | Accepted | A bare lag number is scientifically ambiguous and makes temporal DAG validation unreliable. |
| D-021 | 2026-07-28 | The canonical GUI is a hybrid guided workflow plus analyst cockpit, organized as `Idea → Vet → Map → Refine → Quantify → Simulate → Decide → Monitor`, with separate Run, Edit, and Monitor paths for existing models. | Accepted | The interface must follow a real model-building and operating workflow while keeping the full analytical surface available. |
| D-022 | 2026-07-28 | Gate 4 prioritizes transparency and adaptability over early streamlining; lifecycle stages, inspectors, and workspace components remain typed and composable until usage evidence supports simplification. | Accepted | The team does not yet know which controls real operators will use most, and hiding assumptions too early would weaken the product's trust thesis. |
| D-023 | 2026-07-28 | `GOAL_GUI.md` is autonomous for implementation: Codex chooses routine UX/engineering details and continues without intermediate user approval, while runtime operator approval remains mandatory before proposed structure becomes active. | Accepted | Development autonomy and in-product human control solve different problems and must not be conflated. |
| D-024 | 2026-07-28 | Model decision support includes an authoritative, explicit weighted output ensemble with exact member versions, validated weights, reproducible mixture sampling, approval, and receipt. | Accepted | The approved workflow requires joint assessment and selection of a model or ensemble; a disabled placeholder would not satisfy it. |
| D-025 | 2026-07-28 | The private shared UI package uses React peer dependencies plus test-only Vitest 4, Testing Library, user-event, and jsdom. | Accepted | These MIT-licensed tools provide the required component and accessibility harness; `npm audit` returned zero vulnerabilities after upgrading to Vitest 4.1.10. |
| D-026 | 2026-07-28 | Canonical browser-flow verification uses Playwright with localhost API interception and fixed desktop viewports. | Accepted | The GUI goal requires browser/viewport evidence. Playwright is Apache-2.0; tests use fixture API responses only and make no live research/provider requests. |
| D-027 | 2026-07-28 | Existing-model comparison uses the existing shadow-simulation endpoint with a selected in-memory parameter override before any persistent candidate-edit UI exists. | Accepted | It exposes a real active-versus-candidate result while preserving the no-silent-mutation rule; the UI must label it as a structural comparison, not an approved revision or accuracy improvement. |
| D-028 | 2026-07-28 | The approval UI may submit only a server-issued proposal binding hash after an explicit named human acknowledgment. | Accepted | The UI must not synthesize a hash or offer approval from browser-local state; the server validates the version-bound proposal before applying it. |
| D-029 | 2026-07-28 | Project-scoped approval updates the workspace lifecycle/version only after the graph store accepts the bound proposal. | Accepted | Graph and workspace metadata are separate stores, so the UI must not claim a cross-store atomic transaction. The project endpoint validates project/graph/proposal alignment and returns the confirmed project record after the graph approval. |
| D-030 | 2026-07-28 | A durable candidate revision stores only exact numeric parameter overrides and its active graph version; saving or listing it cannot activate or mutate the graph. | Accepted | The first persisted candidate record must be an honest recovery/review surface. Structural deltas, restore/undo, validation, and ensemble candidates need separate contracts rather than being implied by a numeric override record. |
| D-031 | 2026-07-28 | Existing-model Edit renders the selected approved graph as a read-only, target-centered dependency map before presenting draft or comparison controls. | Accepted | Operators need to trace the currently active dependencies without confusing inspection with candidate editing. The map derives hop distances from persisted `depends_on` edges and preserves the existing no-mutation boundary. |
| D-032 | 2026-07-28 | A candidate revision may carry version-bound node-state overrides only for nodes present in the selected active graph; these revisions are non-active and cannot be simulated or approved as structural proposals. | Accepted | This permits durable include/exclude exploration without pretending the numeric shadow endpoint covers structural changes or bypassing a future validated graph-proposal/approval contract. |
| D-033 | 2026-07-28 | A candidate revision may carry version-bound active/excluded state overrides for existing persisted dependency edges only; these remain non-active and outside numeric shadow simulation and approval. | Accepted | The UI can preserve an operator's challenge to an unsupported direction while the server verifies the exact active edge and prevents malformed or invented structural deltas. |
| D-034 | 2026-07-28 | Vet records provider-routing consent as a separate preview receipt before any future provider request; the receipt names provider/model scope and states that no research content was sent. | Accepted | Consent must be visible, durable, and reversible from a privacy perspective. Recording it cannot be treated as research execution, evidence retrieval, or permission to send unrelated material. |
| D-035 | 2026-07-28 | A candidate revision may contain kernel-validated proposed-only new nodes that require human approval and do not share IDs with the active graph. | Accepted | Missing-factor exploration needs a typed scientific object, while new nodes must remain outside active simulation and structural approval until a complete graph-proposal contract exists. |
| D-036 | 2026-07-28 | The Gas adapter exposes previews and dry-run exits only; live buy and live auto-sell controls are hard-disabled in this goal build. | Accepted | Browser confirms are not a sufficient isolation boundary for real-money execution. The accepted scope prohibits live trades, so the UI must not construct execution requests. |
| D-037 | 2026-07-28 | Factor-bound distribution statistics in the workspace come from a read-only kernel-backed server route, not duplicated browser formulas. | Accepted | One source preserves canonical-family validation, legacy parameter normalization, and the distinction between analytic display values and fitting or graph mutation. |
| D-038 | 2026-07-28 | Run receipt history is a bounded read-only list of persisted simulation snapshots, ordered newest first. | Accepted | Reproducibility requires more than a last-run pointer, but exposing history must not rerun the graph or turn prior receipts into mutable browser state. |
| D-039 | 2026-07-28 | A saved scenario becomes executable only when it binds finite numeric parameter overrides to an exact active graph version and target node; execution uses the existing in-memory shadow engine. | Accepted | Narrative assumptions must remain clearly non-executed. Reusing the version-aware non-mutating comparison boundary prevents a scenario run from silently changing, approving, or persisting active graph structure. |
| D-040 | 2026-07-28 | The first Run sensitivity surface is a bounded one-at-a-time local finite-difference report over nonzero active node parameters at an explicit user-visible fraction. | Accepted | This provides inspectable structural responsiveness without overstating it as causal attribution, global importance, calibration, or predictive accuracy. Zero parameters are skipped rather than receiving an invented unit-dependent absolute perturbation. |
| D-041 | 2026-07-28 | Runtime Monte Carlo sampling delegates to the canonical distribution registry for every registered family. | Accepted | The registry is the sole source for parameter normalization, validation, support, and sampling semantics; a partial hand-written runtime sampler would make some registered graph nodes unsimulatable. |
| D-042 | 2026-07-28 | A weighted model ensemble is a seeded distribution mixture sampled from member outcome distributions with validated normalized weights, never an arithmetic average of member point summaries. | Accepted | Averages hide multimodality and understate member uncertainty; an explicit mixture preserves the distributional meaning required for review and reproducibility. |
| D-043 | 2026-07-28 | A persisted ensemble configuration is project-scoped and binds unique exact graph/version/target members with finite non-negative positive-total weights; saving it does not activate or approve an ensemble. | Accepted | Durable review/recovery requires a typed record, while model activation and approval need a distinct ensemble-specific receipt rather than overloading the single-graph approval contract. |
| D-044 | 2026-07-28 | Ensemble approval has its own named operator receipt bound to the saved configuration SHA-256 hash and revalidated member versions; it never changes member graph structure. | Accepted | A graph-proposal approval is not an ensemble decision. Exact binding and stale-member rejection preserve review integrity, while structural graph activation remains a separate concern. |
| D-045 | 2026-07-28 | A candidate revision may persist complete kernel-validated proposed `RelationshipContract` records whose parent and child both exist in the exact active graph version; these contracts are non-active and outside simulation and approval. | Accepted | This preserves typed relationship review work across refresh without misrepresenting it as a mutable graph edge or bypassing the still-required complete graph-proposal application contract. |
| D-046 | 2026-07-28 | Active executable graph relationship metadata is persisted as a first-class `Graph` aggregate, separate from non-active candidate revisions; an active contract must match a real child `depends_on` edge. | Accepted | Structural approval needs one durable, versioned source for executable edge metadata. Persisting metadata alone does not create a structural proposal, simulate a draft relationship, or activate any proposed change. |
| D-047 | 2026-07-28 | `RelationshipContract` carries an optional typed finite coefficient-parameter collection, distinct from coefficient units and from operator importance. | Accepted | A structural proposal eventually needs the actual numeric relationship assumptions, not just units. The collection remains optional for legacy/metadata-only contracts until the structural-proposal validator explicitly requires executable values. |
| D-048 | 2026-07-28 | Structural relationship additions use a distinct immutable, version-bound proposal record; creation materializes and validates a trial graph but persists no active graph change. | Accepted | Numeric override approval cannot honestly encode structural changes. The current runtime accepts only zero-lag additions with explicit affine coefficients; nonzero-lag, node changes, simulation, approval, and activation remain separate work. |
| D-049 | 2026-07-28 | Structural relationship activation requires the server-stored proposal’s exact binding hash and base graph version; the graph store applies its child-edge and active-contract changes in one transaction. | Accepted | Browser-local staged state cannot be trusted for activation. A graph edit invalidates the proposal, and atomic persistence prevents an active node edge without its matching active relationship metadata. Project lifecycle synchronization, structural shadow simulation, and UI review remain follow-on work. |
| D-050 | 2026-07-28 | Edit uses distinct parent/child selectors and an explicit numeric coefficient for relationship additions, then presents a separate structural review/approval receipt rather than reusing numeric candidate approval. | Accepted | Existing-dependency state controls cannot represent a new edge. Keeping the structural binding distinct makes the active-graph mutation and its no-accuracy limitation inspectable. |
| D-051 | 2026-07-28 | An approved affine relationship addition maps its explicit `coefficient` parameter to the child’s newly appended `aN` transform slot; it never relies on the runtime’s default affine weight. | Accepted | The declared relationship coefficient must be the coefficient simulated after approval. Transform mismatch or a missing named coefficient rejects the proposal rather than silently substituting a plausible value. |
| D-052 | 2026-07-28 | Structural shadow simulation reconstructs the exact stored proposal as an in-memory trial graph and compares it with the same-version active graph before approval. | Accepted | This makes the output impact of a reviewed structural relationship inspectable without activation. A stale base rejects, and returned shifts remain structural impact rather than evidence of forecast accuracy. |
| D-053 | 2026-07-28 | Edit invokes structural shadow simulation only from the server-issued structural proposal and renders its result in a separate non-activation receipt. | Accepted | The browser sends only the selected target and proposal ID; it cannot substitute locally staged structure. The receipt must confirm active-graph immutability and state that distribution movement is structural impact, not forecast accuracy. |
| D-054 | 2026-07-28 | Project-scoped structural approval mirrors numeric project approval: it verifies the project graph/version against the structural proposal, applies the exact binding, then records the confirmed project `decide` stage and graph version. | Accepted | The workspace lifecycle must not remain stale after structural activation. Graph and workspace stores remain separate, so this is ordered verified synchronization, not a claimed cross-store transaction. |
| D-055 | 2026-07-28 | The next structural delta supports removal of a persisted active relationship, not generic node deletion or arbitrary relationship-state changes. | Accepted | Removing an exact active edge has a durable relationship ID and deterministic affine-coefficient reindexing. Node deletion and broader state semantics need their own proposal contracts rather than being conflated with an excluded browser staging flag. |
| D-056 | 2026-07-28 | Active-node exclusion is structural retirement: one exact proposal must remove every persisted incident relationship, then retire the now-isolated non-target node. | Accepted | Runtime skips retired nodes, so a bare status change would leave executable child composition and relationship metadata inconsistent. Restoring a retired node requires a later reviewed structural addition proposal; physical node deletion remains a distinct contract. |
| D-057 | 2026-07-28 | Edit maps an excluded node to retirement only when active relationship metadata covers every incident dependency; otherwise it keeps the change non-active and explains why no partial proposal is possible. | Accepted | The browser cannot safely infer a removable active edge from an untracked dependency. This preserves the exact-binding guarantee while leaving legacy graphs inspectable. |
| D-058 | 2026-07-28 | Durable candidate-revision comparison is a same-base payload-delta receipt rendered in the shared UI, not a shadow simulation, scoring result, evidence-history reconstruction, or approval path. | Accepted | Persisted revision payloads can honestly expose parameter/state/contract/new-factor additions, removals, and changes without inventing scientific results. Different base graph versions reject comparison so the receipt is not misread as a shared-active-graph difference. |

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
# 2026-07-28 — Edit draft history precedes editable candidate commands

**Decision:** Expose persisted version-bound drafts as read-only history before adding candidate-edit controls.

**Why:** The server already persists project revisions, while no project-scoped candidate command/revision model exists. History gives operators a durable, honest revision surface and avoids presenting browser-local edits as scientific state.

**Consequence:** The Edit workspace remains explicitly incomplete: it does not yet offer undo/redo, structural candidate commands, validation, shadow comparison, or approval.
