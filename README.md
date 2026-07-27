# Living Node Swarm (v0.1 shell)

Domain-agnostic **explicit probabilistic node graph** with **on-change ensemble Monte Carlo**, expert UI (inspect/edit + distribution views), honest **freshness** badges, transform **experiments**, and **OpenRouter** AI node proposals (you choose the model).

## Product acceptance path

1. Load seed graph  
2. Edit one node’s parameters  
3. Watch freshness → `updating` / `stale` then `fresh`  
4. Downstream predictive distributions change  

## Non-goals (v0.1)

- Multi-user, auth, multi-tenant, cloud deploy  
- Clinical use  
- Hard-coded LLM model id (you pick via OpenRouter)

## Layout

| Path | Role |
|------|------|
| `packages/lns_kernel` | Graph, SQLite store, real numpy MC, transforms |
| `packages/lns_server` | FastAPI on `127.0.0.1`, OpenRouter client |
| `packages/lns_ui` | React UI |
| `docs/architecture/` | Ironclad design packet |
| `docs/plans/` | Execution plan |

## Setup

```bash
# Kernel + server deps
cd packages/lns_kernel && uv pip install -e ".[dev]"
cd ../lns_server && uv pip install -e ".[dev]"
# or: pip install -e packages/lns_kernel -e packages/lns_server with PYTHONPATH

# UI
cd packages/lns_ui && npm install
```

### OpenRouter (required for AI propose)

```bash
export OPENROUTER_API_KEY="sk-or-..."
# Optional default; you can also type model id in the UI:
export OPENROUTER_MODEL="<your-openrouter-model-id>"
```

**You choose models.** Nothing in the product hard-codes a single OpenRouter model id as the only option.

## Run (two terminals)

```bash
# Terminal 1 — API
./scripts/run_local.sh

# Terminal 2 — UI (proxies /api → :8787)
./scripts/run_ui.sh
```

Open http://127.0.0.1:5173

## Tests

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -v
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -v
```

## Transform strategies

Dependent nodes support `affine`, `sum_parents`, `mean_parents`. Use **Compare transforms** in the UI (or `POST /graphs/{id}/experiments/transforms`) to run real MC under each strategy and pick what fits.

## Design docs

- `docs/architecture/2026-07-27-living-node-swarm-ironclad.md`
- `docs/plans/2026-07-27-living-node-swarm-v0.1.md`
- `01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md`
