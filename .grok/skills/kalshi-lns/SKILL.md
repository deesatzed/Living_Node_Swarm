---
name: kalshi-lns
description: >
  Wire Kalshi prediction markets into Living Node Swarm as real resolution sources,
  success metrics, and optional micro-stakes validation (~$10 project-only account).
  Use when the user mentions Kalshi, prediction markets, Fed/CPI financials markets,
  Brier scores, market mid baselines, or sponsor demos against live contracts.
---

# Kalshi ↔ Living Node Swarm

## Goal

Use **real Kalshi markets** as:

1. **Claim definition** — what event resolves YES/NO (or multi-outcome)
2. **Baseline** — market-implied probability (mid / last trade)
3. **Ground truth** — settlement outcome for scoring
4. **Success metrics** — Brier / log score vs resolution; optional vs market mid
5. **Optional micro-stakes** — small real orders on the **project-only** account to close the loop

## Project account policy (owner, 2026-07-27)

- Kalshi account exists **for this project only**
- Balance ≈ **$10** — intentional sandbox for real money
- Fair game for LNS experiments, including careful micro-orders
- **Not** a personal trading book; **not** investment advice for third parties

### Stake discipline

| Rule | Guidance |
|------|----------|
| Default | Research metrics first (Brier, calibration, Δ after wire) |
| Single experiment | Prefer ≤ **$2–3** notional unless owner raises the cap |
| Before order | Always **preview** (MCP `confirm` / dry summary); show ticker, side, size, max loss |
| Environment | Use `prod` for real balance; `demo` for plumbing without risk |
| Logging | Record ticker, size, mid at entry, model \(p\), LNS graph id, timestamp |

**No silent trading.** Even with owner permission to “play,” every order needs an explicit intent in the conversation (e.g. “place up to $2 YES on TICKER”).

## Prerequisites

### MCP

**Recommended:** [`mcp-server-kalshi`](https://github.com/9crusher/mcp-server-kalshi) via `uvx mcp-server-kalshi`

- Settlement rules + PDF extraction  
- Orders require confirmation flag  
- This machine: Grok MCP name `kalshi`, doctor healthy (24 tools)

### Env

```bash
source ~/.lns/kalshi_env.sh   # preferred on this machine
# KALSHI_API_KEY / KALSHI_PRIVATE_KEY_PATH / KALSHI_ENV
# PEM file at ~/.lns/kalshi_private.pem (mode 600) — not multiline in .env
```

OpenRouter: `OPENROUTER_API_KEY`, `MODEL_REASONING`, `MODEL_FAST`, optional `OPENROUTER_MODEL`.

## Safety rules

1. No inventing mids, books, or resolutions — real MCP/API only  
2. No mock data  
3. Frame as research / prototype decision-support  
4. Every LNS observation: source + timestamp  
5. Prefer Brier narrative over “we made money” as the product story  
6. Respect $10 budget — stop if balance would go near zero without owner OK  

## Workflow A — Pick a financials market (sponsor)

1. List/filter markets (Fed / CPI / index threshold as available)  
2. Market metadata + orderbook → YES mid  
3. Rules PDF/text → exact claim for LNS target node  
4. Graph skeleton: `market_implied_yes`, factor nodes, `event_yes_prob`  
5. Optional: micro-position **after** model \(p\) and freeze mid documented  

## Workflow B — Ingest → LNS map

| Kalshi | LNS |
|--------|-----|
| Ticker / title | Graph tags + description |
| YES mid | `market_implied_yes` observation |
| Rules | Target node definition |
| Resolution | `resolved_outcome` 0/1 |
| Fill / position | Optional audit event (size, price) |

## Workflow C — Success metrics

1. Brier \((p-y)^2\) at resolution  
2. Market Brier from mid at freeze \(t_0\)  
3. Δ Brier after propose → activate → wire  
4. Optional: tiny PnL as “loop closed,” not primary KPI  
5. Always report **N**  

## Workflow D — Full path

1. Domain graph (not toy seed)  
2. Refresh Kalshi mid  
3. Edit factor → re-sim → freshness  
4. OpenRouter propose → activate → wire  
5. Compare \(P(\text{YES})\) vs mid  
6. Optional micro-order with preview  
7. Score after resolution  

## Build targets this skill supports

See handoff **Next build items (Kalshi track)**:

1. Ingest mid → LNS observation + freeze snapshot  
2. Scorecard (Brier / vs mid)  
3. Domain seed (Fed or CPI) + optional micro-stake journal  

## Related

- `docs/integrations/kalshi-mcp.md`  
- `HANDOFF_LATEST.md`  
