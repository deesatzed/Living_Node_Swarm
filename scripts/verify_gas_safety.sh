#!/usr/bin/env bash
set -euo pipefail

if rg -n 'activateAll|activateOne|confirm:\s*true|autoSell\(true\)' packages/lns_gas_demo/src; then
  echo "Gas safety verification failed: an unreviewed activation or confirmed auto-sale path is exposed." >&2
  exit 1
fi

echo "Gas safety verification passed: no direct activation or confirmed auto-sale UI path is exposed."
