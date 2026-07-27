# Living Node Swarm v0.1 Shell — Implementation Plan

> **For execution agents:** Implement task-by-task. Do not skip validation gates. No mocks, placeholders, or fake simulation results. User selects all LLM model versions if agents are added later (not in this plan).

**Goal:** Ship a single-user local product shell where a domain expert loads a small graph, edits one node, and sees downstream predictive distributions refresh with honest freshness (`stale` / `updating` / `fresh`).

**Architecture:** Python `lns_kernel` (graph + ensemble MC + events) + FastAPI `lns_server` (localhost) + React/Vite `lns_ui` (graph inspect/edit + distribution views). See `docs/architecture/2026-07-27-living-node-swarm-ironclad.md`.

**Tech Stack:** Python 3.11+, numpy, FastAPI, uvicorn, SQLite (stdlib), httpx/openai-compatible client for **OpenRouter**, React, Vite, TypeScript, graph canvas (e.g. `@xyflow/react`), SSE for freshness.

**LLM (user-mandated):** OpenRouter only. Model id is **never hard-coded as a product default** — set via `OPENROUTER_MODEL` (and optional UI override). Key: `OPENROUTER_API_KEY`. User chooses models.

**Design SoT:** `docs/architecture/2026-07-27-living-node-swarm-ironclad.md`  
**Principles SoT:** `01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md` (v0.2)  
**Product acceptance:** S1–S4 from ironclad packet

---

## Phase 1 — Outcome Framing

### Testable Outcomes

| ID | Outcome | Test |
|---|---|---|
| O1 | Kernel validates nodes and rejects cyclic `depends_on` | Unit tests fail open / pass closed |
| O2 | Ensemble runs only on `status=active` nodes | Unit: proposed node never appears in snapshot |
| O3 | Material PATCH increments version, writes UpdateEvent | Integration test |
| O4 | Re-sim produces new snapshot; dependent quantiles change after parent edit | Integration test with fixed seed |
| O5 | Sim status transitions `fresh → updating/stale → fresh` (or `failed`) | API + optional SSE test |
| O6 | UI can load seed graph, edit node, show distributions + freshness badge | Manual E2E checklist (or Playwright when added) |
| O7 | Server binds `127.0.0.1` only | Config assertion / startup log check |

### Success Criteria (Non-Negotiable)

- Functional: O1–O7
- Quality: real sampling (numpy); no hard-coded fake distribution outputs
- Constraints: no auth, no multi-tenant, no cloud; **LLM via OpenRouter with user-selected model**
- Families v0.1 only: `Normal`, `LogNormal`, `Beta`, `Deterministic`
- Transforms: multiple strategies implemented; **experiment harness picks/report what works best** (not locked to affine only)

### Failure Modes (Pre-Mortem)

| Failure Mode | Detection | Mitigation |
|---|---|---|
| Scope creep into multi-agent OS | Full agno swarm without ADR | Thin OpenRouter node-proposal only in v0.1 |
| UI computes its own predictions | Code review / no MC libs in UI | UI only displays snapshot |
| Silent stale-as-fresh | Freshness tests | Badge + API status required |
| Ambiguous “continuous” MC | Spec drift | Living-On-Change only (ADR) |
| Unbounded distribution families | Open string without enum | Enum validation |

---

## Phase 2 — System Decomposition

### Core components

1. **Node / Graph models** — schema, validation, versioning  
2. **GraphStore** — SQLite persistence  
3. **EventLog** — UpdateEvent append-only  
4. **DependencyResolver** — downstream subgraph, cycle detection  
5. **EnsembleEngine** — sample parents → transform → predictive samples + quantiles  
6. **SimulationCoordinator** — job queue, freshness state  
7. **SnapshotStore** — last good + history  
8. **HTTP API** — graph/node/sim/events  
9. **UI** — canvas, edit form, distribution panel, freshness badge  
10. **Seed graph** — domain-agnostic 3-node chain  
11. **Launcher** — one command local run  

### Required inputs/outputs

| Input | Output |
|---|---|
| Seed JSON / empty graph | Persisted graph id |
| Node parameter patch | UpdateEvent + dirty graph + sim job |
| Active graph | SimulationSnapshot |
| Snapshot | UI histograms / quantiles |

---

## Phase 3 — Deterministic Execution Plan

### Repo layout (create)

```text
/Volumes/WS4TB/agno314/
  docs/architecture/2026-07-27-living-node-swarm-ironclad.md  # exists
  docs/plans/2026-07-27-living-node-swarm-v0.1.md             # this file
  packages/
    lns_kernel/
      pyproject.toml
      src/lns_kernel/
        __init__.py
        models.py
        validation.py
        store.py
        events.py
        dependencies.py
        ensemble.py
        simulation.py
      tests/
    lns_server/
      pyproject.toml
      src/lns_server/
        __init__.py
        app.py
        routes.py
        deps.py
      tests/
    lns_ui/
      package.json
      vite.config.ts
      src/
        main.tsx
        App.tsx
        api/client.ts
        components/GraphCanvas.tsx
        components/NodeEditor.tsx
        components/DistributionPanel.tsx
        components/FreshnessBadge.tsx
  data/seed_graph.json
  scripts/run_local.sh
  README.md
```

---

### Step 1: Scaffold packages and tooling

**Action:** Create monorepo dirs, `pyproject.toml` for kernel and server, minimal UI package.json, root README stating v0.1 scope and non-goals.  
**Input:** This plan + ironclad ADR-001  
**Output:** Importable empty packages; `pytest` discoverable; `npm` installable  
**Validation:** `python -c "import lns_kernel"` after editable install; `npm -C packages/lns_ui -v`  
**Failure Handling:** Fix path/package name; do not proceed until imports work  

---

### Step 2: Node & graph models (kernel)

**Action:** Implement Pydantic (or dataclass+validation) models:

- `Node`: id, name, distribution_family (enum), parameters (map), depends_on (list[str]), version (int), status (enum: proposed|active|deprecated|retired), units optional, support optional, created_by, last_updated_by, timestamps  
- `Graph`: id, nodes map, layout map optional  
- `UpdateEvent`, `SimulationSnapshot`, `PredictivePayload`, `Freshness` enum  

**Input:** Foundation schema §2 (subset)  
**Output:** `models.py`  
**Validation:** Unit tests for serialization round-trip  
**Failure Handling:** Align field names with ironclad contracts before store work  

---

### Step 3: Validation & dependency resolver

**Action:**

- Validate family ∈ {Normal, LogNormal, Beta, Deterministic}  
- Validate parameters per family (e.g. Normal requires mu, sigma>0; Beta a>0,b>0)  
- Cycle detection on `depends_on`  
- `downstream(node_id) -> set[node_id]`  

**Input:** models  
**Output:** `validation.py`, `dependencies.py`  
**Validation:** Tests for cycle reject; diamond graph downstream set  
**Failure Handling:** Fix graph algorithms; no store until pure functions green  

---

### Step 4: SQLite GraphStore + EventLog

**Action:** Persist graphs, nodes, layout, events. Real SQLite file (temp path in tests).  

**Operations:**

- create_graph, get_graph  
- upsert_node / patch_node_parameters (version++, actor, reason)  
- list_events  
- never auto-activate `proposed`  

**Input:** models, validation  
**Output:** `store.py`, `events.py`  
**Validation:** Integration test: patch → version 2 → event row exists  
**Failure Handling:** Migration simple v1 schema; recreate in tests  

---

### Step 5: EnsembleEngine (real Monte Carlo)

**Action:**

- Sample each active root from its parametric family (numpy)  
- For dependents: v0.1 composition rule — **explicit, documented**:  
  - Default seed graph uses simple transforms: e.g. `N2 = N1 + noise`, `N3 = N2 * scale` where noise/scale are node params OR  
  - v0.1 uses `depends_on` + a node field `transform` enum: `identity_sum_parents | affine` with params  
- Prefer **explicit transform field** on node for determinism over free-form code  
- Output empirical samples (array), quantiles (p05,p50,p95), derived mean/std labeled as derived  
- Fixed seed → identical samples (reproducibility test)  
- Filter: only `status=active`  

**Input:** active subgraph  
**Output:** `ensemble.py`  
**Validation:**

- Same seed → same quantiles  
- Proposed node excluded  
- Edit parent params → child quantiles change (with high probability / deterministic seed path)  

**Failure Handling:** If transforms too vague, implement only `affine` over parents: `y = a0 + sum(a_i * parent_i) + eps` with eps from node family  

**DO NOT:** return hard-coded arrays that ignore parameters  

---

### Step 6: SimulationCoordinator + SnapshotStore

**Action:**

- On material change: set freshness `updating`, mark affected nodes `stale`  
- Run ensemble  
- Save snapshot with graph_version, seed, n_samples  
- Set freshness `fresh` or `failed`  
- Keep last good snapshot on failure  

**Input:** store + ensemble  
**Output:** `simulation.py`  
**Validation:** State machine tests for freshness transitions  
**Failure Handling:** Timeouts mark `failed`; last good retained  

---

### Step 7: FastAPI server

**Action:** Implement routes from ironclad B4:

| Method | Path |
|---|---|
| GET | `/health` |
| POST | `/graphs` |
| GET | `/graphs/{id}` |
| PATCH | `/graphs/{id}/nodes/{node_id}` |
| GET | `/graphs/{id}/snapshot` |
| GET | `/graphs/{id}/events` |
| GET | `/graphs/{id}/sim/status` |
| GET | `/graphs/{id}/sim/stream` (SSE) |

Bind **127.0.0.1** only. Wire coordinator so PATCH triggers sim.

**Input:** kernel  
**Output:** `lns_server` app  
**Validation:** `httpx`/`TestClient` integration: create from seed → patch → status → snapshot dependents changed  
**Failure Handling:** Fix contract mismatches before UI  

---

### Step 8: Seed graph data

**Action:** `data/seed_graph.json` — domain-agnostic 3-node chain:

- `input_signal` — Normal(0, 1), active  
- `process_stage` — depends on input; affine transform; active  
- `outcome` — depends on process_stage; active  

All active; no proposed nodes in default path.

**Input:** ensemble transform rules  
**Output:** seed file loaded by POST `/graphs` body `{ "from_seed": "default" }`  
**Validation:** Server test loads seed; 3 nodes visible  
**Failure Handling:** Align ids with UI labels  

---

### Step 9: UI — shell + API client + freshness

**Action:**

- Vite React TS app  
- API client for routes + EventSource for SSE  
- `FreshnessBadge` component  
- App loads default graph on start (create if none)  

**Input:** server contracts  
**Output:** `lns_ui`  
**Validation:** Manual: badge shows updating during slow sim (can lower n_samples or add test delay flag **only if real sleep**, not fake data)  
**Failure Handling:** Prefer polling `/sim/status` if SSE flaky; both allowed  

---

### Step 10: UI — GraphCanvas + NodeEditor

**Action:**

- Render nodes/edges from GET graph  
- Select node → editor form for parameters (family-specific fields)  
- Save → PATCH → wait for fresh  
- Persist layout via PATCH layout endpoint **or** include layout in graph PUT (add `PATCH .../layout` if needed — if missing from minimal API, add in this step: `PUT /graphs/{id}/layout`)  

**Input:** graph JSON  
**Output:** canvas + editor  
**Validation:** Manual E2E checklist O6  
**Failure Handling:** If graph lib blocked, fallback to HTML list of nodes + SVG edges (still real data)  

---

### Step 11: UI — DistributionPanel

**Action:**

- Show selected node’s predictive from snapshot (samples histogram or quantile summary)  
- Label derived mean/median as derived  
- When stale/updating, visually dim and show badge — **do not invent numbers**  

**Input:** snapshot + freshness  
**Output:** panel  
**Validation:** After edit, outcome quantiles differ from pre-edit captured values  
**Failure Handling:** Show “no snapshot yet” empty state without fake charts  

---

### Step 12: Launcher + README

**Action:**

- `scripts/run_local.sh`: start uvicorn on 127.0.0.1:8787, optionally print UI dev URL  
- README: purpose, how to run, acceptance path, non-goals, link to ironclad + this plan  

**Input:** working server + UI  
**Output:** runnable path for expert demo  
**Validation:** Clean shell: follow README only → achieve O6  
**Failure Handling:** Fix README drift against real commands  

---

### Step 13: Verification suite gate

**Action:** Run full automated tests; execute manual E2E checklist; record results in `docs/plans/2026-07-27-v0.1-verification-log.md` with pass/fail evidence (commands + outcomes).  

**Input:** all prior steps  
**Output:** verification log  
**Validation:** 100% of automated tests pass; manual O6 pass. If any fail → action plan for gap (project rule).  
**Failure Handling:** Do not claim complete; open gap list  

---

## Phase 4 — To-Do Checklist (Operator Mode)

- [ ] Step 1: Scaffold packages, installs, empty imports
- [ ] Step 2: Models + round-trip tests
- [ ] Step 3: Validation + dependency resolver tests
- [ ] Step 4: SQLite store + events tests
- [ ] Step 5: EnsembleEngine real MC + reproducibility + active-only tests
- [ ] Step 6: SimulationCoordinator freshness state machine tests
- [ ] Step 7: FastAPI routes + TestClient integration (edit → snapshot change)
- [ ] Step 8: Seed graph JSON + load path
- [ ] Step 9: UI shell, client, freshness badge
- [ ] Step 10: Graph canvas + node parameter editor
- [ ] Step 11: Distribution panel (snapshot-backed only)
- [ ] Step 12: `run_local.sh` + README acceptance path
- [ ] Step 13: Full verification log; no unfixed test failures

---

## Phase 5 — Anti-Drift Safeguards

### Checkpoints

| After | Gate |
|---|---|
| Step 3 | Pure domain logic green — no UI yet |
| Step 6 | Kernel can complete load→edit→resim without HTTP |
| Step 7 | API contract locked before UI polish |
| Step 11 | Acceptance S1–S4 demonstrable |
| Step 13 | Verification log signed off |

### Forced re-alignment

If implementation diverges from product acceptance (e.g. adding agno agents):

1. Stop  
2. Diff against ironclad ADR-002  
3. Revert or open new ADR + user approval  
4. Resume only from last green checkpoint  

### DO NOT

- Add multi-user, auth, cloud deploy  
- Add LLM/agno for v0.1  
- Mock MC outputs  
- Skip freshness states  
- Expand distribution families without test + plan edit approval  
- Claim “production ready” while checklist open  

---

## Phase 6 — Verification Harness

### Unit

```bash
cd packages/lns_kernel && pytest -v
```

Expected: all pass (models, cycles, active filter, seed reproducibility, quantile change).

### Integration (API)

```bash
cd packages/lns_server && pytest -v
```

Expected: create seed → patch `input_signal` params → snapshot `outcome` quantiles ≠ baseline.

### Freshness

- After PATCH, status is `updating` or transitions through it before `fresh`  
- On forced engine error, `failed` + last good snapshot still GET-able  

### Manual E2E

1. Start stack via README  
2. Open UI  
3. See 3-node graph  
4. Select `input_signal`, change `mu` or `sigma`  
5. Observe badge updating/stale  
6. Observe `outcome` distribution change  
7. Confirm no login wall  

### Pass/fail

| Case | Pass condition |
|---|---|
| S1 | Graph loads with ≥3 nodes |
| S2 | Edit persists; version/event exist |
| S3 | Dependent predictive changes |
| S4 | Stale/updating visible; no fake fresh numbers |
| S5 | Point estimates labeled derived |
| S6 | (Unit) proposed excluded |
| S7 | Bind 127.0.0.1 |

---

## Phase 7 — Output Format Notes

- This plan is the **playbook / contract / testable specification** for v0.1.  
- Execution produces code under `packages/` and verification log under `docs/plans/`.  
- Phase 2 (not this plan): thin latent expansion agent, motifs, receipts, dense comms, agno role.  

### Explicit open items (non-blocking; defaults held)

| Item | Default |
|---|---|
| Graph library | `@xyflow/react` or HTML fallback |
| n_samples | 2000 (tune if UI latency poor; document change) |
| UI port | 5173 (Vite); API 8787 |
| Transform model | affine-over-parents + eps from family |

### Phase 2 backlog (out of this plan)

- Prototype B thin latent expansion  
- MultiHopMotif  
- Receipts / BabelTele  
- Observation/Bayesian update  
- agno integration decision  

---

## Plan Confirmation Gate

**User confirmation required before code execution** if this session only produced plans.

Confirm or modify:

1. Stack defaults (Python + FastAPI + React) OK?  
2. No LLM in v0.1 OK?  
3. Affine transform model for dependents OK?  
4. Proceed to implementation (Stage 2 / execute plan)?  

---

**End of plan**  
**Files:**  
- Architecture: `docs/architecture/2026-07-27-living-node-swarm-ironclad.md`  
- Plan: `docs/plans/2026-07-27-living-node-swarm-v0.1.md`
