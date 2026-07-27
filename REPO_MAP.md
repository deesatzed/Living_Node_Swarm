# REPO_MAP.md

## Project Type

Living Node Swarm is a single-user, localhost-only probabilistic prediction-construction product.

**Current implementation:** a domain-agnostic graph shell plus a separate gas scenario demo with OpenRouter proposals and optional Kalshi integration.

**Active goal:** a generalized Prediction Workspace with resolution-grade targets, cited research, extensive multi-hop node authoring, explicit distributions/relationships, human approval, visual explanation, and reproducible simulation. Gas becomes a preset/adapter.

## Tech Stack

- Python 3: FastAPI, Pydantic, SQLite, NumPy Monte Carlo, HTTPX, cryptography
- TypeScript: React, Vite
- Package tooling: `uv`/pip for Python; npm for each React app

## Package Manager

Python packages are independently installable under `packages/lns_kernel` and `packages/lns_server`. React packages are independently installable under `packages/lns_ui` and `packages/lns_gas_demo`; there is intentionally no root `package.json`.

## Commands

| Purpose | Command | Verified |
|---|---|---|
| Kernel tests | `cd packages/lns_kernel && PYTHONPATH=src pytest -q` | Yes: 20 passed (2026-07-27) |
| Server tests | `cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q` | Yes: 16 passed (2026-07-27; one upstream deprecation warning) |
| Gas GUI build | `cd packages/lns_gas_demo && npm run build` | Yes (2026-07-27) |
| Shell GUI build | `cd packages/lns_ui && npm run build` | Yes (2026-07-27) |
| API | `./scripts/run_local.sh` | Not run; requires local configuration and can access live services |
| Gas demo GUI | `./scripts/run_gas_demo.sh` | Not run; depends on API |
| General shell GUI | `./scripts/run_ui.sh` | Not run; depends on API |

## Entry Points

- API: `packages/lns_server/src/lns_server/app.py`
- Kernel: `packages/lns_kernel/src/lns_kernel/`
- Primary gas GUI: `packages/lns_gas_demo/src/App.tsx` on `127.0.0.1:5174`
- General shell GUI: `packages/lns_ui/src/App.tsx` on `127.0.0.1:5173`

## Major Folders

| Path | Responsibility |
|---|---|
| `packages/lns_kernel` | Graph schema, persistence, dependency validation, Monte Carlo, gas seed, scoring |
| `packages/lns_server` | REST API, OpenRouter expansion, Kalshi client, trade journal |
| `packages/lns_gas_demo` | Sponsor-facing gas workflow and micro-stakes controls |
| `packages/lns_ui` | General-purpose graph exploration shell |
| `docs/` | Architecture, verification plans, Kalshi integration guidance |
| project-control Markdown | Active goal, standards, decisions, progress, risks, and task order |

## Existing Patterns To Preserve

- Localhost-only, single-user execution; never commit secrets.
- AI produces proposed nodes; the human controls activation and wiring.
- Kalshi use is real-but-micro-stakes, capped at $3/order and three contracts, with explicit confirmation.
- Do not substitute mock market or LLM data for a claimed live demo.

## Tests and Verification

Unit coverage exists for core graph operations, scoring, server endpoints, gas bootstrap, journal behavior, and order-payload translation. Browser-level, live-provider, order-fill, and CI verification are absent.

## Likely Files For Current Task

- Scientific contracts/registry: new `lns_kernel/contracts.py`, `distributions.py`, `dimensions.py`, `temporal.py`; existing `models.py`, `validation.py`, `ensemble.py`, `store.py`
- Research/authoring: new server `url_safety.py`, `research.py`, `evidence_store.py`, `authoring.py`, `prompt_contracts.py`; existing `app.py`
- Generalized UX: new `packages/lns_ui_shared/`; existing `packages/lns_ui/`
- Gas adapter: `packages/lns_gas_demo/`, `gas_ai.py`, and gas routes after the shared workspace passes
- Exact sequence: `TASK_QUEUE.md` and the domain-general implementation plan under `docs/plans/`

## Unknowns

- No live generalized research workflow exists yet.
- A legally/reproducibly usable Neodymium historical series is not confirmed.
- The final sensitivity method, scenario representation, graph renderer, and evidence-retention boundary remain pending decisions.
- The real Kalshi API's order/fill response shape has not been reconciled into the journal; live trading remains out of scope.
- No GitHub Actions workflow is present.
