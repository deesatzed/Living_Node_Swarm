# Living Node Swarm — Handoff Packet
**Generated:** 2026-07-27  
**Branch:** main @ 7a9339b  
**Last Commit:** 2026-07-27 — Add wire-into-chain so activated factors can affect downstream nodes.  
**Remote:** https://github.com/deesatzed/Living_Node_Swarm.git  

---

## Quick Resume Checklist
- [ ] Clone/pull and checkout `main` (`git pull origin main`)
- [ ] Copy `.env.example` → `.env`; set `OPENROUTER_API_KEY`, `MODEL_REASONING`, `MODEL_FAST`, optional `OPENROUTER_MODEL` (user chooses OpenRouter model ids — never hard-code as sole product default)
- [ ] Install: kernel + server editable + UI `npm install` (see How to Run)
- [ ] Verify: kernel 17 tests + server 9 tests pass; or run full suite below
- [ ] Review **Current Blockers** and **Next Steps** below
- [ ] Restart API/UI after pull if processes were already running (code changes require restart)

## AI Continuity Checklist
- [ ] Latest handoff reviewed (`HANDOFF_LATEST.md` or this file)
- [ ] Open assumptions imported (see Open Questions)
- [ ] Open debt items imported (Known Issues)
- [ ] Open error references imported (propose/normalize history)
- [ ] Verification suite executed
- [ ] Next actions prioritized (P0/P1/P2)

---

## What This Project Does

Living Node Swarm is a **domain-agnostic**, single-user local product shell: every important quantity is an **explicit probabilistic node** with a distribution; **on-change ensemble Monte Carlo** keeps predictive distributions current; experts **inspect/edit a graph UI** with honest **freshness** (`stale` / `updating` / `fresh`); AI may **propose** new nodes via **OpenRouter** (user-selected models); humans **activate/reject** proposals and can **wire** factors into the dependency chain so downstream outcomes move.

**Tech Stack:** Python 3.11+ (3.13 verified), numpy, pydantic, FastAPI, uvicorn, SQLite, httpx, React 19, Vite 6, TypeScript  
**Architecture Pattern:** Local monorepo (kernel library + FastAPI server + SPA UI); localhost only; no multi-tenant cloud  

**Product definition (user-confirmed):** Primary user = domain expert/analyst; hero outcome = living predictive distributions that update when nodes change; multi-user/auth/cloud out of scope for current shell; non-clinical.

---

## Project Structure
```
Living_Node_Swarm / (workspace: /Volumes/WS4TB/agno314)
├── packages/
│   ├── lns_kernel/     # Domain: nodes, graph, SQLite, ensemble MC, seed
│   ├── lns_server/     # FastAPI, OpenRouter, propose normalize, wire API
│   └── lns_ui/         # React inspect/edit/propose/activate/wire UI
├── scripts/
│   ├── run_local.sh    # API on 127.0.0.1:8787, loads repo .env
│   └── run_ui.sh       # Vite on 127.0.0.1:5173, proxies /api
├── data/seed_graph.json
├── docs/
│   ├── architecture/2026-07-27-living-node-swarm-ironclad.md
│   └── plans/          # v0.1 plan, verification log, v0.2 wire plan
├── 01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md   # principles + schema SoT (v0.2)
├── 01_PRINCIPLES_AND_LIVING_NODE_SCHEMA.md    # earlier principles draft
├── README.md
├── .env.example        # no secrets
├── .gitignore          # .env, agno/, node_modules, dbs
└── HANDOFF_*.md        # this packet family
```

**Local-only (not in git):** `.env` (secrets), `agno/` third-party cookbook (gitignored), `~/.lns/lns.db` default SQLite path.

**Entry Points:**
- `packages/lns_server/src/lns_server/app.py` — FastAPI app (`create_app`, module-level `app`)
- `scripts/run_local.sh` / `scripts/run_ui.sh` — operator launchers
- `packages/lns_ui/src/main.tsx` / `App.tsx` — UI entry

**Key Modules:**

| Module | Path | Purpose | Status |
|--------|------|---------|--------|
| Kernel models | `packages/lns_kernel/src/lns_kernel/models.py` | Node, Graph, Snapshot, Freshness, transforms | ✅ |
| Validation | `.../validation.py` | Family params, graph checks | ✅ |
| Dependencies | `.../dependencies.py` | Cycles, topo, downstream | ✅ |
| Ensemble | `.../ensemble.py` | Real numpy MC + transform experiments | ✅ |
| Store | `.../store.py` | SQLite, patch, activate, delete, **wire_parent** | ✅ |
| Simulation | `.../simulation.py` | Coordinator + freshness | ✅ |
| Seed | `.../seed.py` | 3-node demo chain | ✅ |
| Settings | `packages/lns_server/src/lns_server/settings.py` | `.env` from repo root; MODEL_REASONING/FAST | ✅ |
| OpenRouter | `.../openrouter.py` | Real chat completions + JSON extract | ✅ |
| Proposal normalize | `.../proposal_normalize.py` | Alpha/beta, fences, id collisions | ✅ |
| API | `.../app.py` | Graph CRUD, sim, propose, activate, reject, **wire** | ✅ |
| UI | `packages/lns_ui/src/*` | Graph, editor, distributions, propose, wire | ✅ |

---

## How to Run

### Local Development
```bash
cd /path/to/Living_Node_Swarm   # or /Volumes/WS4TB/agno314

# One-time
cp .env.example .env
# Edit .env: OPENROUTER_API_KEY, MODEL_REASONING, MODEL_FAST, optional OPENROUTER_MODEL

cd packages/lns_kernel && uv pip install -e ".[dev]"   # or pip install -e .
cd ../lns_server && uv pip install -e ".[dev]"
cd ../lns_ui && npm install
cd ../..

# Run (two terminals)
./scripts/run_local.sh    # http://127.0.0.1:8787
./scripts/run_ui.sh       # http://127.0.0.1:5173
```

**Expected:** UI header shows `API ok · key set · default <model> · slots: reasoning=..., fast=..., default=...`. Seed graph with 3 nodes; **fresh** after load.

### Acceptance path (manual, validated 2026-07-27 by user)
1. Load seed → edit `input_signal` mu → outcome quantiles change  
2. Propose node (OpenRouter) → dashed **proposed** node  
3. **Activate → re-sim** → active + histogram  
4. **Wire into** e.g. `process_stage` → re-sim → edge + downstream can feel factor  
5. Compare transforms on dependent nodes (optional)

### Tests
```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -v
# expect: 17 passed

cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -v
# expect: 9 passed
```
**Current Status (2026-07-27):** 17 + 9 = **26 passing**, 0 failing, 0 skipped  
**Known Failures:** none  

### Verification Suite
```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q && \
cd ../lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
```
**Pass Condition:** both suites exit 0; kernel prints `17 passed`; server prints `9 passed`.

**Live OpenRouter (optional, costs tokens):** UI Propose with model from `.env`; requires real key — no mocks.

---

## Current State Assessment

### What's Working ✅
- Kernel MC, SQLite, events, proposed exclusion from ensemble — unit tests  
- API seed create, patch, transform experiment, activate/reject, wire — tests + manual  
- UI graph inspect/edit, freshness badge, propose, activate/reject, wire control  
- OpenRouter multi-slot models (reasoning / fast / OPENROUTER_MODEL) from `.env`  
- Proposal normalization (Beta alpha/beta, markdown fences, id collisions)  
- User-validated: edit→resim, propose, activate with real key and models  
- GitHub remote `main` pushed through wire feature  

### What's Incomplete ⚠️
- README still titled “v0.1 shell” while v0.2 wire is shipped — docs lag  
- No Playwright/browser automated E2E  
- Wire does not auto-suggest child from AI rationale  
- No residual-triggered auto-propose (Prototype B thin automation)  
- No multi-hop motif library (Prototype C)  
- No BabelTele / receipts (Prototype D)  
- UI graph layout is absolute-position seed; limited layout editing  
- Typecheck: `tsc -b` not verified in this handoff run  
- Lint: no project-level ruff/eslint CI configured  

### What's Broken ❌
- None known in automated suites  
- Historical: raw LLM proposals without normalize caused 400/500-like UX (mitigated by `proposal_normalize` + error detail handler)  

### Current Blockers 🚧
- None for local development  
- OpenRouter quota/model availability is external (user-owned keys and model picks)  

### Feature Completion Matrix
| Feature | Status | Evidence | Gap to Done | Priority |
|---------|--------|----------|-------------|----------|
| Explicit nodes + seed graph | ✅ | `seed.py`, seed create API | — | P0 done |
| On-change MC + freshness | ✅ | `simulation.py`, UI badge; user manual | — | P0 done |
| Graph UI inspect/edit | ✅ | `lns_ui` App/NodeEditor; user manual | polish layout | P0 done |
| OpenRouter propose | ✅ | `openrouter.py`, user manual 3 models | — | P0 done |
| Activate / reject proposed | ✅ | API + UI; user manual | — | P0 done |
| Wire into dependency chain | ✅ | `wire_parent`, tests, commit 7a9339b | user re-verify after pull | P0 done |
| Transform experiment | ✅ | API + UI button | lock default from evidence | P1 |
| Residual-triggered propose | ⚠️ | design only | implement trigger + UI | P1 |
| Motifs / dense / receipts | ⚠️ | principles doc only | full prototypes C/D | P2 |
| Multi-user / cloud / auth | ❌ | out of scope | explicit non-goal | — |
| Clinical | ❌ | deferred | non-goal | — |

---

## Recent Changes

| Date | SHA | Change | Why |
|------|-----|--------|-----|
| 2026-07-27 | 7a9339b | Wire-into-chain API + UI | Activated side-branch factors could not affect outcome until parent edge existed |
| 2026-07-27 | ba4d096 | Initial v0.1 shell monorepo | Product shell: kernel, server, UI, docs; OpenRouter propose/activate |

**Uncommitted Changes:** none (`git status` clean)  
**Stashed Work:** none  

**Session work not fully reflected in README version string:** activate/reject, proposal normalize, multi-model `.env`, wire — all in commits above except handoff files (this packet is new).

---

## Configuration & Secrets

### Environment Variables
| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `OPENROUTER_API_KEY` | Auth to OpenRouter for propose | OpenRouter dashboard; local `.env` only |
| `MODEL_REASONING` | Preferred default model id | User choice on openrouter.ai |
| `MODEL_FAST` | Alternate faster/cheaper model | User choice |
| `OPENROUTER_MODEL` | Optional third/default alias | User choice |
| `LNS_DB_PATH` | SQLite file path | Optional; default `~/.lns/lns.db` |
| `LNS_HOST` / `LNS_PORT` | API bind | Optional; default 127.0.0.1:8787 |

**Never commit `.env`.** Template: `.env.example`.

### External Dependencies
| Service | Purpose | Local Alternative |
|---------|---------|-------------------|
| OpenRouter API | LLM node proposals | Kernel/API graph path works without key; propose fails closed |
| (none) multi-tenant DB | — | SQLite local file |

---

## Known Issues & Tech Debt
- [ ] README version label still “v0.1” while wire is v0.2 — update docs for newcomers  
- [ ] No CI workflow (`.github/workflows`) on remote yet  
- [ ] Ensemble affine multi-parent weights: wiring appends `a{n}`; expert may need UI for per-parent weights beyond default 1.0  
- [ ] Propose can still produce low-value graph structure (side branch only) — wire is manual  
- [ ] `notes2.md` present in repo — purpose unclear; review/remove if noise  
- [ ] Large sample arrays in API snapshots — fine for n=2000 keep-subset; watch payload size if n grows  
- [ ] Exception handler returns trace_tail in 500 responses — OK for single-user local; do not use that pattern if ever multi-tenant  

---

## Next Steps (Priority Order)

1. **P0 — User re-verify wire after restart** — Restart `./scripts/run_local.sh` + `./scripts/run_ui.sh`; wire `process_capacity` → `process_stage`; confirm outcome moves when capacity params change. Done = manual row in verification log.  
2. **P1 — Doc sync** — Bump README to current feature set (propose/activate/wire/models); link handoff. Done = README matches reality.  
3. **P1 — Residual-triggered thin expansion** — When calibration/residuals exceed threshold, offer propose with context. Done = test + optional UI button, no silent auto-activate.  
4. **P1 — CI** — GitHub Actions: pytest kernel+server on push. Done = green check on `main`.  
5. **P2 — Richer affine weight editing in UI** — Expose a2,a3… for multi-parent nodes.  
6. **P2 — Motifs / receipts** — Only after residual loop proves value.  

---

## Key Files Reference
| File | Purpose | When to Modify |
|------|---------|----------------|
| `packages/lns_kernel/src/lns_kernel/store.py` | Persistence + wire/activate/delete | Graph mutation semantics |
| `packages/lns_kernel/src/lns_kernel/ensemble.py` | MC math + transform compare | Sampling/composition rules |
| `packages/lns_server/src/lns_server/app.py` | HTTP surface | New endpoints |
| `packages/lns_server/src/lns_server/settings.py` | Env model slots | New config vars |
| `packages/lns_server/src/lns_server/proposal_normalize.py` | LLM → Node | Bad model JSON patterns |
| `packages/lns_ui/src/App.tsx` | UI orchestration | New user flows |
| `docs/architecture/2026-07-27-living-node-swarm-ironclad.md` | Design SoT | Architecture ADRs |
| `01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md` | Principles + Node schema | Conceptual SoT |
| `docs/plans/2026-07-27-v0.1-verification-log.md` | Evidence log | After manual validation |

---

## Open Questions / Decisions Needed
- Should **activate** optionally auto-wire to a suggested child (AI-hinted) or stay always manual?  
- Default transform after experiments: keep multi-strategy or lock affine?  
- Whether to vendor `agno/` later as submodule vs keep gitignored reference  
- Packaging: single launcher vs two scripts long-term  

---

## Assumptions (active)
1. Single-user localhost is correct for current product stage.  
2. User owns all OpenRouter model selection and keys.  
3. No mock LLM or mock MC data allowed.  
4. v0.2 wire is the latest product increment on top of validated v0.1 path.  
5. Principles doc non-clinical constraint holds.  

---

## Appendix: Machine-Readable Summary
```json
{
  "project": "Living Node Swarm",
  "generated": "2026-07-27",
  "repo": {
    "remote": "https://github.com/deesatzed/Living_Node_Swarm.git",
    "branch": "main",
    "commit": "7a9339b080381cee0ed087e5c3273c58246ead2b",
    "commit_date": "2026-07-27T10:31:50-04:00",
    "uncommitted_changes": false,
    "stashed_work": 0
  },
  "stack": {
    "language": "Python",
    "language_version": ">=3.11 (verified 3.13.9)",
    "framework": "FastAPI + React/Vite",
    "framework_version": "fastapi>=0.115, react^19, vite^6",
    "mc": "numpy",
    "llm": "OpenRouter (user-selected models)"
  },
  "health": {
    "tests_passing": 26,
    "tests_failing": 0,
    "tests_skipped": 0,
    "lint_clean": null,
    "type_check_clean": null
  },
  "status": {
    "working": [
      "kernel_mc",
      "sqlite_store",
      "api_seed_patch_sim",
      "openrouter_propose",
      "activate_reject",
      "wire_into_chain",
      "ui_shell",
      "user_manual_v0.1_path"
    ],
    "incomplete": [
      "readme_version_label",
      "ci",
      "residual_triggered_propose",
      "motifs_receipts",
      "browser_e2e_automation"
    ],
    "broken": [],
    "blockers": []
  },
  "continuity": {
    "previous_handoff_loaded": false,
    "assumptions_imported": 5,
    "debt_items_imported": 6,
    "error_refs_imported": 1
  },
  "feature_completion_matrix": [
    {"feature": "living_graph_mc", "status": "✅", "evidence": "packages/lns_kernel/tests/test_ensemble.py", "priority": "P0"},
    {"feature": "ui_edit_freshness", "status": "✅", "evidence": "packages/lns_ui/src/App.tsx", "priority": "P0"},
    {"feature": "openrouter_propose_activate", "status": "✅", "evidence": "packages/lns_server/src/lns_server/app.py", "priority": "P0"},
    {"feature": "wire_chain", "status": "✅", "evidence": "packages/lns_kernel/src/lns_kernel/store.py", "priority": "P0"},
    {"feature": "residual_auto_propose", "status": "⚠️", "evidence": "docs/plans only", "priority": "P1"},
    {"feature": "motifs_dense_receipts", "status": "⚠️", "evidence": "01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md", "priority": "P2"}
  ],
  "verification_suite": {
    "command": "cd packages/lns_kernel && PYTHONPATH=src pytest -q && cd ../lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q",
    "pass_condition": "17 + 9 passed, exit 0",
    "result": "pass"
  },
  "next_steps": [
    {"task": "User re-verify wire path after API/UI restart", "priority": "P0", "scope": "small"},
    {"task": "Sync README to v0.2 features", "priority": "P1", "scope": "small"},
    {"task": "Residual-triggered thin propose", "priority": "P1", "scope": "medium"},
    {"task": "Add GitHub Actions pytest CI", "priority": "P1", "scope": "small"},
    {"task": "UI multi-parent affine weights", "priority": "P2", "scope": "medium"}
  ]
}
```

---

**End of handoff packet.**  
Companion: `HANDOFF_LATEST.md` (same content for quick access).
