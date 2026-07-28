# GUI Verification Report

**Status:** In progress — this is an evidence map, not a completion declaration.

**Latest local verification:** 2026-07-28. The canonical Playwright suite passed 8 fixture-intercepted tests; the Project Home axe scan reported zero serious or critical violations. See [e2e-receipt.json](e2e-receipt.json) and [accessibility-receipt.json](accessibility-receipt.json).

## Evidence classification

- **Locally verified:** source, unit/component/API tests, production builds, and deterministic browser journeys listed below.
- **Fixture-only:** candidate research, monitoring events, browser API responses, and screenshot journeys are deterministic test fixtures, not live research or polling.
- **Limited/deferred:** live provider execution, live monitoring, complete accessibility coverage, scientific evaluation, and production deployment are not represented as verified.

## `GOAL_GUI.md` proof map

| Proof | Status | Direct current evidence | Truth boundary |
|---|---|---|---|
| [P01] Shared architecture | Locally verified | `lns_ui` and `lns_gas_demo` import `@lns/ui-shared`; both production builds pass. | Generalized behavior is shared; gas remains a limited adapter. |
| [P02] Canonical TypeScript build | Locally verified | `cd packages/lns_ui && npm run build` passes. | Local build only. |
| [P03] Shared API/catalog compatibility | Locally verified | `packages/lns_ui_shared/src/api/client.test.ts`; shared test suite passes. | Covers tested contract drift, not every future API change. |
| [P04] Browser is non-authoritative | Locally verified | Server/kernel proposal, simulation, and ensemble tests; UI receipts state server ownership. | Does not prove remote deployment boundaries. |
| [P05] New Neodymium target and 15 factors | Fixture-only | Canonical fixture Build tests and screenshots at both viewports. | No live Neodymium research. |
| [P06] Branch revision/refinement delta | Partial | Durable revision comparison and structural Edit component/browser tests. | Branch extension/replay is not a complete end-to-end new-model journey. |
| [P07] Distribution intuitive edit | Partial | Distribution inspector and elicitation component/server tests. | Canonical browser journey does not yet prove invalid-value editing end-to-end. |
| [P08] Two named assumption variants | Partial | `ScenarioEditor` component tests and Run comparison surfaces. | Browser proof does not yet compare two named shadow variants side-by-side. |
| [P09] Model decision and ensemble | Partial | `RunModel` tests and canonical Run fixture ensemble receipt. | Not a complete new-model decision journey. |
| [P10] Monitoring configuration | Fixture-only | `MonitoringSetup` tests and canonical Monitor journey. | No live polling or observation feed. |
| [P11] Existing-model run immutable | Fixture-only | Canonical Run test and server simulation tests. | Browser response is intercepted fixture data. |
| [P12] Existing-model branch/edit/approve | Fixture-only | Canonical Monitor → Edit structural comparison/approval journey. | Does not yet prove every stale-approval branch in Playwright. |
| [P13] Monitor inspect/re-run/branch | Partial | Monitor component and browser proof cover inspect/branch. | Re-run action remains limited. |
| [P14] 30-node no-overlap graph | Partial | Graph layout/component coverage and 15-factor canonical fixture screenshots. | A dedicated 30-node viewport proof is absent. |
| [P15] Graph navigation and text alternative | Locally verified | `HopGraph`/layout component tests and canonical graph path interaction. | Coverage is fixture-based. |
| [P16] Non-color status encoding | Partial | Status labels appear in graph/workspace components and tests. | Full every-node/every-edge audit remains. |
| [P17] Material-number provenance | Partial | Distribution inspector/graph node tests. | Some legacy graph fields remain explicitly not recorded. |
| [P18] Honest comparisons | Locally verified | Shadow/structural/revision comparison receipts and tests forbid improvement language. | No accuracy claim is made. |
| [P19] State coverage | Partial | Loading/error/stale component cases exist. | Cancelled and permission-denied browser coverage remains incomplete. |
| [P20] Automated accessibility | Partial | Axe Project Home scan: zero serious/critical; keyboard/reduced-motion tests. | Not a whole-application accessibility certification. |
| [P21] Fixture labels | Locally verified | Canonical E2E and fixture labels in candidate, monitoring, and receipt UI. | Labels do not turn fixtures into live evidence. |
| [P22] URL/provider routing safety | Locally verified | Safe-fetch/server security tests and consent UI tests. | No provider content execution is claimed. |
| [P23] Proposal cannot mutate early | Locally verified | Kernel/server approval tests and Edit browser receipts. | Applies to tested proposal contracts. |
| [P24] Screenshots and final report | Partial | Four required screenshots plus this report and receipts. | Screenshots are fixture-only; report records outstanding work. |
| [P25] Regression surface | Locally verified | Kernel 78, server 78, shared UI 103, canonical Playwright 8, UI/gas builds, and `git diff --check` from this session. | Fresh command output is local, not CI. |

## Saved visual artifacts

- `canonical-build-1280x800.png`
- `canonical-build-1440x900.png`
- `canonical-fixture-build-1280x800.png`
- `canonical-fixture-build-1440x900.png`

## Remaining limitations

The GUI goal is not complete. The highest material gaps are a complete Build-to-Decision browser journey, dedicated 30-node viewport proof, full state/accessibility coverage, live capability verification where separately authorized, and the broader non-GUI `GOAL.md` scientific/evaluation work. No fixture result is represented as live research, forecast accuracy, calibration, or investment advice.
