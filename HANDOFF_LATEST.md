# Living Node Swarm — Latest Handoff

**Active goal:** `GOAL_GUI.md` under the broader `GOAL.md` contract.

**Status:** Gate 4 is substantially implemented and locally fixture-verified, but the product goal is not complete. Gates 5–7 remain red or partial. Do not relabel fixture evidence as live research, live monitoring, evaluation, or forecast quality.

**Repository:** `main` is ahead of `origin/main` by 175 local commits at this handoff. No commits were pushed by this run.

## Required Read Order

1. `GOAL.md`
2. `STANDARDS.md`
3. `IMPLEMENT.md`
4. `DECISIONS.md`
5. `PROGRESS.md`
6. `TASK_QUEUE.md`
7. `GOAL_GUI.md`
8. `docs/verification/gui/FINAL_GUI_REPORT.md`
9. `docs/plans/2026-07-27-domain-general-prediction-workspace-implementation.md`

## Current Truth

- The shared Prediction Workspace is canonical in `packages/lns_ui_shared`; `lns_ui` consumes its typed client/components.
- The UI has fixture-backed Build, Run, Monitor, and draft Edit journeys, an eight-family distribution inspector, persisted relationship metadata, exact-binding structural review, and graph-linked evidence context.
- Canonical browser proof is fixture-intercepted only. The latest recorded local suite is 8 Playwright tests; it is not live provider, research, monitoring, or acceptance proof.
- The shared UI suite currently has 124 tests. Kernel and server counts recorded in the GUI report are 86 and 89 respectively; rerun them before making a fresh release claim.
- The Gas preset now mounts `WorkspaceShell`, but its internal graph/inspector controls are still preset-specific. Live buy, live auto-sell, and bulk activation/wiring are disabled.
- `.github/workflows/verify.yml` exists and defines clean-checkout verification, but it has not been remotely exercised because this branch has not been pushed.

## Immediate Next Work

1. Continue Q4 gaps that materially improve the full user journey: complete Build-to-Decision browser proof, state/accessibility coverage, and missing visual review controls.
2. Keep Q5 acceptance red until an explicit, safe, authorized Neodymium source/research/evaluation packet exists. Never fetch or route provider content without the required consent and credentials.
3. Continue Q6 shared-preset migration without re-enabling bulk activation or real-money controls.
4. Do not mark Q7/overall completion until clean remote CI and a requirement-by-requirement reality audit provide current evidence.

## Required Verification

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui_shared && npm test -- --run && npm run build
cd packages/lns_ui && npm run build && npm run test:e2e
cd packages/lns_gas_demo && npm run build
cd ../.. && ./scripts/verify_gui.sh && git diff --check
```

Restore generated Playwright screenshots and delete `packages/lns_ui/test-results/.last-run.json` before committing unless their changes are explicitly intended evidence updates.

## Safety Boundaries

- No live Kalshi order, confirmation, or auto-sell request is authorized.
- No secrets, local databases, or provider credentials may be exposed or committed.
- Preserve proposal-versus-active separation and exact approval bindings.
- Keep missing legacy metadata visible as `Not recorded`; do not invent scientific or evidence values.
