#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEMP_ROOT"' EXIT

if OUTPUT="$($ROOT/scripts/verify_gui.sh --root "$TEMP_ROOT" 2>&1)"; then
  echo "expected incomplete GUI evidence to fail verification" >&2
  exit 1
fi

if [[ "$OUTPUT" != *"missing required GUI evidence"* ]]; then
  echo "expected missing-evidence diagnostic, got: $OUTPUT" >&2
  exit 1
fi

echo "verify_gui rejects incomplete evidence"
