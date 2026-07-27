# Living Node Swarm (v0.1–0.2 shell + Kalshi track)

Domain-agnostic **explicit probabilistic node graph** with **on-change ensemble Monte Carlo**, expert UI (inspect/edit + distribution views), honest **freshness** badges, transform **experiments**, **OpenRouter** AI node proposals (you choose the model), human **activate/reject**, and **wire-into-chain**.

**Kalshi track:** project-only account (~$10) for real market mids, resolution scoring, and optional **micro-stakes** experiments. Not investment advice. See `docs/integrations/kalshi-mcp.md` and skill `kalshi-lns`.

> **Current build vs active goal:** The code today is the verified v0.1–0.2 shell described below. The active goal is to turn the base app into a domain-general Prediction Workspace with resolution-grade targets, cited research, extensive multi-hop factor authoring, explicit distribution/relationship review, and a visual trust surface. Gas will become a shared preset rather than the product boundary. See `GOAL.md`, `TASK_QUEUE.md`, and `docs/plans/2026-07-27-domain-general-prediction-workspace-design.md`. These future capabilities are not yet implemented.

## Product acceptance path

1. Load seed graph  
2. Edit one node’s parameters  
3. Watch freshness → `updating` / `stale` then `fresh`  
4. Downstream predictive distributions change  
5. (Optional) Propose → activate → wire a factor into the chain  
6. (Kalshi) Freeze market mid → score vs resolution (Brier)

## Non-goals (current shell)

- Multi-user, auth, multi-tenant, cloud deploy  
- Clinical use  
- Hard-coded LLM model id (you pick via OpenRouter)  
- Large-balance or production trading product
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

## Run

```bash
# Terminal 1 — API (always)
./scripts/run_local.sh

# Terminal 2 — general shell UI
./scripts/run_ui.sh
# http://127.0.0.1:5173

# OR Terminal 2 — Gas demo (AI dynamic nodes + Kalshi)
./scripts/run_gas_demo.sh
# http://127.0.0.1:5174
```

**Gas demo flow:** Bootstrap + AI factors → activate/wire proposed nodes → refresh Kalshi mid → preview/confirm micro-stake → 20% auto-sell.

## Tests

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -v
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -v
```

## Transform strategies

Dependent nodes support `affine`, `sum_parents`, `mean_parents`. Use **Compare transforms** in the UI (or `POST /graphs/{id}/experiments/transforms`) to run real MC under each strategy and pick what fits.

## Design docs / handoff

- `HANDOFF_LATEST.md` — resume here
- `docs/architecture/2026-07-27-living-node-swarm-ironclad.md`
- `docs/plans/2026-07-27-living-node-swarm-v0.1.md`
- `docs/plans/2026-07-27-v0.2-wire-chain.md`
- `docs/integrations/kalshi-mcp.md`
- `01_PRINCIPLES_AND_LIVING_2NODE_SCHEMA.md`
