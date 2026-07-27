# Living Node Swarm — Handoff Packet
**Generated:** 2026-07-27 (gas demo app + AI dynamic nodes)  
**Branch:** main @ 33df52e  
**Last Commit:** 2026-07-27 — Add separate gas demo app with AI-defined dynamic nodes.  
**Remote:** https://github.com/deesatzed/Living_Node_Swarm.git  

---

## Quick Resume Checklist
- [ ] `git pull origin main` @ `33df52e`
- [ ] `source ~/.lns/kalshi_env.sh` — PEM `~/.lns/kalshi_private.pem` (600)
- [ ] `.env`: OpenRouter models + `KALSHI_ENV=prod`, `KALSHI_API_KEY`, `KALSHI_PRIVATE_KEY_PATH` (no multiline PEM)
- [ ] API: `./scripts/run_local.sh` → http://127.0.0.1:8787
- [ ] **Gas demo GUI:** `./scripts/run_gas_demo.sh` → http://127.0.0.1:5174
- [ ] (Optional) General UI: `./scripts/run_ui.sh` → http://127.0.0.1:5173
- [ ] Tests: kernel **20** + server **16**
- [ ] Gas demo: Bootstrap + AI factors → activate → trade strip

## AI Continuity Checklist
- [ ] Read this file / `HANDOFF_LATEST.md`
- [ ] Skill `kalshi-lns` for Kalshi research + micro-stakes discipline
- [ ] Prefer **gas demo app** for sponsor gas scenario; general `lns_ui` for shell work
- [ ] No mock LLM/Kalshi data; no secrets in git

---

## What This Project Does

**Living Node Swarm (LNS)** — single-user localhost product:

1. **Explicit probabilistic node graph** + **on-change Monte Carlo** + freshness  
2. **OpenRouter** propose (user-selected models) → activate/reject → **wire**  
3. **Kalshi track** — real markets, mid ingest, micro buy/sell (~$10 project account), **20% YES-mid exit**  
4. **Gas demo app** (separate GUI) — US retail gas vs Kalshi threshold, **AI-defined dynamic latent factors**

Not multi-tenant cloud; not investment advice; non-clinical.

---

## Preferred operator path: Gas demo

```bash
./scripts/run_local.sh          # Terminal 1
./scripts/run_gas_demo.sh       # Terminal 2 → http://127.0.0.1:5174
```

| Step | Action |
|------|--------|
| 1 | Paste Kalshi ticker (or mid fallback + strike e.g. 4.12) |
| 2 | **Bootstrap + AI factors** → base graph + 3–5 **proposed** AI nodes |
| 3 | **Activate all proposed + wire** (or activate one-by-one) |
| 4 | Edit params → **Save & re-sim** → inspect model gas distribution |
| 5 | **Refresh mid** → **Preview BUY** → **Confirm BUY** (live, capped) |
| 6 | Later: **20% exits dry** → **Auto-SELL 20%** (live) |

**AI expand:** OpenRouter returns multi-hop gas drivers (crude, inventories, crack, seasonality, hurricane risk, etc.) as `status=proposed`, tags `ai-dynamic`. Activation can auto-wire into `model_price_index`.

---

## Kalshi account policy

| Item | Policy |
|------|--------|
| Account | Project-only |
| Balance | ~$10 (API often returns cents: 1000 ≈ $10) |
| Caps | max notional **$3**/order, max **3** contracts |
| Exit | `\|mid_now − entry\| / entry ≥ 0.20` → sell |
| Orders | Preview default; live needs confirm |
| Creds | `KALSHI_ENV=prod`, key id, `~/.lns/kalshi_private.pem` |
| MCP | Grok `kalshi` = `uvx mcp-server-kalshi` |

---

## Project Structure
```
packages/
  lns_kernel/       # MC, store, gas_seed, scoring
  lns_server/       # FastAPI + OpenRouter + Kalshi + /demo/gas/*
  lns_ui/           # general shell UI (:5173)
  lns_gas_demo/     # SEPARATE gas scenario GUI (:5174)  ← primary demo
scripts/
  run_local.sh
  run_ui.sh
  run_gas_demo.sh
docs/
  architecture/, plans/, integrations/kalshi-mcp.md
.grok/skills/kalshi-lns/
HANDOFF_*.md
```

### Key modules
| Module | Path | Role |
|--------|------|------|
| Gas seed | `lns_kernel/gas_seed.py` | Base threshold graph |
| Gas AI | `lns_server/gas_ai.py` | Multi-factor OpenRouter expand |
| Kalshi client | `lns_server/kalshi_client.py` | Quotes + RSA orders |
| Journal | `lns_server/journal.py` | 20% exit tracking |
| Demo API | `lns_server/app.py` `/demo/gas/*` | Bootstrap / expand / activate-all |
| Gas GUI | `lns_gas_demo/src/App.tsx` | Sponsor-facing demo |

---

## How to Run (summary)

```bash
# deps once
cd packages/lns_kernel && uv pip install -e ".[dev]"
cd ../lns_server && uv pip install -e ".[dev]"
cd ../lns_gas_demo && npm install

# runtime
./scripts/run_local.sh
./scripts/run_gas_demo.sh
```

### Demo API
| Method | Path |
|--------|------|
| POST | `/demo/gas/bootstrap` — seed + optional AI expand |
| POST | `/demo/gas/{id}/expand` — more AI factors |
| POST | `/demo/gas/{id}/activate-all-proposed?wire=true` |
| POST | `/use-cases/gas/graph` — seed only |
| POST | `/graphs/{id}/kalshi/refresh-mid?ticker=` |
| GET | `/kalshi/balance` |
| POST | `/kalshi/orders` — confirm false/true |
| POST | `/kalshi/auto-sell-20pct` |

### Tests
```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q           # 20
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q  # 16
```

---

## Current State Assessment

### Working ✅
- Full LNS shell (graph, MC, freshness, wire, activate/reject)
- OpenRouter propose + proposal normalize
- Gas domain seed + **separate gas demo GUI**
- AI multi-factor expand (dynamic proposed nodes)
- Activate-all + auto-wire to `model_price_index`
- Kalshi mid refresh, live buy/sell, 20% auto-sell
- Prod balance auth verified earlier (~$10)
- Docs: kalshi-mcp, gas 20% plan, handoff

### Incomplete ⚠️
- Resolution **Brier scorecard UI** (only `/scoring/brier` helper)
- Automatic gas **ticker discovery** list from Kalshi
- Historical multi-event calibration dashboard
- CI (GitHub Actions)
- Fill-price journal vs limit order resting details
- Optional: timer-based auto-sell poll (currently button)

### Broken ❌
- None known in unit tests
- Demo API keys ≠ prod (must use `KALSHI_ENV=prod` for real $)

### Blockers 🚧
- Operator must **paste exact Kalshi ticker** for live mid/orders
- OpenRouter required for AI expand (fails closed without key)

---

## Feature Matrix

| Feature | Status | Evidence |
|---------|--------|----------|
| Living graph + MC + UI shell | ✅ | lns_ui, tests |
| Wire / activate / reject | ✅ | store + app |
| Gas seed | ✅ | gas_seed.py |
| **Gas demo app** | ✅ | lns_gas_demo :5174 |
| **AI dynamic gas factors** | ✅ | gas_ai.py, /demo/gas/expand |
| Kalshi live orders + 20% sell | ✅ | kalshi_client, UI |
| Brier scorecard product UI | ⚠️ | API only |
| Ticker discovery | ⚠️ | missing |

---

## Recent Commits

| SHA | Change |
|-----|--------|
| 33df52e | Separate gas demo app + AI dynamic nodes |
| 4a807ef | Handoff Kalshi live + gas track |
| 011705d | Live Kalshi orders + auto-sell |
| 7400157 | Gas seed + journal 20% exit |
| 625546c | Kalshi ~$10 policy |
| 7a9339b | Wire-into-chain |
| ba4d096 | Initial v0.1 shell |

---

## Configuration

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_*` / `MODEL_*` | AI propose & gas expand |
| `KALSHI_ENV=prod` | Real project account |
| `KALSHI_API_KEY` | Key id |
| `KALSHI_PRIVATE_KEY_PATH` | RSA pem path |
| Settings caps | notional $3, contracts 3, exit 20% |

Never commit `.env` / PEM / key dumps (`MyESS.txt` gitignored if present).

---

## Next Steps

1. **P0 — Live gas demo rehearsal** — Real ticker from Kalshi UI; bootstrap+AI; activate; optional 1ct buy  
2. **P1 — Brier scorecard UI** — freeze mid, resolution y, model p, table  
3. **P1 — Gas ticker browser** — list open threshold markets from API  
4. **P2 — CI** on push  
5. **P2 — Polling auto-sell** optional background check  

---

## Open Questions
- Bidirectional 20% exit vs take-profit-only?  
- Auto-activate AI factors for “wow” demos vs always human gate?  
- Align Grok MCP `KALSHI_ENV` to prod for agent trading tools?

---

## Assumptions
1. Localhost single-user  
2. Project Kalshi ~$10, micro-stakes with confirm OK  
3. User picks OpenRouter models  
4. No mocks  
5. Non-clinical  
6. Gas demo is primary sponsor surface for financials narrative  

---

## Appendix: Machine-Readable Summary
```json
{
  "project": "Living Node Swarm",
  "generated": "2026-07-27",
  "repo": {
    "remote": "https://github.com/deesatzed/Living_Node_Swarm.git",
    "branch": "main",
    "commit": "33df52e104483560a2070c243249c4c09397adbe"
  },
  "health": {
    "tests_passing": 36,
    "kernel": 20,
    "server": 16,
    "tests_failing": 0
  },
  "apps": {
    "api": "http://127.0.0.1:8787",
    "shell_ui": "http://127.0.0.1:5173",
    "gas_demo": "http://127.0.0.1:5174"
  },
  "kalshi": {
    "project_only": true,
    "approx_balance_usd": 10,
    "live_orders": true,
    "exit_rule_pct": 0.2,
    "max_notional_usd": 3
  },
  "status": {
    "working": [
      "lns_core",
      "openrouter",
      "wire_activate",
      "gas_seed",
      "gas_demo_app",
      "ai_dynamic_gas_nodes",
      "kalshi_live_orders",
      "auto_sell_20pct"
    ],
    "incomplete": [
      "brier_scorecard_ui",
      "ticker_discovery",
      "ci"
    ],
    "broken": [],
    "blockers": ["paste_kalshi_ticker", "openrouter_for_ai_expand"]
  },
  "next_steps": [
    {"task": "Rehearse gas demo with live ticker", "priority": "P0"},
    {"task": "Brier scorecard UI", "priority": "P1"},
    {"task": "Gas ticker discovery list", "priority": "P1"}
  ]
}
```

---

**Companion:** `HANDOFF_LATEST.md`  
**End of handoff.**
