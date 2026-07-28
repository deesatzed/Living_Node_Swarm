#!/usr/bin/env bash
# Fail closed when the committed GUI evidence packet is incomplete or mislabeled.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EVIDENCE_ROOT="$REPO_ROOT"
if [[ "${1:-}" == "--root" ]]; then
  EVIDENCE_ROOT="${2:?--root requires a directory}"
  shift 2
fi
if [[ $# -ne 0 ]]; then
  echo "usage: $0 [--root evidence-root]" >&2
  exit 2
fi

EVIDENCE_DIR="$EVIDENCE_ROOT/docs/verification/gui"
required=(
  "$EVIDENCE_DIR/canonical-build-1280x800.png"
  "$EVIDENCE_DIR/canonical-build-1440x900.png"
  "$EVIDENCE_DIR/canonical-fixture-build-1280x800.png"
  "$EVIDENCE_DIR/canonical-fixture-build-1440x900.png"
  "$EVIDENCE_DIR/e2e-receipt.json"
  "$EVIDENCE_DIR/accessibility-receipt.json"
  "$EVIDENCE_DIR/FINAL_GUI_REPORT.md"
)

missing=()
for path in "${required[@]}"; do
  [[ -s "$path" ]] || missing+=("${path#$EVIDENCE_ROOT/}")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "missing required GUI evidence: ${missing[*]}" >&2
  exit 1
fi

node - "$EVIDENCE_DIR/e2e-receipt.json" "$EVIDENCE_DIR/accessibility-receipt.json" <<'NODE'
const fs = require("node:fs");
const [e2ePath, accessibilityPath] = process.argv.slice(2);
function receipt(path, required) {
  let value;
  try { value = JSON.parse(fs.readFileSync(path, "utf8")); }
  catch (error) { throw new Error(`${path} is not valid JSON: ${error.message}`); }
  for (const [key, expected] of Object.entries(required)) {
    if (value[key] !== expected) throw new Error(`${path} must contain ${key}=${JSON.stringify(expected)}`);
  }
  if (typeof value.command !== "string" || !value.command.trim()) throw new Error(`${path} must name its verification command`);
  if (!Array.isArray(value.limitations) || value.limitations.length === 0) throw new Error(`${path} must include explicit limitations`);
}
try {
  receipt(e2ePath, { result: "passed", evidence_classification: "fixture_only" });
  receipt(accessibilityPath, { result: "passed", evidence_classification: "fixture_only", serious_or_critical_violations: 0 });
} catch (error) {
  console.error(`invalid GUI evidence: ${error.message}`);
  process.exit(1);
}
NODE

for proof in $(seq -w 1 25); do
  if ! grep -q "\[P${proof}\]" "$EVIDENCE_DIR/FINAL_GUI_REPORT.md"; then
    echo "missing GUI proof mapping [P${proof}] in FINAL_GUI_REPORT.md" >&2
    exit 1
  fi
done
if ! grep -qi "fixture" "$EVIDENCE_DIR/FINAL_GUI_REPORT.md" || ! grep -qi "limited\|deferred" "$EVIDENCE_DIR/FINAL_GUI_REPORT.md"; then
  echo "FINAL_GUI_REPORT.md must distinguish fixture and limited/deferred evidence" >&2
  exit 1
fi

echo "GUI evidence gate passed: screenshots, fixture receipts, accessibility result, and P01-P25 proof map are present."
