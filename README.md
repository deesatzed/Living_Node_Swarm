# Living Node Swarm Prediction Workspace

Local-first, domain-general prediction workspace for explicit probabilistic node graphs, reviewable distributions and relationships, version-bound candidate approval, reproducible Monte Carlo receipts, and a shared Gas preset.

**Kalshi/Gas preset:** preview and dry-run controls remain available, while live buy, live auto-sell, and bulk factor activation are disabled in this build. Not investment advice.

> **Current evidence boundary:** The workspace implements typed targets, fixture-backed candidate research/map journeys, eight-family distribution review, persisted relationship metadata, candidate/structural review, and fixture browser proof. Live research, live monitoring, scientific evaluation, and full accessibility certification remain incomplete. See [GUI verification report](docs/verification/gui/FINAL_GUI_REPORT.md), `GOAL.md`, and `TASK_QUEUE.md`.

## Product acceptance path

1. Create or open a project through the shared workspace.
2. Review targets, fixture-scoped candidate factors, evidence, distributions, and relationships.
3. Stage reversible candidate changes and compare them in memory.
4. Review an exact binding before structural or numeric approval.
5. Run approved models without changing structure; inspect receipts and limitations.

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

**Gas preset flow:** bootstrap a local graph → inspect proposed factors → use previews/dry runs. Bulk activation, confirmed orders, and auto-sell are unavailable in this build.

## Tests

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -v
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -v
cd ../lns_ui_shared && npm test -- --run && npm run build
cd ../lns_ui && npm run build && npm run test:e2e
cd ../lns_gas_demo && npm run build
cd ../.. && ./scripts/verify_gui.sh && git diff --check
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
