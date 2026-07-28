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
| [P06] Branch revision/refinement delta | Fixture-only | At both required viewports, the canonical Build journey removes a fixture candidate factor, extends the Freight-capacity branch, requests and replays the resulting fixture revision, and renders the complete removed/added-factor and added-dependency delta with `Active graph unchanged: yes`. It then materializes the unedited deterministic fixture, creates an exact server-issued structural binding for the selected three-hop Weather → Freight → Refining → target path, runs its in-memory active-versus-candidate structural comparison with a no-mutation receipt, and only then allows named/acknowledged project approval to render the graph-v2 receipt. | The replay remains browser-session fixture state. The approval covers one fixture scenario-assumption path only; the comparison is structural impact, not live research or accuracy evidence. |
| [P07] Distribution intuitive edit | Partial | Canonical fixture Monitor → Edit stages Normal median/P90 plus all six non-quantile family forms through the server derivation route, preserves server-issued receipts, runs Normal/Gamma non-active numeric equivalents, and saves Normal/Gamma provenance-bearing candidates for exact review; server approval tests prove the binding atomically activates matching parameters and the full node provenance. Components prove the inspector immediately refreshes approved support, as-of, method, confidence, and evidence fields from the returned graph; all families expose explicit tail/alternative/limitation guidance and a server-returned fixed-seed p05/p50/p95 display interval. | Fixture-only inputs; browser proposal-review/approval is shown only for Normal/Gamma, and fitting remains. |
| [P08] Two named assumption variants | Fixture-only | `ScenarioEditor` component coverage and canonical Run fixture execute Demand-upside and Demand-downside version-bound scenarios, then display their means, p05–p95 ranges, and override-to-target bindings side by side. | Each receipt remains an independent in-memory comparison against the approved graph; the proof uses intercepted fixture responses. |
| [P09] Model decision and ensemble | Partial | Build browser proof now covers one three-hop fixture path through exact structural binding, in-memory active-versus-candidate structural comparison, and named project approval, while saved ensemble configurations require a nonblank operator rationale, preserve it through restart, bind it into the server-issued exact configuration hash, and show it during named review/approval. The canonical Run fixture then loads that exact binding, requests a backend weighted-mixture receipt, and proves the member graphs unchanged. | Build remains fixture-only and single-path-only; the structural comparison is not a forecast evaluation, and there is no live evaluation or complete candidate-graph decision journey. |
| [P10] Monitoring configuration | Fixture-only | `MonitoringSetup` tests and canonical Monitor journey. | No live polling or observation feed. |
| [P11] Existing-model run immutable | Fixture-only | Canonical Run test and server simulation tests. | Browser response is intercepted fixture data. |
| [P12] Existing-model branch/edit/approve | Fixture-only | Canonical Monitor → Edit covers structural comparison/approval plus all six non-quantile derivation forms and Normal/Gamma provenance-bearing distribution proposals. It now proves a further staged parameter edit invalidates a pending candidate approval, requiring a fresh comparison and binding before review can continue. | Distribution-spec final activation is server-tested; fixture coverage does not exercise every stale server-rejection branch. |
| [P13] Monitor inspect/re-run/branch | Fixture-only | Monitor component and browser proof cover immutable event inspection, an explicit handoff to the immutable Run workspace, and a separate Edit branch. | The Run handoff requires an explicit operator click and does not execute a simulation; event data is fixture-only. |
| [P14] 30-node no-overlap graph | Fixture-only verified | Canonical Build fixture renders 30 factors, asserts 30 unique `data-x:data-y` coordinates, and saves both required viewport screenshots. | Deterministic fixture layout only; not a live researched graph. |
| [P15] Graph navigation and text alternative | Locally verified | `HopGraph`/layout component tests and canonical graph path interaction. | Coverage is fixture-based. |
| [P16] Non-color status encoding | Fixture-only | Canonical Build asserts node state/evidence text and a textual model-dependency list for each rendered fixture edge, including proposed state and fixture evidence classification. | This proves the candidate fixture graph surface; a full audit of every historical/legacy edge payload remains incomplete. |
| [P17] Material-number provenance | Partial | The distribution inspector independently labels support, units, as-of time, evidence classification, provenance, and server-derived value status; focused component coverage includes both populated metadata and explicit legacy fallbacks. | The selected legacy graph record can still lack one or more fields, which render as `Not recorded`; this is not full historical-data remediation. |
| [P18] Honest comparisons | Locally verified | Shadow/structural/revision comparison receipts and tests forbid improvement language. | No accuracy claim is made. |
| [P19] State coverage | Partial | Component coverage proves cancellation of an unsaved Vet action retains the surface without recording it, provider routing shows an explicit permission-denied state until confirmation, and Project Home distinguishes loading, empty, partial-data, and total-list-failure states while retaining available rows whenever possible. | This does not yet cover every long-running, external-provider, or browser journey state. |
| [P20] Automated accessibility | Fixture-only | Axe scans report zero serious/critical violations for Project Home and both populated canonical Build viewports; keyboard/reduced-motion tests also cover the graph surface. | Not a whole-application accessibility certification or assistive-technology study. |
| [P21] Fixture labels | Locally verified | Canonical E2E and fixture labels in candidate, monitoring, and receipt UI. | Labels do not turn fixtures into live evidence. |
| [P22] URL/provider routing safety | Locally verified | Safe-fetch/server security tests and consent UI tests. | No provider content execution is claimed. |
| [P23] Proposal cannot mutate early | Locally verified | Kernel/server approval tests and Edit browser receipts. | Applies to tested proposal contracts. |
| [P24] Screenshots and final report | Partial | Four required screenshots plus this report and receipts. | Screenshots are fixture-only; report records outstanding work. |
| [P25] Regression surface | Locally verified | Kernel 86, server 89, shared UI 128, canonical Playwright 8, UI/gas builds, and `git diff --check` from this session. | Fresh command output is local, not CI. |

## Saved visual artifacts

- `canonical-build-1280x800.png`
- `canonical-build-1440x900.png`
- `canonical-fixture-build-1280x800.png`
- `canonical-fixture-build-1440x900.png`

## Remaining limitations

The GUI goal is not complete. The highest material gaps are a complete Build-to-Decision browser journey, dedicated 30-node viewport proof, full state/accessibility coverage, live capability verification where separately authorized, and the broader non-GUI `GOAL.md` scientific/evaluation work. No fixture result is represented as live research, forecast accuracy, calibration, or investment advice.
