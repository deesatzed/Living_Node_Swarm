#!/usr/bin/env bash
# Launch the separate Gas Demo GUI (port 5174). API must be on 8787.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/packages/lns_gas_demo"
if [[ ! -d node_modules ]]; then
  npm install
fi
echo "Gas demo UI → http://127.0.0.1:5174"
echo "Requires API: ./scripts/run_local.sh  (http://127.0.0.1:8787)"
exec npm run dev
