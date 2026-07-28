# GUI Workspace Verification Matrix — 2026-07-28

This receipt records a local verification pass for the active `GOAL_GUI.md`
implementation. It is not a claim that the broader goal or its Neodymium
acceptance gates are complete.

| Surface | Command | Result |
|---|---|---|
| Scientific kernel | `cd packages/lns_kernel && PYTHONPATH=src pytest -q` | 75 passed |
| Workspace server | `cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q` | 68 passed; one FastAPI/Starlette TestClient deprecation warning |
| Shared UI | `cd packages/lns_ui_shared && npm test -- --run && npm run build` | 29 files / 92 tests passed; type build passed |
| Canonical UI | `cd packages/lns_ui && npm run build && npm run test:e2e` | production build passed; 6 fixture-intercepted Playwright checks passed |
| Gas adapter | `cd packages/lns_gas_demo && npm run build` | production build passed |
| Working tree | `git diff --check` | passed after cleaning generated Playwright artifacts |

The browser checks are localhost fixture interception only. They do not prove
live research, provider execution, structural proposal approval, Neodymium
acceptance, or forecasting accuracy.
