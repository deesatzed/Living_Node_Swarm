# Living Node Swarm — Handoff Packet
**Generated:** 2026-07-27 (updated Kalshi policy)  
**Branch:** main @ 737b96c (+ local uncommitted: Kalshi docs/skill/README)  
**Remote:** https://github.com/deesatzed/Living_Node_Swarm.git  

---

## Quick Resume Checklist
- [ ] `git pull origin main` then apply/commit any local Kalshi doc updates
- [ ] `source ~/.lns/kalshi_env.sh` — PEM at `~/.lns/kalshi_private.pem` (600)
- [ ] `.env`: OpenRouter models + `KALSHI_API_KEY` / `KALSHI_PRIVATE_KEY_PATH` / `KALSHI_ENV`
- [ ] `grok mcp doctor kalshi` — expect healthy, ~24 tools
- [ ] Kernel+server tests: 17 + 9 pass
- [ ] Review **Kalshi account policy** and **3 build items** below

## AI Continuity Checklist
- [ ] This handoff + `kalshi-lns` skill reviewed
- [ ] Kalshi = project-only ~$10 budget; micro-stakes allowed with preview
- [ ] No mock LLM/Kalshi data
- [ ] Next: pick one of the three Kalshi-track builds

---

## What This Project Does

Living Node Swarm (LNS) is a **single-user local** expert shell: **explicit probabilistic nodes**, **on-change Monte Carlo**, honest **freshness**, graph UI, **OpenRouter** propose (user-selected models), **activate/reject**, **wire** into the dependency chain.

**Kalshi integration track:** use real prediction markets as claim definition, market-mid baseline, resolution ground truth, Brier-style success metrics, and optional **micro-stakes** on a **dedicated ~$10 account**.

**Tech:** Python 3.11+, numpy, FastAPI, SQLite, React/Vite, OpenRouter, Kalshi MCP (`mcp-server-kalshi`).

---

## Kalshi account policy (owner decision)

| Item | Policy |
|------|--------|
| Purpose | **This project only** |
| Balance | ~**$10** USD — intentional small sandbox |
| Fair use | Real market data + careful micro-orders OK for LNS validation |
| Primary KPIs | Brier vs resolution, vs mid at freeze, Δ after AI expand+wire |
| Secondary | Tiny PnL only as “loop closed with real money” — not the product story |
| Stake discipline | Prefer ≤ **$2–3** per experiment unless owner raises cap; always preview orders |
| Advice framing | Research prototype — **not** investment advice |

**Credentials (local, never commit):**

- `KALSHI_API_KEY_ID` / `KALSHI_API_KEY` in `.env`
- RSA file: `~/.lns/kalshi_private.pem` (extracted from multiline PEM; dotenv cannot hold full PEM)
- Helper: `source ~/.lns/kalshi_env.sh`
- Grok MCP: `kalshi` → `uvx mcp-server-kalshi` (doctor OK)

Docs: `docs/integrations/kalshi-mcp.md` · Skill: `.grok/skills/kalshi-lns/SKILL.md`

---

## Project Structure (key)
```
packages/lns_kernel|lns_server|lns_ui
scripts/run_local.sh, run_ui.sh
docs/architecture, docs/plans, docs/integrations/kalshi-mcp.md
.grok/skills/kalshi-lns/
HANDOFF_*.md
```

**Entry:** `lns_server.app:app`, UI `App.tsx`, launchers under `scripts/`.

---

## How to Run

```bash
source ~/.lns/kalshi_env.sh
./scripts/run_local.sh    # :8787
./scripts/run_ui.sh       # :5173
```

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q   # 17
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q  # 9
grok mcp doctor kalshi
```

---

## Current State Assessment

### Working ✅
- LNS graph MC, UI, propose/activate/reject/wire (user-validated)
- OpenRouter multi-model from `.env`
- Kalshi MCP registered; PEM path fixed; demo public markets reachable
- Project skill + integration docs for Kalshi↔LNS

### Incomplete ⚠️
- No LNS code path yet to **ingest** Kalshi mid into a node automatically
- No **Brier scorecard** module/UI
- No **Fed/CPI domain seed** graph
- No micro-stake **journal** (ticker, size, model p, graph version)
- README historically lagged features (updated in this pass)

### Broken ❌
- None known in automated LNS tests

### Blockers 🚧
- None technical for starting the three builds below
- Live financials market choice should be re-checked on Kalshi the day of demo (tickers rotate)

---

## Feature matrix (abbrev)

| Feature | Status | Priority |
|---------|--------|----------|
| Living graph + MC + UI | ✅ | done |
| OpenRouter propose / activate / wire | ✅ | done |
| Kalshi MCP + credentials | ✅ | done |
| Mid → LNS observation API | ⚠️ missing code | **Build 1** |
| Scorecard Brier / vs mid | ⚠️ missing code | **Build 2** |
| Domain seed + optional micro-stake journal | ⚠️ missing | **Build 3** |

---

## Next Steps — **3 items we can build for** (Kalshi track)

### 1) **Kalshi mid ingest → living baseline node** (P0)

**Build for:** “Real market data in the graph, not a toy seed.”

| | |
|--|--|
| **What** | Fetch market mid (MCP or thin REST client); `POST` observation onto `market_implied_yes` with ticker + timestamp; freeze snapshot for scoring |
| **Done when** | API+UI (or script) can refresh a selected ticker and show baseline node + freshness without hand-editing fake numbers |
| **Uses $10?** | No (read-only) |
| **Sponsor line** | “Our baseline is the live Kalshi mid, with provenance.” |

### 2) **Scorecard: Brier + market mid baseline** (P0)

**Build for:** “Success metrics a sponsor can audit.”

| | |
|--|--|
| **What** | Record model \(p\), freeze mid at \(t_0\), store resolution \(y\); compute Brier\((p-y)^2\), market Brier, Δ after propose→activate→wire |
| **Done when** | One resolved or backfilled event produces a scorecard JSON/UI panel with N and freeze times |
| **Uses $10?** | No (scoring only) |
| **Sponsor line** | “We measure error vs truth and vs the market—not vibes.” |

### 3) **Financials domain pack + optional micro-stake journal** (P1)

**Build for:** “One real use-case demo (Fed or CPI) + optional closed loop with real money.”

| | |
|--|--|
| **What** | Seed graph with real factor names for one live/near financials market; full path: mid ingest → edit/propose/wire → optional order preview/place ≤$2–3 → journal fill + later resolution score |
| **Done when** | Cold demo script works on one ticker; stake journal entry exists if order placed; primary KPI still Brier, not PnL |
| **Uses $10?** | Optional, small |
| **Sponsor line** | “Explicit living model, human-gated AI factors, scored against Kalshi—with optional micro-stakes to prove the loop.” |

**Suggested order:** **1 → 2 → 3** (data → metrics → domain demo).

---

## Recent commits
| SHA | Change |
|-----|--------|
| 737b96c | Handoff packet |
| 7a9339b | Wire-into-chain |
| ba4d096 | Initial v0.1 shell |

**Local (this update):** Kalshi policy docs, skill, README, handoff refresh.

---

## Configuration & Secrets

| Variable | Purpose |
|----------|---------|
| OpenRouter keys/models | AI propose |
| `KALSHI_API_KEY` / `_ID` | Kalshi API key id |
| `KALSHI_PRIVATE_KEY_PATH` | RSA pem path |
| `KALSHI_ENV` | `demo` or `prod` |

Never commit `.env` or PEM files.

---

## Assumptions
1. Kalshi account is project-only with ~$10 and owner-approved micro-stakes.  
2. Primary evaluation is probabilistic score, not trading alpha marketing.  
3. Single-user localhost remains the product shape for now.  
4. User selects OpenRouter models; no hard-coded model product default.  
5. Non-clinical.

---

## Appendix: Machine-Readable Summary
```json
{
  "project": "Living Node Swarm",
  "generated": "2026-07-27",
  "kalshi": {
    "project_only_account": true,
    "approx_balance_usd": 10,
    "micro_stakes_allowed": true,
    "recommended_cap_per_experiment_usd": 3,
    "mcp": "mcp-server-kalshi",
    "primary_kpis": ["brier_vs_resolution", "brier_vs_mid_freeze", "delta_brier_after_wire"]
  },
  "next_builds": [
    {"id": 1, "name": "kalshi_mid_ingest", "priority": "P0"},
    {"id": 2, "name": "brier_scorecard", "priority": "P0"},
    {"id": 3, "name": "financials_domain_pack_microstake_journal", "priority": "P1"}
  ],
  "health": {"tests_passing": 26, "tests_failing": 0}
}
```
