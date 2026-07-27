# Kalshi MCP + Living Node Swarm

## Project policy (owner decision, 2026-07-27)

This project’s Kalshi account is **dedicated to Living Node Swarm**.

| Policy | Detail |
|--------|--------|
| Balance | ~**$10** USD — intentionally small |
| Purpose | Research, scoring, sponsor demos, optional **micro-stakes** validation |
| Scope | Fair game to use for LNS experiments (including small real orders when useful) |
| Not | Personal trading book, multi-strategy hedge fund, or sponsor “alpha product” claims |

**Still true:** not investment advice; log every material number with source + time; no mock Kalshi data.

**Stake discipline (recommended):**

- Prefer contracts where a **few dollars** of risk is enough to prove the loop  
- Cap any single experiment (e.g. ≤ **$2–3** notional unless owner says otherwise)  
- Prefer **research metrics** (Brier vs mid/resolution) over PnL theater  
- Always preview orders (`confirm=true` / MCP preview) before placing  

---

## Should you use MCP, a skill, or both?

| Layer | What it does | Use when |
|-------|----------------|----------|
| **Kalshi MCP** | Live tools: markets, orderbook, rules PDF, portfolio/orders | Agent needs **real Kalshi data** or micro-stakes |
| **`kalshi-lns` skill** | Map markets → LNS nodes, Brier metrics, stake discipline | Sponsor demo / scoring / graph design |
| **LNS kernel/API** | Explicit graph + MC + propose/activate/wire | Product truth lives here |

**Recommendation:** MCP **enabled** (credentials configured for this machine) + **`kalshi-lns` skill**. Use **prod** only when validating against real markets with the $10 budget; use **demo** when testing plumbing without risk.

---

## Recommended MCP: `mcp-server-kalshi`

- Repo: https://github.com/9crusher/mcp-server-kalshi  
- Run: `uvx mcp-server-kalshi`  
- Strengths for LNS:
  - Discovery + orderbook + candlesticks  
  - **Settlement rules + contract PDF text**  
  - Market tools work without credentials  
  - Orders require `confirm=true` (preview by default)  
  - Env: `KALSHI_ENV=demo|prod`, `KALSHI_API_KEY`, `KALSHI_PRIVATE_KEY_PATH`

### Alternative: `@iqai/mcp-kalshi`

- npm: `@iqai/mcp-kalshi` — broader trading surface if needed later.

---

## Credentials layout (this machine)

| Item | Location / name |
|------|-----------------|
| API Key ID | `.env` → `KALSHI_API_KEY_ID` and alias `KALSHI_API_KEY` |
| RSA private key | **File** `~/.lns/kalshi_private.pem` (mode 600) — **not** multiline in dotenv |
| Helper | `source ~/.lns/kalshi_env.sh` |
| Grok MCP | User config `kalshi` → `uvx mcp-server-kalshi` (doctor: 24 tools OK) |

### Important: multiline PEM in `.env` breaks

Dotenv only keeps the first line of a PEM. Always use `KALSHI_PRIVATE_KEY_PATH`.

```bash
source ~/.lns/kalshi_env.sh
grok mcp doctor kalshi
```

### Grok config pattern

```toml
[mcp_servers.kalshi]
command = "uvx"
args = ["mcp-server-kalshi"]
enabled = true
startup_timeout_sec = 120
env = {
  KALSHI_ENV = "prod",   # or demo for dry plumbing
  KALSHI_API_KEY = "${KALSHI_API_KEY}",
  KALSHI_PRIVATE_KEY_PATH = "${KALSHI_PRIVATE_KEY_PATH}"
}
```

Do **not** commit secrets. Project `.grok/config.toml` stays non-secret stubs only.

---

## LNS skill

Project skill: `.grok/skills/kalshi-lns/SKILL.md`

---

## Env vars (`.env` — gitignored)

```bash
KALSHI_ENV=prod   # or demo
KALSHI_API_KEY=                 # Kalshi API Key ID
KALSHI_API_KEY_ID=              # optional alias
KALSHI_PRIVATE_KEY_PATH=/Users/YOU/.lns/kalshi_private.pem
```

Also: OpenRouter vars for propose-node.

---

## How this fits the sponsor demo

```text
Kalshi MCP  →  market mid + rules + optional micro-position + resolution
     ↓
kalshi-lns skill  →  claim + node map + Brier / Δ-score definitions
     ↓
LNS kernel/UI  →  living graph, MC, human-gated AI expand, scorecard
```

**Primary success metrics:** Brier vs resolution, vs market mid at freeze time, Δ after activate+wire.  
**Secondary:** tiny realized PnL only as optional “loop closed with real money” evidence — not the product claim.

---

## Verify

```bash
source ~/.lns/kalshi_env.sh
grok mcp list
grok mcp doctor kalshi
```
