#!/usr/bin/env bash
# Living Node Swarm v0.1 — local single-user launcher (127.0.0.1 only)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PYTHONPATH="${ROOT}/packages/lns_kernel/src:${ROOT}/packages/lns_server/src${PYTHONPATH:+:$PYTHONPATH}"
cd "$ROOT"

# Load repo-root .env without printing secrets
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
  echo "Loaded .env from repo root"
else
  echo "No .env at $ROOT/.env — set OPENROUTER_API_KEY and MODEL_REASONING / MODEL_FAST"
fi

HOST="${LNS_HOST:-127.0.0.1}"
PORT="${LNS_PORT:-8787}"
DB_PATH="${LNS_DB_PATH:-$HOME/.lns/lns.db}"
mkdir -p "$(dirname "$DB_PATH")"

echo "Starting LNS API on http://${HOST}:${PORT}"
echo "DB: ${DB_PATH}"
echo "OpenRouter key: ${OPENROUTER_API_KEY:+set}${OPENROUTER_API_KEY:-NOT SET}"
echo "MODEL_REASONING: ${MODEL_REASONING:-unset}"
echo "MODEL_FAST: ${MODEL_FAST:-unset}"
echo "OPENROUTER_MODEL: ${OPENROUTER_MODEL:-unset}"

exec python -m uvicorn lns_server.app:app --host "$HOST" --port "$PORT"
