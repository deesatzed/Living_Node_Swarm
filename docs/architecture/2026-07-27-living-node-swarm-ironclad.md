# Living Node Swarm — Ironclad Design Packet

**Artifact:** `Artifact-Ironclad-PassA-DesignPacket` + `Artifact-Ironclad-PassB-AuditAndRewrite`  
**Date:** 2026-07-27  
**Mode:** `architecture --mode=ironclad`  
**Inputs:** Confirmed product definition (planning interview); `01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md` (v0.2)

---

# Pass A — Design Packet Construction

## 0. Input Integration Summary

### Confirmed product definition (user-confirmed)

| Field | Value |
|---|---|
| Goal | Domain-agnostic shell: expert sees living predictive distributions update when nodes change |
| Primary user | Domain expert / analyst |
| Domain | Agnostic first (no vertical pack) |
| Interaction | Inspect & lightly edit graph UI + distribution views |
| Acceptance | Load small graph → edit one node → downstream distributions refresh |
| Latency UX | Label stale distributions + “updating…” (no fake freshness) |
| Out of scope | Multi-user, auth, multi-tenant, cloud deploy |
| Non-clinical | Required (foundation doc §7) |

### Design source of truth (docs)

- Principles + Node schema + loops: `01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md`
- Recommended slice in handoff: Prototype A (+ thin B) — **product acceptance does not require B for v0.1 shell**
- Workspace also contains `agno/cookbook` — **role not decided**; not assumed as runtime

### Assumptions (explicit)

1. Single-user, local process (laptop or local server).
2. First shippable shell optimizes for the **acceptance path**, not full agent swarm.
3. “Living” means re-simulation on material node change (or timer), not continuous wall-clock MC with no idle.
4. Graph size for v0.1 is small (tens of nodes), not enterprise-scale graphs.
5. LLM model choice is **user-owned** when agents are introduced; v0.1 shell need not call an LLM to meet acceptance.

---

## 1. Problem Frame & Success Criteria

### Problem

Experts need predictive systems where every quantity is an **inspectable probabilistic node**, not opaque model output. When a node changes, **downstream predictive distributions** must update in a way that is honest about freshness and provenance.

### Success criteria (falsifiable)

| ID | Criterion | Test that could fail |
|---|---|---|
| S1 | Expert can open a pre-seeded small graph | Graph loads with ≥3 nodes and edges visible |
| S2 | Expert can edit one node parameter or observation | Edit persists; version increments; UpdateEvent recorded |
| S3 | Downstream predictive distributions change after edit | At least one dependent node’s predictive distribution differs post-re-sim |
| S4 | During re-sim, UI shows “updating…” and marks distributions stale | No presentation of new numbers without completion; stale badge visible mid-run |
| S5 | Distributions are primary; mean/median are derived views only | API/UI expose family + parameters (or samples); point estimates labeled derived |
| S6 | Unapproved proposed nodes never enter active ensemble | Status=`proposed` excluded from active MC set |
| S7 | Single-user local; no auth surface | App starts with zero login; no multi-tenant tables |

**Primary product win condition:** S1–S4 in one vertical path.

---

## 2. Constraints, Non-Goals & Invariants

### Constraints

- Non-clinical / non-medical use (foundation §7).
- No multi-user, auth, multi-tenant, cloud deploy (product interview).
- No mock, placeholders, or cached fake simulation results (project rules).
- User selects all LLM model versions when AI is wired (project rules).
- Prefer narrow, vertically complete first slice (foundation §9).

### Non-goals (v0.1 shell)

- Latent expansion agents (Prototype B) as ship requirement
- MultiHopMotif library (Prototype C)
- BabelTele dense inter-agent + Agent_Pidgeon receipts (Prototype D) as ship requirement
- Multi-agent stigmergic swarm
- Production hosting, SSO, tenancy
- Guaranteeing expansion correctness
- General AutoML replacement

### Invariants (must hold in any implementation)

1. Active simulation never silently includes unapproved nodes.
2. Material changes produce UpdateEvent (receipts optional until Prototype D).
3. Distributions are primary; point estimates derived.
4. Human privilege actions recorded as first-class events.
5. Freshness is explicit: `fresh | stale | updating | failed`.

---

## 3. Candidate Architectures (≥3)

### A1 — Local Python kernel + web UI (SPA)

- **Kernel:** Python process owns graph store, MC engine, event log.
- **API:** FastAPI (local HTTP) with REST + SSE/WebSocket for sim status.
- **UI:** Lightweight SPA (React or Svelte) — graph canvas + distribution panels.
- **Pros:** Clear separation; real MC libraries (numpy/scipy); UI flexible; matches expert “product” feel.
- **Cons:** Two runtimes; packaging slightly heavier; CORS/local port friction.
- **Fit:** High for product definition (graph UI + distributions).

### A2 — Single-process Python UI (Streamlit / Gradio / NiceGUI)

- **Everything in one Python process**; widgets for graph and plots.
- **Pros:** Fastest path to a runnable surface; one language; easy MC.
- **Cons:** Graph edit UX is weak; “product shell” feels like a dashboard; harder graph canvas quality.
- **Fit:** Medium for acceptance demo; weak for inspect/edit graph as primary interaction.

### A3 — TypeScript monorepo (Node MC + React)

- **Pros:** One language across stack; strong UI ecosystem.
- **Cons:** MC/distribution ecosystem weaker than scientific Python for custom families; reinvent probability tooling.
- **Fit:** Medium if team is TS-first; lower fit given existing Python-adjacent agno tree and MC heritage.

### A4 — Agno-centric multi-agent OS first

- **Build swarm/agents first**, graph as side state.
- **Pros:** Aligns with long-term stigmergy vision; reuses workspace `agno/`.
- **Cons:** Misses product acceptance (distributions-on-edit); overbuilds coordination before core substrate; LLM dependency for a non-LLM acceptance path.
- **Fit:** Low for v0.1 product shell; high for later stages.

### Scoring (v0.1 product shell)

| Criterion | A1 | A2 | A3 | A4 |
|---|---|---|---|---|
| Meets S1–S4 | High | Med | High | Low |
| Graph edit UX | High | Low | High | Low |
| Real MC quality | High | High | Med | N/A first |
| Complexity budget | Med | Low | Med | High |
| Avoid premature agents | High | High | High | Low |

**Winner:** **A1** — Local Python kernel + web UI.

---

## 4. Selected Architecture (ADR)

### ADR-001: Python simulation kernel + local FastAPI + SPA UI

**Decision:** Implement Living Node Swarm v0.1 as:

1. **`lns-kernel`** — pure Python domain library (nodes, graph, ensemble MC, events).
2. **`lns-server`** — FastAPI local server exposing graph CRUD, sim trigger, freshness stream.
3. **`lns-ui`** — SPA: graph inspect/edit + distribution views + freshness badges.

**Rationale:** Separates falsifiable domain logic from UI; scientific Python for real sampling; matches expert UI requirement without forcing multi-agent stack.

**Consequences:**

- Must define stable JSON contracts for Node / Graph / SimulationSnapshot / UpdateEvent.
- UI never computes “authoritative” predictive distributions; kernel is source of truth.
- Packaging = `run kernel+server` + open UI (or single launcher script).

### ADR-002: OpenRouter LLM with user-selected models (v0.1)

**Decision (user override 2026-07-27):** v0.1 includes real OpenRouter calls for AI-assisted node proposal (thin latent expansion). Model id comes from `OPENROUTER_MODEL` / request body — **never baked in as a fixed product default**. Key: `OPENROUTER_API_KEY`. Manual node edit remains the primary acceptance path; LLM is additive.

**Rationale:** User requires OpenRouter and will choose models. Project rule: user selects all LLM model versions via OpenRouter.

**Consequences:** Server must fail clearly if key/model missing when AI endpoint is invoked. No mock LLM responses. Core graph+MC path works without LLM for offline kernel tests.

### ADR-003: SQLite for durability; in-memory optional for tests

**Decision:** Default store = SQLite file on disk (graph + events + snapshots). Tests may use temp SQLite, not fake results.

**Rationale:** Single-user, local, restart-safe; no multi-tenant DB.

### ADR-004: On-change ensemble re-simulation with explicit freshness

**Decision:** Material active-node change queues a simulation job; UI transitions to `updating` + `stale` until snapshot published; then `fresh`.

**Rationale:** Matches latency UX product decision; continuous wall-clock MC is optional timer later, not required for S1–S4.

---

## 5. Component Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│  lns-ui (SPA)                                               │
│  - GraphCanvas (nodes/edges, select, edit form)             │
│  - DistributionPanel (family, params, samples/histogram)    │
│  - FreshnessBadge (fresh|stale|updating|failed)             │
│  - GraphLoader (seed / open local graph id)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + SSE
┌───────────────────────────▼─────────────────────────────────┐
│  lns-server (FastAPI, localhost)                            │
│  - Graph API  - Node API  - Sim API  - Events API           │
│  - SimulationCoordinator (queue, cancel, status)            │
└───────────────────────────┬─────────────────────────────────┘
                            │ in-process calls
┌───────────────────────────▼─────────────────────────────────┐
│  lns-kernel                                                 │
│  - Node model + validation                                  │
│  - GraphStore (SQLite)                                      │
│  - DependencyResolver (downstream subgraph)                 │
│  - EnsembleEngine (Monte Carlo / analytic where exact)      │
│  - EventLog (UpdateEvent)                                   │
│  - SnapshotStore (SimulationSnapshot)                       │
└─────────────────────────────────────────────────────────────┘
```

### Contracts (minimum)

**Node (API subset for v0.1)** — from foundation schema, required fields:

- `id`, `name`, `distribution_family`, `parameters`, `depends_on`, `version`, `status`, `units?`, `support?`, `requires_human_approval?`, `created_by`, `last_updated_by`, timestamps

**UpdateEvent:** `id`, `node_id`, `old_version`, `new_version`, `reason`, `actor`, `timestamp`, `diff_summary`

**SimulationSnapshot:** `id`, `graph_version`, `node_predictives` (map node_id → predictive payload), `seed`, `n_samples`, `started_at`, `finished_at`, `status`

**Predictive payload:** `family` or `empirical_samples`, `parameters?`, `quantiles`, `derived_point_estimates` (labeled), `freshness`

**Freshness state (graph-level + per-node):** `fresh | stale | updating | failed`

### Responsibilities

| Component | Owns | Must not own |
|---|---|---|
| Kernel | Truth of graph, MC math, events | UI styling, auth |
| Server | Transport, job queue, process lifecycle | Alternate distribution math |
| UI | Presentation, edit forms, honesty of badges | Authoritative recompute of predictions |

---

## 6. Data Flow & State Model

### Truth locations

| State | Location of truth |
|---|---|
| Active graph topology + node params | GraphStore (SQLite) |
| Predictive distributions | Last successful SimulationSnapshot for active graph version |
| Edit history | EventLog |
| UI selection / layout positions | UI local (layout may be persisted later; not required) |

### Happy path: edit → re-sim → view

```
1. UI: PATCH /nodes/{id} { parameters | observation }
2. Server: Kernel.apply_update → version++, UpdateEvent, mark graph_version dirty
3. Server: SimulationCoordinator.enqueue(affected_subgraph)
4. SSE: freshness=updating; nodes in subgraph stale=true
5. Kernel.EnsembleEngine.run(active_nodes only, seed, n_samples)
6. SnapshotStore.save(SimulationSnapshot)
7. SSE: freshness=fresh; UI DistributionPanel binds to snapshot
```

### Active set rule

```
active_nodes = { n | n.status == "active" }
# proposed/deprecated/retired never sampled into ensemble
```

### Seed graph (v0.1 demo)

Minimal domain-agnostic chain, e.g.:

- `N1` ~ prior input (Normal)
- `N2` depends on N1 (transformed / sum of samples)
- `N3` depends on N2

Editing N1 must change N2 and N3 predictives under S3.

---

## 7. Failure Modes & Mitigations

| Failure | Detection | Containment | Recovery |
|---|---|---|---|
| MC too slow | Job exceeds soft timeout; UI stays updating | Keep last snapshot; stale badge remains | Cancel job; show failed + last good |
| Invalid parameters | Schema validation on write | Reject PATCH; no version bump | User corrects form |
| Cyclic depends_on | Cycle check on write | Reject edge | User fixes graph |
| Crash mid-sim | Snapshot status incomplete; no fresh promote | Do not replace last good snapshot | Restart; re-queue or mark failed |
| Empty active graph | Validate before run | No-op sim with error code | Seed graph / activate nodes |
| UI disconnect | SSE reconnect | Kernel continues | UI reloads snapshot + status |
| Silent inclusion of proposed nodes | Invariant test: proposed excluded | EnsembleEngine filters status | Fail test in CI |

---

## 8. Clarifying Questions + Risk Exposures

### Non-blocking for plan (defaults applied)

| Topic | Default if unanswered |
|---|---|
| UI framework | Svelte or React — plan picks **React + Vite** for ecosystem; swapable |
| MC sample count default | 2000 samples, fixed seed optional |
| Exact analytic vs MC | MC always for v0.1 simplicity; analytic optimization later |
| agno integration | **Deferred** until Prototype B |
| Desktop packaging | Launcher script only; no installer |

### Blocking only if user rejects defaults

1. Preferred UI stack (React vs Svelte vs other)?
2. Preferred Python package layout monorepo root name?
3. Must SQLite path be user-configurable on day one?

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Scope creep into agents | High | ADR-002; acceptance tests exclude LLM |
| Graph UI too hard | Med | Start with simple force-layout + side edit form |
| MC performance on larger graphs | Med | Subgraph invalidation; small seed graph |
| Divergence between two principles docs | Low | Treat v0.2 2NODE schema as SoT |

---

# Pass B — First-Principles + Alien Goggles Audit & Rewrite

## B1. Faults, Assumptions, Ambiguities Found in Pass A

1. **“Continuous” MC vs on-change** — product language says living; Pass A uses on-change. Ambiguity risk.
2. **Layout persistence** — not specified; experts may expect positions to stick.
3. **Observation vs parameter edit** — both mentioned; data model for observations under-specified for v0.1.
4. **Distribution families** — open-ended string list; unbounded implementation risk.
5. **React default** — convention, not first-principles necessity.
6. **FastAPI** — convention; could be stdlib HTTP for fewer deps.
7. **n_samples=2000** — unvalidated for UX latency.
8. **Prototype B omitted** — correct for product acceptance but diverges from handoff “recommended first slice A+thin B”.
9. **No receipt chain** — weakens audit story vs foundation invariants.
10. **Seed graph content** — domain-agnostic numbers may feel meaningless to experts.

## B2. First-Principles Re-derivation

**What must exist for the product claim to be true?**

1. A set of named quantities with explicit distributions.
2. Explicit dependency structure.
3. A procedure that produces predictive distributions for dependents given parents.
4. A way for a human to change a quantity and observe dependents change.
5. A way to know whether what they see is current.

**What need not exist?**

- Agents, motifs, dense codes, multi-user, cloud, LLM.
- Full foundation schema fields on day one (can grow).
- Continuous wall-clock spinning if every material change triggers recompute and freshness is honest.

**Minimal machine:**

```
Graph = (Nodes, Edges)
Edit(node) → Version++
Predict(Graph_active) → Snapshot
Present(Snapshot, Freshness)
```

## B3. Alien Goggles Divergence

**Alternative:** **No HTTP, no SPA** — pure local TUI + matplotlib, or Jupyter only.

| Score | Web A1 | Alien “notebook kernel only” |
|---|---|---|
| Product interaction (graph UI) | High | Fail (unless forced) |
| Honesty / real MC | High | High |
| Complexity | Med | Low |
| Expert non-coder fit | High | Low |

**Keep A1** for product fit; use notebook only as optional debug harness, not the product.

**Second alien idea:** **CRDT multiplayer graph** — reject (out of scope multi-user).

**Third alien idea:** **Distributions only as sample tables in SQLite, no parametric families** — pure empirical. Simplifies MC composition; hurts compact editing of “Normal(μ,σ)”. **Hybrid:** parametric input, empirical predictive snapshots (samples + quantiles) for dependents.

## B4. Revised Architecture (Final)

### Changes from Pass A

1. **Clarify “living”:** v0.1 = **on material change** re-simulation + optional idle refresh later. Document as Living-On-Change, not wall-clock continuous.
2. **Cap distribution families for v0.1:** `Normal`, `LogNormal`, `Beta`, `Deterministic` (degenerate). Expand later.
3. **Observation model:** optional `last_observation` on node; applying observation updates posterior parameters only for families with explicit rule, else stores observation and leaves params (documented). **Simplest v0.1:** edit parameters only; observations deferred if they complicate priors.
4. **Predictive representation:** parents may be parametric; **ensemble outputs always store samples + quantiles** for dependents (empirical predictive), plus derived mean/median labeled. **Transforms:** implement multiple strategies (`affine`, `sum_parents`, `mean_parents`); run experiment harness to recommend default — not locked without evidence.
5. **Events:** UpdateEvent mandatory; Receipt optional table stub not required until D.
6. **UI layout:** node x/y in UI state persisted in SQLite `node_layout` (nice for experts; small cost).
7. **Invariant tests first:** proposed-node exclusion, freshness transitions, S1–S4 path.
8. **Handoff A+B conflict:** Plan targets product acceptance (A). Thin B is **Phase 2**, not v0.1 exit gate.
9. **Launcher:** one command starts server and opens UI; single-user localhost bind `127.0.0.1` only.
10. **Dependency budget:** Python 3.11+, FastAPI, uvicorn, numpy, scipy (or numpy-only sampling), SQLite stdlib; UI Vite + React + a minimal graph library (e.g. `@xyflow/react` or similar).

### Final component list (v0.1)

- `packages/lns_kernel` — domain
- `packages/lns_server` — FastAPI
- `packages/lns_ui` — SPA
- `data/seed_graph.json` — domain-agnostic demo graph
- `tests/` — kernel + API contract + invariant tests
- `scripts/run_local.sh` — start stack on localhost

### API surface (v0.1 minimum)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/graphs/{id}` | graph + nodes + edges + layout |
| POST | `/graphs` | create from seed or empty |
| PATCH | `/graphs/{id}/nodes/{node_id}` | edit params (material change) |
| GET | `/graphs/{id}/snapshot` | latest SimulationSnapshot |
| GET | `/graphs/{id}/events` | UpdateEvent list |
| GET | `/graphs/{id}/sim/status` | freshness + job state |
| GET | `/graphs/{id}/sim/stream` | SSE freshness updates |

### Verification harness (design-level)

- Unit: Node validation, cycle detect, active-set filter, MC seed reproducibility
- Integration: PATCH node → wait job → snapshot quantiles changed for dependents
- E2E (manual or Playwright later): load → edit → badge updating → fresh distributions

## B5. Questions Required Before Further Execution

**None blocking** if defaults accepted:

| Default | Value |
|---|---|
| Stack | Python kernel + FastAPI + React/Vite UI |
| Families | Normal, LogNormal, Beta, Deterministic |
| Edit surface v0.1 | Parameters (not full Bayesian observation update) |
| Scope exit | S1–S4 only; no LLM |
| Bind | 127.0.0.1 only |

User may override before implementation.

---

## Artifact Status

| Artifact | Status |
|---|---|
| `Artifact-Ironclad-PassA-DesignPacket` | Emitted |
| `Artifact-Ironclad-PassB-AuditAndRewrite` | Emitted |
| File | `docs/architecture/2026-07-27-living-node-swarm-ironclad.md` |

**Ready for:** `planning --mode=plan` (deterministic execution plan from this architecture).
