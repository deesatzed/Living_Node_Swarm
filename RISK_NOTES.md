# RISK_NOTES.md

## Domain-General Goal Risks

| Risk | Severity | Why It Matters | Mitigation |
|---|---|---|---|
| Ambiguous resolution oracle | Critical | A forecast cannot be scored when product, grade, price basis, date rule, or fallback is unclear. | `TargetContract` is Gate 0 and blocks simulation when incomplete. |
| Dimensionally invalid relationships | Critical | An attractive graph can add incompatible units or use arbitrary coefficients. | Typed `RelationshipContract`, coefficient units, and pre-simulation validation. |
| AI-generated false precision | Critical | Plausible-looking distributions may have no empirical or expert basis. | Parameter elicitation receipts, intuitive quantiles, derived canonical parameters, visible unsupported state. |
| Correlated factor double counting | Critical | Multiple paths can represent the same shock and distort tails. | Shared latent parents, duplicate/overlap review, unresolved-dependence warnings, ablation caveats. |
| Static graph misrepresents one-year dynamics | Critical | Delays, inventories, policy expiry, and hysteresis matter. | Forecast origin/horizon plus time-expanded lags; same-time cycles explicitly deferred. |
| Unsafe source ingestion | Critical | User URLs can cause SSRF or prompt injection. | Fail-closed URL validation, untrusted-content isolation, size/time/type limits, routing receipts. |
| Visual sophistication mistaken for accuracy | High | A compelling GUI may oversell unvalidated structure. | Separate “changed” from “improved”; require scoring and leakage-safe evidence for lift claims. |
| Fifteen-factor filler | High | A numeric candidate quota can reward duplication and weak factors. | Rank distinct candidates; show observability/evidence/overlap; active count remains evidence-driven. |
| Base app and gas demo drift | High | Duplicate implementations would undermine domain generality. | Shared UI package; gas becomes a preset/adapter. |
| Neodymium history unavailable or restricted | High | Multi-hop lift cannot be evaluated without usable history. | Preserve the workflow, report the limitation, and do not claim lift. |

## Existing Gas/Kalshi Risks

## Risks

| Risk | Severity | Why It Matters | Mitigation |
|---|---|---|---|
| Journal treats submitted orders as positions/closures | High | A limit order can rest, reject, partially fill, or fill at a different price. The journal currently opens after a submitted buy and closes after a submitted sell/auto-sell without confirmed fills. | Add order IDs, order-status/fill retrieval, partial-fill state, and reconcile before changing a journal position. |
| Generic 20% exit for YES and NO | High | The rule is based on absolute YES-mid movement; that is a policy choice, not a side-aware PnL/risk exit. For NO, cost and outcome framing also need explicit validation. | Decide and document the exit policy, then test YES and NO paths against actual Kalshi payloads and fills. |
| Manual ticker entry | Medium | An operator can use a stale, wrong, or non-gas ticker; the primary demo exposes no searchable contract identity, close time, rules, or resolution source before live trade. | Build a gas-market browser and a selected-contract verification card. |
| Live order confirmation is weak | Medium | The final button uses a browser confirm; it does not bind to a specific reviewed preview, price, expiry, or max loss. | Require a fresh preview receipt and render a dedicated review-and-confirm dialog. |
| AI factor provenance is thin | Medium | Dynamic factors can look authoritative without source, uncertainty, or clear effect-on-model explanation. | Show proposed-factor provenance, rationale, dependencies, expected directional influence, and a before/after simulation comparison. |
| No calibration product surface | Medium | Brier helper exists, but there is no frozen prediction registry, resolution workflow, score history, or display. The stated evaluation purpose is therefore not yet user-visible. | Build scorecard workflow before treating the product as evidence-producing. |
| No CI or browser tests | Medium | Current local unit/build success does not protect the demo flow, order controls, or future changes. | Add GitHub Actions plus deterministic browser/API integration tests with provider calls stubbed only in test fixtures. |
| Build artifacts are not ignored | Low | TypeScript incremental build metadata became untracked during local verification. | Add `*.tsbuildinfo` to `.gitignore` when making the next housekeeping change. |

## Safe Next Step

Begin Gate 0 only: implement and test the typed contracts in `TASK_QUEUE.md`, starting with `Q0-01 TargetContract`. Do not begin live research, visual redesign, or gas/trading work before the corresponding earlier gates pass.
