# Living Node Swarm — Handoff Packet
**Generated:** 2026-07-27 (Gas demo app + AI dynamic nodes)  
**Branch:** main (see latest commit)  
**Remote:** https://github.com/deesatzed/Living_Node_Swarm.git  

---

## Quick Resume Checklist
- [ ] `git pull origin main` @ `011705d`
- [ ] `source ~/.lns/kalshi_env.sh` — PEM at `~/.lns/kalshi_private.pem` (mode 600)
- [ ] `.env`: OpenRouter + `KALSHI_ENV=prod`, `KALSHI_API_KEY`, `KALSHI_PRIVATE_KEY_PATH` (no multiline PEM in `.env`)
- [ ] `./scripts/run_local.sh` + `./scripts/run_gas_demo.sh` (port **5174**)
- [ ] Or general UI: `./scripts/run_ui.sh` (5173)
- [ ] Gas demo: **Bootstrap + AI factors** → activate proposed → trading strip
- [ ] Verify tests: kernel **20** + server **16** pass
- [ ] Review **Kalshi policy**, **gas demo**, **20% exit**

## AI Continuity Checklist
- [ ] Load `HANDOFF_LATEST.md` + skill `kalshi-lns`
- [ ] Project Kalshi account ~$10 only; micro-stakes OK with preview/confirm
- [ ] Primary KPIs: Brier / mid freeze / Δ after wire — not trading alpha marketing
- [ ] No mock LLM or Kalshi data
- [ ] Never commit `.env`, PEM, or `MyESS.txt`-style key dumps

---

## What This Project Does

**Living Node Swarm (LNS)** is a single-user **localhost** app:

- Explicit **probabilistic nodes** + **on-change Monte Carlo**
- Expert **graph UI** with honest **freshness** (`stale` / `updating` / `fresh`)
- **OpenRouter** AI propose (user-chosen models) → human **activate/reject** → **wire** into chain
- **Kalshi track:** real financials markets (US gas thresholds), mid ingest, micro-stake **buy/sell**, journal, **20% YES-mid move auto-sell**

**Not:** multi-user cloud product, investment advice, clinical use.

---

## Kalshi account policy (owner)

| Item | Policy |
|------|--------|
| Account | **Project-only** |
| Balance | ~**$10** USD (API: `balance` often in cents → 1000 ≈ $10) |
| Use | Research, sponsor demos, micro-stakes validation |
| Caps | `kalshi_max_notional_usd=3`, `kalshi_max_contracts=3` |
| Exit rule | SELL when `abs(mid_now - entry_mid) / entry_mid ≥ 0.20` |
| Orders | Always **preview** first; live needs `confirm=true` + UI confirm dialog |
| Framing | Research prototype — not investment advice |

### Credentials (local only)

| Item | Location |
|------|----------|
| API key id | `.env` → `KALSHI_API_KEY` / `KALSHI_API_KEY_ID` |
| RSA PEM | `~/.lns/kalshi_private.pem` (not multiline in `.env`) |
| Helper | `source ~/.lns/kalshi_env.sh` |
| Env | `KALSHI_ENV=prod` for real balance (demo keys ≠ prod) |
| Grok MCP | `kalshi` → `uvx mcp-server-kalshi` (~24 tools) |

Docs: `docs/integrations/kalshi-mcp.md` · Skill: `.grok/skills/kalshi-lns/SKILL.md`  
Plan: `docs/plans/2026-07-27-gas-20pct-exit.md`

---

## Project Structure
```
packages/
  lns_kernel/     # nodes, MC, store, gas_seed, scoring
  lns_server/     # FastAPI, OpenRouter, Kalshi, journal, /demo/gas/*
  lns_ui/         # general React shell
  lns_gas_demo/   # SEPARATE gas scenario GUI (port 5174)
scripts/run_local.sh, run_ui.sh, run_gas_demo.sh
docs/architecture/, docs/plans/, docs/integrations/kalshi-mcp.md
.grok/skills/kalshi-lns/
HANDOFF_*.md
data/seed_graph.json
```

**Entry points**
- API: `packages/lns_server/src/lns_server/app.py` → `app`
- Kalshi: `kalshi_client.py`, journal: `journal.py`
- Gas seed: `lns_kernel/gas_seed.py`
- UI: `packages/lns_ui/src/App.tsx`

---

## How to Run

```bash
cd /path/to/Living_Node_Swarm
source ~/.lns/kalshi_env.sh   # optional if .env is correct

# deps (once)
cd packages/lns_kernel && uv pip install -e ".[dev]"
cd ../lns_server && uv pip install -e ".[dev]"   # includes cryptography
cd ../lns_ui && npm install
cd ../..

./scripts/run_local.sh       # http://127.0.0.1:8787
./scripts/run_gas_demo.sh    # http://127.0.0.1:5174  ← gas demo
# ./scripts/run_ui.sh        # http://127.0.0.1:5173  general UI
```

### Gas demo path (preferred)
1. Open http://127.0.0.1:5174  
2. Paste Kalshi ticker (or use mid fallback)  
3. **Bootstrap + AI factors** → base graph + 3–5 AI **proposed** nodes  
4. Select proposed → Activate / or **Activate all proposed + wire**  
5. Edit factors → Save & re-sim → watch model gas distribution  
6. Refresh mid → Preview BUY → Confirm BUY → 20% Auto-SELL  

### API demo endpoints
- `POST /demo/gas/bootstrap` — seed + optional AI expand  
- `POST /demo/gas/{id}/expand` — more AI dynamic factors  
- `POST /demo/gas/{id}/activate-all-proposed?wire=true`  

### Tests
```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q    # 20 passed
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q  # 16 passed
```

### Verification suite
```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q && \
cd ../lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
```
**Pass:** 20 + 15, exit 0.

---

## Current State Assessment

### Working ✅
- LNS kernel MC, SQLite, events, wire, activate/reject
- OpenRouter propose + normalize (user models in `.env`)
- UI graph inspect/edit/freshness + gas panel
- Gas domain seed (`build_gas_graph`)
- Kalshi public market GET + **RSA-auth balance** (prod verified)
- **Live order place** (`POST /kalshi/orders` with confirm)
- **Auto-sell 20%** (`POST /kalshi/auto-sell-20pct`)
- Trade journal SQLite (`~/.lns/lns_journal.db` beside main DB)
- Stake caps + preview/confirm gates
- GitHub `main` through `011705d`

### Incomplete ⚠️
- Full Brier **scorecard UI** for resolved events (API has `/scoring/brier` only)
- Automatic ticker discovery for “US gas this week” (user pastes ticker)
- Historical multi-event calibration dashboard
- README still light on full trading walkthrough (plan doc is stronger)
- No CI workflows yet
- Order fill confirmation vs limit order resting (partial fills not deeply modeled)

### Broken ❌
- None known in unit tests
- **Demo vs prod:** prod keys fail on demo API (use `KALSHI_ENV=prod`)

### Blockers 🚧
- Live gas **ticker** must be copied from Kalshi UI (series filters flaky/rate-limited)
- Do not leave PEM copies in repo root (e.g. never `MyESS.txt`)

---

## Feature Completion Matrix

| Feature | Status | Evidence | Priority |
|---------|--------|----------|----------|
| Living graph + MC + UI | ✅ | kernel/server tests; user demo | done |
| OpenRouter propose / activate / wire | ✅ | app + UI; user validated | done |
| Gas domain seed | ✅ | `gas_seed.py`, tests | done |
| Kalshi mid refresh | ✅ | `POST .../kalshi/refresh-mid` | done |
| Journal + 20% rule | ✅ | `journal.py`, tests | done |
| Live buy/sell + auto-sell | ✅ | `kalshi_client.place_order`, UI | done |
| Brier helper | ✅ | `scoring.brier`, `/scoring/brier` | partial UI |
| Multi-event scorecard | ⚠️ | missing | P1 |
| Residual auto-propose | ⚠️ | not built | P2 |

---

## Recent Changes

| Date | SHA | Change |
|------|-----|--------|
| 2026-07-27 | 011705d | Live Kalshi orders + 20% auto-sell + confirm gates |
| 2026-07-27 | 7400157 | Gas use-case + journal 20% exit (paper/journal first) |
| 2026-07-27 | 625546c | Kalshi ~$10 policy docs + three build targets |
| 2026-07-27 | 737b96c | Initial handoff packet |
| 2026-07-27 | 7a9339b | Wire-into-chain |
| 2026-07-27 | ba4d096 | Initial v0.1 shell |

**Uncommitted:** none expected after this handoff commit  
**Stash:** none  

---

## Configuration & Secrets

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY`, `MODEL_REASONING`, `MODEL_FAST`, `OPENROUTER_MODEL` | AI propose |
| `KALSHI_ENV` | `prod` or `demo` |
| `KALSHI_API_KEY` / `KALSHI_API_KEY_ID` | API key id |
| `KALSHI_PRIVATE_KEY_PATH` | Path to RSA PEM |
| `kalshi_max_notional_usd` / `kalshi_max_contracts` | Settings defaults 3 / 3 |
| `kalshi_exit_move_pct` | Default 0.20 |

**Never commit** `.env`, `*.pem`, or key dump files.

---

## Key API surface (Kalshi / gas)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/kalshi/balance` | Auth |
| GET | `/kalshi/markets/{ticker}` | Public quote |
| POST | `/use-cases/gas/graph` | Domain seed |
| POST | `/graphs/{id}/kalshi/refresh-mid?ticker=` | Update baseline node |
| POST | `/kalshi/orders` | `confirm=false` preview; `true` execute |
| POST | `/kalshi/auto-sell-20pct` | Dry or live 20% sells |
| POST | `/journal/positions` | Manual journal without order |
| POST | `/scoring/brier` | `p`, `y` query params |

---

## Next Steps (priority)

1. **P0 — Operator dry-run** — Restart stack; balance; preview buy on a real gas ticker; only then live 1 contract.  
2. **P1 — Resolution scorecard** — After markets resolve, record y∈{0,1}, freeze mid, Brier table in UI.  
3. **P1 — Ticker helper** — List open gas threshold markets from Kalshi so user doesn’t hunt URLs.  
4. **P2 — CI** — GitHub Actions pytest.  
5. **P2 — Fill-aware journal** — Tie journal to actual fill price from order response.

---

## Open Questions
- Prefer take-profit-only (+20%) vs bidirectional 20% exit (current = both directions)?  
- Auto-poll auto-sell on a timer, or button-only (current = button)?  
- Keep Grok MCP on demo or align MCP env to **prod** for agent-side trading tools?

---

## Assumptions
1. Single-user localhost remains correct.  
2. Kalshi prod credentials + ~$10 project account.  
3. User selects OpenRouter models.  
4. No mocks.  
5. Non-clinical.  
6. Micro-stakes allowed with explicit confirm.

---

## Appendix: Machine-Readable Summary
```json
{
  "project": "Living Node Swarm",
  "generated": "2026-07-27",
  "repo": {
    "remote": "https://github.com/deesatzed/Living_Node_Swarm.git",
    "branch": "main",
    "commit": "011705d6293c6992146874c8d1d89726937f8cd3",
    "uncommitted_changes": false
  },
  "health": {
    "tests_passing": 35,
    "tests_failing": 0,
    "kernel": 20,
    "server": 15
  },
  "kalshi": {
    "project_only": true,
    "approx_balance_usd": 10,
    "env": "prod",
    "exit_rule": "rel_move_yes_mid >= 0.20",
    "max_notional_usd": 3,
    "max_contracts": 3,
    "live_orders": true,
    "auto_sell_20pct": true
  },
  "status": {
    "working": [
      "lns_core",
      "openrouter_propose",
      "wire_activate",
      "gas_seed",
      "kalshi_mid",
      "live_orders",
      "auto_sell_20pct"
    ],
    "incomplete": [
      "resolution_scorecard_ui",
      "gas_ticker_discovery",
      "ci"
    ],
    "broken": [],
    "blockers": ["paste_exact_kalshi_ticker"]
  },
  "next_steps": [
    {"task": "Operator dry-run balance+preview+optional 1ct buy", "priority": "P0"},
    {"task": "Resolution Brier scorecard UI", "priority": "P1"},
    {"task": "Gas market ticker discovery list", "priority": "P1"}
  ]
}
```

---

**Companion:** `HANDOFF_LATEST.md` (copy of this file).  
**End of handoff.**
