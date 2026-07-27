# Domain-General Prediction Workspace Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a generalized, provenance-preserving probabilistic authoring and visualization workflow, prove it with a one-year Neodymium scenario, and adapt gas as a shared preset.

**Architecture:** Add typed scientific/evidence contracts and a registry-backed Monte Carlo kernel; add bounded research and explicit proposal/approval orchestration in FastAPI; create a private shared React package used by both the canonical app and gas preset. Work gate-by-gate and preserve backward compatibility with current graphs.

**Tech Stack:** Python 3.11+, Pydantic 2, NumPy, SQLite, FastAPI, HTTPX, React 19, TypeScript, Vite, Vitest/Testing Library, Playwright.

---

## Preparation

Implement in a dedicated feature branch/worktree after committing the approved control documents. Before each task:

```bash
git status --short --branch
sed -n '1,240p' GOAL.md
sed -n '1,240p' STANDARDS.md
sed -n '1,240p' DECISIONS.md
sed -n '1,240p' PROGRESS.md
```

Do not include live secrets, provider calls, or Kalshi actions in test runs.

### Task 1: TargetContract

**Files:**

- Create: `packages/lns_kernel/src/lns_kernel/contracts.py`
- Create: `packages/lns_kernel/tests/test_target_contract.py`
- Modify: `packages/lns_kernel/src/lns_kernel/__init__.py`

**Step 1: Write failing target tests**

```python
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from lns_kernel.contracts import TargetContract


def test_neodymium_target_is_resolution_grade():
    target = TargetContract(
        id="nd-retail-2027",
        question="Neodymium private-investor retail price in one year",
        target_node_id="nd_price",
        forecast_origin=datetime(2026, 7, 27, tzinfo=timezone.utc),
        resolution_at=datetime(2027, 7, 27, tzinfo=timezone.utc),
        product="neodymium",
        grade="private-investor retail series",
        price_basis="retail",
        geography="publisher series",
        currency="USD",
        unit="USD/kg",
        oracle_url="https://strategicmetalsinvest.com/neodymium-prices/",
        observation_rule="first published value on resolution date",
        missing_source_fallback="unresolved",
        revision_policy="use first captured value",
    )
    assert target.horizon_days == 365


def test_target_rejects_missing_price_basis():
    with pytest.raises(ValidationError):
        TargetContract(...)
```

**Step 2: Run the focused test**

Run:

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_target_contract.py -q
```

Expected: FAIL because `lns_kernel.contracts` does not exist.

**Step 3: Implement the minimal contract**

Create immutable/versioned Pydantic models with validators for:

- timezone-aware origin/resolution;
- resolution after origin;
- non-empty oracle, units, price basis, observation rule, fallback, revision policy;
- derived `horizon_days`;
- schema version.

Do not add source fetching.

**Step 4: Run the focused and full kernel tests**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_target_contract.py -q
cd packages/lns_kernel && PYTHONPATH=src pytest -q
```

Expected: new tests pass; existing 20 tests remain green.

**Step 5: Update truth files and commit**

```bash
git add packages/lns_kernel/src/lns_kernel/contracts.py packages/lns_kernel/src/lns_kernel/__init__.py packages/lns_kernel/tests/test_target_contract.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(kernel): add resolution-grade target contract"
```

### Task 2: Evidence, Relationship, Proposal, and Run Contracts

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/contracts.py`
- Create: `packages/lns_kernel/tests/test_authoring_contracts.py`

**Step 1: Write failing contract round-trip tests**

Cover:

```python
def test_claim_distinguishes_retrieved_from_inferred(): ...
def test_relationship_requires_coefficient_units_for_affine(): ...
def test_approval_binds_graph_and_proposal_versions(): ...
def test_edit_after_approval_changes_binding_hash(): ...
def test_simulation_run_records_seed_engine_and_provenance(): ...
```

Use enums:

```python
class EvidenceClass(str, Enum):
    USER = "user_provided"
    RETRIEVED = "retrieved"
    INFERRED = "model_inference"
    ASSUMPTION = "scenario_assumption"
    OBSERVATION = "resolved_observation"
    UNKNOWN = "unknown"


class RelationshipType(str, Enum):
    CAUSAL_HYPOTHESIS = "causal_hypothesis"
    ACCOUNTING_IDENTITY = "accounting_identity"
    OBSERVED_RELATION = "observed_relation"
    PROXY_CORRELATION = "proxy_correlation"
    SCENARIO_ASSUMPTION = "scenario_assumption"
```

**Step 2: Run and confirm failure**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_authoring_contracts.py -q
```

Expected: missing classes/validation.

**Step 3: Implement only the typed contracts**

Add `SourceReceipt`, `EvidenceClaim`, `RelationshipContract`, `GraphProposal`, `ApprovalReceipt`, and `SimulationRun`. Use canonical JSON serialization for binding hashes. Do not implement persistence yet.

**Step 4: Verify**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_authoring_contracts.py -q
cd packages/lns_kernel && PYTHONPATH=src pytest -q
```

**Step 5: Commit**

```bash
git add packages/lns_kernel/src/lns_kernel/contracts.py packages/lns_kernel/tests/test_authoring_contracts.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(kernel): add evidence and approval contracts"
```

### Task 3: Distribution Registry Catalog

**Files:**

- Create: `packages/lns_kernel/src/lns_kernel/distributions.py`
- Create: `packages/lns_kernel/tests/test_distribution_registry.py`
- Modify: `packages/lns_kernel/src/lns_kernel/models.py`
- Modify: `packages/lns_kernel/src/lns_kernel/validation.py`

**Step 1: Write registry schema tests**

```python
from lns_kernel.distributions import REGISTRY, get_family


def test_registry_has_exact_initial_families():
    assert set(REGISTRY) == {
        "Normal", "LogNormal", "Beta", "Poisson",
        "NegativeBinomial", "Gamma", "StudentT", "Deterministic",
    }


def test_lognormal_declares_log_space_parameters():
    spec = get_family("LogNormal")
    assert tuple(spec.parameters) == ("log_loc", "log_scale")
    assert spec.support.lower == 0
    assert spec.support.lower_open is True
```

Add tests for aliases (`Gaussian`, `Student-t`, `Negative Binomial`) resolving only at ingestion.

**Step 2: Run and verify failure**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_distribution_registry.py -q
```

**Step 3: Implement catalog metadata**

Use immutable registry records:

```python
@dataclass(frozen=True)
class ParameterDefinition:
    id: str
    label: str
    description: str
    lower: float | None = None
    lower_open: bool = False


@dataclass(frozen=True)
class FamilyDefinition:
    id: str
    label: str
    parameters: tuple[str, ...]
    support: SupportDefinition
    plain_language: str
```

Update `DistributionFamily` to canonical values without yet changing the sampler. Preserve old serialized names.

**Step 4: Verify registry and old tests**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_distribution_registry.py tests/test_models_validation.py -q
```

**Step 5: Commit**

```bash
git add packages/lns_kernel/src/lns_kernel/distributions.py packages/lns_kernel/src/lns_kernel/models.py packages/lns_kernel/src/lns_kernel/validation.py packages/lns_kernel/tests/test_distribution_registry.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(kernel): define canonical distribution registry"
```

### Task 4: Registry Validation, Derived Statistics, and Sampling

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/distributions.py`
- Modify: `packages/lns_kernel/src/lns_kernel/ensemble.py`
- Modify: `packages/lns_kernel/src/lns_kernel/validation.py`
- Create: `packages/lns_kernel/tests/test_distribution_sampling.py`

**Step 1: Write failing parameter/support/moment tests**

Test:

- invalid `scale`, `rate`, `alpha`, `df`, `dispersion`;
- integer support for count families;
- non-negative/positive support;
- seeded reproducibility;
- sample moments within tolerance for documented reference cases;
- truncation behavior or explicit rejection if unsupported.

Example:

```python
def test_poisson_samples_are_nonnegative_integers():
    values = sample("Poisson", {"rate": 4.0}, n=5000, seed=7)
    assert np.all(values >= 0)
    assert np.all(values == np.floor(values))
    assert abs(values.mean() - 4.0) < 0.15
```

**Step 2: Run and confirm failure**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_distribution_sampling.py -q
```

**Step 3: Implement sampler and statistics through registry dispatch**

Replace the `if` chain in `ensemble._sample_family` with the registry sampler. Keep NumPy-only implementations initially. Implement canonical Negative Binomial conversion from `mean` and `dispersion` and document the formula.

**Step 4: Run all kernel tests**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
```

Expected: old and new family tests pass.

**Step 5: Commit**

```bash
git add packages/lns_kernel/src/lns_kernel/distributions.py packages/lns_kernel/src/lns_kernel/ensemble.py packages/lns_kernel/src/lns_kernel/validation.py packages/lns_kernel/tests/test_distribution_sampling.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(kernel): sample and validate eight distribution families"
```

### Task 5: Existing Graph Compatibility

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/models.py`
- Modify: `packages/lns_kernel/src/lns_kernel/store.py`
- Modify: `packages/lns_server/src/lns_server/proposal_normalize.py`
- Create: `packages/lns_kernel/tests/test_schema_compatibility.py`
- Modify: `packages/lns_server/tests/test_proposal_normalize.py`

**Step 1: Add old-payload fixtures**

Create tests loading current `Normal(mu,sigma)`, `LogNormal(mu,sigma)`, and `Beta(a,b)` node JSON.

Expected migration:

```text
Normal.mu → loc
Normal.sigma → scale
LogNormal.mu → log_loc
LogNormal.sigma → log_scale
Beta.a → alpha
Beta.b → beta
```

**Step 2: Confirm tests fail**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_schema_compatibility.py -q
```

**Step 3: Implement explicit migration**

Add schema version and validator-based migration. Never infer whether old LogNormal values were natural-space; current implementation proves they were passed directly to NumPy log-space sampling.

**Step 4: Verify both packages**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_proposal_normalize.py -q
```

**Step 5: Commit**

```bash
git add packages/lns_kernel/src/lns_kernel/models.py packages/lns_kernel/src/lns_kernel/store.py packages/lns_server/src/lns_server/proposal_normalize.py packages/lns_kernel/tests/test_schema_compatibility.py packages/lns_server/tests/test_proposal_normalize.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat: migrate legacy distribution parameters explicitly"
```

### Task 6: Units, Relationships, and Time-Expanded Lags

**Files:**

- Create: `packages/lns_kernel/src/lns_kernel/dimensions.py`
- Create: `packages/lns_kernel/src/lns_kernel/temporal.py`
- Modify: `packages/lns_kernel/src/lns_kernel/validation.py`
- Modify: `packages/lns_kernel/src/lns_kernel/models.py`
- Create: `packages/lns_kernel/tests/test_dimensions_temporal.py`

**Step 1: Write invalid-structure tests**

```python
def test_sum_rejects_usd_plus_probability(): ...
def test_affine_accepts_coefficient_with_output_per_input_units(): ...
def test_lag_must_be_nonnegative(): ...
def test_same_time_cycle_rejected(): ...
def test_time_expanded_feedback_path_is_acyclic(): ...
```

**Step 2: Confirm failure**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_dimensions_temporal.py -q
```

**Step 3: Implement a narrow unit model**

Use canonical unit strings plus explicit coefficient units; do not build a general symbolic algebra system. Validate:

- sum/mean parents share child units;
- affine coefficient declares `child_unit/parent_unit`;
- lags are integer periods;
- time-expanded node IDs/indices preserve a DAG.

**Step 4: Verify**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_dimensions_temporal.py -q
cd packages/lns_kernel && PYTHONPATH=src pytest -q
```

**Step 5: Commit**

```bash
git add packages/lns_kernel/src/lns_kernel/dimensions.py packages/lns_kernel/src/lns_kernel/temporal.py packages/lns_kernel/src/lns_kernel/validation.py packages/lns_kernel/src/lns_kernel/models.py packages/lns_kernel/tests/test_dimensions_temporal.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(kernel): validate relationship units and lags"
```

### Task 7: SimulationRun, Stability, and Continuous Scoring

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/simulation.py`
- Create: `packages/lns_kernel/src/lns_kernel/sensitivity.py`
- Modify: `packages/lns_kernel/src/lns_kernel/scoring.py`
- Create: `packages/lns_kernel/tests/test_run_stability_scoring.py`

**Step 1: Write failing run-receipt tests**

Test:

- same graph/seed/engine produces identical retained outputs;
- stability report compares multiple seeds/sample sizes;
- run records unresolved dependence warnings;
- interval coverage reference case;
- CRPS reference case;
- structural comparison does not contain an `improved=True` field without a score.

**Step 2: Run**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest tests/test_run_stability_scoring.py -q
```

**Step 3: Implement minimal methods**

Implement:

- run receipt construction;
- configurable stability summary;
- local node-ablation impact as the first sensitivity method;
- CRPS from samples and interval coverage helpers.

Label ablation limitations with correlated inputs.

**Step 4: Verify**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
```

**Step 5: Commit**

```bash
git add packages/lns_kernel/src/lns_kernel/simulation.py packages/lns_kernel/src/lns_kernel/sensitivity.py packages/lns_kernel/src/lns_kernel/scoring.py packages/lns_kernel/tests/test_run_stability_scoring.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(kernel): add reproducible run and continuous scoring"
```

### Task 8: Persist Contracts and Export Catalog API

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/store.py`
- Modify: `packages/lns_server/src/lns_server/app.py`
- Create: `packages/lns_server/tests/test_contract_api.py`

**Step 1: Write failing persistence/API tests**

Cover restart round-trips for all contracts and:

```text
GET  /catalog/distributions
POST /targets
GET  /targets/{id}
GET  /graphs/{id}/proposals
POST /graphs/{id}/approvals
GET  /runs/{id}
```

**Step 2: Confirm failure**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_contract_api.py -q
```

**Step 3: Add additive SQLite tables and endpoints**

Use additive tables with JSON payloads and indexed version/hash columns. Avoid destructive migration.

**Step 4: Verify server regression**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
```

**Step 5: Commit**

```bash
git add packages/lns_kernel/src/lns_kernel/store.py packages/lns_server/src/lns_server/app.py packages/lns_server/tests/test_contract_api.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(api): persist and expose prediction contracts"
```

### Task 9: Safe URL Retrieval and Evidence Store

**Files:**

- Create: `packages/lns_server/src/lns_server/url_safety.py`
- Create: `packages/lns_server/src/lns_server/research.py`
- Create: `packages/lns_server/src/lns_server/evidence_store.py`
- Create: `packages/lns_server/tests/test_url_safety.py`
- Create: `packages/lns_server/tests/test_evidence_store.py`

**Step 1: Write security tests**

Include literal and DNS-resolved cases for:

- loopback/private/link-local/reserved/metadata IPs;
- redirects to unsafe destinations;
- non-HTTP(S) schemes;
- oversized responses;
- disallowed content types;
- timeouts;
- source text containing prompt-like instructions.

Use local test transports/fixtures; do not hit the internet.

**Step 2: Confirm failure**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_url_safety.py tests/test_evidence_store.py -q
```

**Step 3: Implement fail-closed retrieval**

Revalidate destination after every redirect. Return normalized content and `SourceReceipt`; never return retrieved text as a system message.

**Step 4: Verify**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_url_safety.py tests/test_evidence_store.py -q
```

**Step 5: Commit**

```bash
git add packages/lns_server/src/lns_server/url_safety.py packages/lns_server/src/lns_server/research.py packages/lns_server/src/lns_server/evidence_store.py packages/lns_server/tests/test_url_safety.py packages/lns_server/tests/test_evidence_store.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(research): add safe retrieval and evidence receipts"
```

### Task 10: Bounded Research and Candidate Authoring

**Files:**

- Create: `packages/lns_server/src/lns_server/authoring.py`
- Create: `packages/lns_server/src/lns_server/prompt_contracts.py`
- Modify: `packages/lns_server/src/lns_server/app.py`
- Create: `packages/lns_server/tests/test_authoring_api.py`
- Create: `packages/lns_server/tests/fixtures/neodymium_research.json`

**Step 1: Write fixture-backed integration test**

The test must produce:

- exact target contract;
- research coverage/gaps;
- at least 15 distinct candidates;
- one three-hop path;
- source/evidence references;
- family/parameter/relationship proposals;
- duplicate/dependence/unit warnings;
- zero active changes before approval.

**Step 2: Confirm failure**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_authoring_api.py -q
```

**Step 3: Implement staged prompt contracts**

Use separate structured calls for:

1. research plan;
2. claim synthesis;
3. candidate factors;
4. distributions;
5. relationships;
6. critique/overlap pass.

Do not ask one model call to generate a complete active graph.

**Step 4: Verify**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_authoring_api.py -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
```

**Step 5: Commit**

```bash
git add packages/lns_server/src/lns_server/authoring.py packages/lns_server/src/lns_server/prompt_contracts.py packages/lns_server/src/lns_server/app.py packages/lns_server/tests/test_authoring_api.py packages/lns_server/tests/fixtures/neodymium_research.json PROGRESS.md TASK_QUEUE.md
git commit -m "feat(authoring): propose cited multi-hop candidate graphs"
```

### Task 11: Shadow Simulation and Version-Bound Approval

**Files:**

- Modify: `packages/lns_kernel/src/lns_kernel/store.py`
- Modify: `packages/lns_server/src/lns_server/app.py`
- Create: `packages/lns_server/tests/test_proposal_approval.py`

**Step 1: Write approval-invariant tests**

```python
def test_candidate_shadow_run_does_not_mutate_active_graph(): ...
def test_approval_fails_after_proposal_edit(): ...
def test_approval_activates_exact_bound_version_atomically(): ...
def test_batch_approval_fails_when_one_relationship_is_invalid(): ...
```

**Step 2: Confirm failure**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_proposal_approval.py -q
```

**Step 3: Implement shadow copies and atomic approval**

Store candidate graph versions separately. Validate all nodes/relationships before one transaction promotes the approved version.

**Step 4: Verify**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_proposal_approval.py -q
```

**Step 5: Commit**

```bash
git add packages/lns_kernel/src/lns_kernel/store.py packages/lns_server/src/lns_server/app.py packages/lns_server/tests/test_proposal_approval.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat: add shadow simulation and bound approvals"
```

### Task 12: Shared UI Package and Test Harness

**Files:**

- Create: `packages/lns_ui_shared/package.json`
- Create: `packages/lns_ui_shared/tsconfig.json`
- Create: `packages/lns_ui_shared/src/index.ts`
- Create: `packages/lns_ui_shared/src/api/types.ts`
- Create: `packages/lns_ui_shared/src/api/client.ts`
- Create: `packages/lns_ui_shared/src/test/setup.ts`
- Modify: `packages/lns_ui/package.json`
- Modify: `packages/lns_gas_demo/package.json`

**Step 1: Add failing catalog/client test**

Use Vitest and Testing Library:

```ts
it("parses all eight registry families", async () => {
  const catalog = await client.getDistributionCatalog();
  expect(catalog.map((x) => x.id)).toEqual([
    "Normal", "LogNormal", "Beta", "Poisson",
    "NegativeBinomial", "Gamma", "StudentT", "Deterministic",
  ]);
});
```

**Step 2: Install and confirm failure**

```bash
cd packages/lns_ui_shared && npm install
cd packages/lns_ui_shared && npm test
```

Expected: missing implementation.

**Step 3: Implement shared types/client**

Generate or manually mirror API types with a contract test against exported JSON schema. Add the shared package as a local file dependency to both apps.

**Step 4: Verify all builds**

```bash
cd packages/lns_ui_shared && npm test
cd packages/lns_ui && npm run build
cd packages/lns_gas_demo && npm run build
```

**Step 5: Commit**

```bash
git add packages/lns_ui_shared packages/lns_ui/package.json packages/lns_ui/package-lock.json packages/lns_gas_demo/package.json packages/lns_gas_demo/package-lock.json PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): add shared prediction workspace package"
```

### Task 13: Target, Research, Node, and Relationship Inspectors

**Files:**

- Create: `packages/lns_ui_shared/src/workspace/PredictionWorkspace.tsx`
- Create: `packages/lns_ui_shared/src/workspace/TargetIntake.tsx`
- Create: `packages/lns_ui_shared/src/workspace/ResearchReview.tsx`
- Create: `packages/lns_ui_shared/src/workspace/NodeInspector.tsx`
- Create: `packages/lns_ui_shared/src/workspace/RelationshipInspector.tsx`
- Create: `packages/lns_ui_shared/src/workspace/EvidenceDrawer.tsx`
- Create: `packages/lns_ui_shared/src/workspace/*.test.tsx`

**Step 1: Write component tests first**

Test:

- missing price basis blocks target submission;
- cloud routing disclosure is visible before consent;
- all family parameters have labels/descriptions;
- derived mean/median are read-only;
- unsupported/unknown evidence is visible;
- relationship unit mismatch blocks approval;
- status has text/icon, not color alone.

**Step 2: Confirm failure**

```bash
cd packages/lns_ui_shared && npm test
```

**Step 3: Implement accessible forms and progressive disclosure**

Keep server contracts authoritative. Do not duplicate distribution validation beyond immediate UI guidance.

**Step 4: Verify**

```bash
cd packages/lns_ui_shared && npm test
```

**Step 5: Commit**

```bash
git add packages/lns_ui_shared/src/workspace PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): add target and scientific inspectors"
```

### Task 14: Hop Graph, Comparison, Approval, and Run Receipt

**Files:**

- Create: `packages/lns_ui_shared/src/graph/HopGraph.tsx`
- Create: `packages/lns_ui_shared/src/graph/layout.ts`
- Create: `packages/lns_ui_shared/src/comparison/CandidateComparison.tsx`
- Create: `packages/lns_ui_shared/src/runs/RunReceipt.tsx`
- Create: corresponding tests

**Step 1: Write deterministic graph tests**

Generate 30 nodes across hop layers and assert:

- no default rectangle overlap;
- target fixed in target column;
- proposed/active/unsupported states have text;
- search/filter/fit-to-view functions;
- affected paths highlight;
- comparison uses “changed,” not “improved,” without a score.

**Step 2: Confirm failure**

```bash
cd packages/lns_ui_shared && npm test
```

**Step 3: Implement the smallest evidence-backed renderer**

Prototype layout/rendering candidates before adding a heavy dependency. Record D-020 if a library is selected.

**Step 4: Verify**

```bash
cd packages/lns_ui_shared && npm test
```

**Step 5: Commit**

```bash
git add packages/lns_ui_shared/src/graph packages/lns_ui_shared/src/comparison packages/lns_ui_shared/src/runs DECISIONS.md PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): visualize multi-hop graph and candidate impact"
```

### Task 15: Canonical App and Playwright Journey

**Files:**

- Modify: `packages/lns_ui/src/App.tsx`
- Modify: `packages/lns_ui/src/api/client.ts` or remove in favor of shared client
- Modify: `packages/lns_ui/package.json`
- Create: `packages/lns_ui/playwright.config.ts`
- Create: `packages/lns_ui/e2e/neodymium-authoring.spec.ts`

**Step 1: Write the failing E2E flow**

Cover:

```text
target intake
→ source/price-basis confirmation
→ research consent
→ fixture-backed research review
→ 15+ candidate graph
→ inspect third-hop node
→ edit/reject/add factor
→ see warnings
→ compare active/candidate
→ approve exact version
→ run simulation
→ inspect receipt
```

Run at `1440x900` and `1280x800`.

**Step 2: Confirm failure**

```bash
cd packages/lns_ui && npm run test:e2e
```

**Step 3: Replace the generic shell with Prediction Workspace**

Preserve existing graph list/load behavior behind an “Existing graphs” entry point if still useful.

**Step 4: Verify**

```bash
cd packages/lns_ui_shared && npm test
cd packages/lns_ui && npm run build
cd packages/lns_ui && npm run test:e2e
```

**Step 5: Commit**

```bash
git add packages/lns_ui PROGRESS.md TASK_QUEUE.md
git commit -m "feat(ui): ship generalized prediction workspace"
```

### Task 16: Neodymium Acceptance Packet

**Files:**

- Create: `docs/verification/neodymium/TARGET_CONTRACT.json`
- Create: `docs/verification/neodymium/RESEARCH_REPORT.md`
- Create: `docs/verification/neodymium/CANDIDATE_GRAPH.json`
- Create: `docs/verification/neodymium/APPROVAL_RECEIPT.json`
- Create: `docs/verification/neodymium/SIMULATION_RUN.json`
- Create: `docs/verification/neodymium/EVALUATION_REPORT.md`
- Create: `docs/verification/neodymium/screenshots/`

**Step 1: Run target/source preflight**

Verify the user-selected source still identifies the exact retail series. Record commercial interest and any price-basis mismatch.

**Step 2: Execute consented research only if configured**

Do not embed credentials in commands or logs. If live research is unavailable, stop this task with a fixture-only status; do not label it accepted.

**Step 3: Review and approve the graph**

Ensure at least 15 candidates, one three-hop path, exclusions, contradictions, and dependence warnings.

**Step 4: Run and evaluate**

Save exact receipts. If history is suitable, compare baseline/direct/multi-hop using a predeclared cutoff. Otherwise write the limitation and omit lift claims.

**Step 5: Verify packet**

Add a deterministic checker such as:

```bash
python scripts/verify_neodymium_packet.py docs/verification/neodymium
```

Expected: exits 0 only when required files, hashes, and classifications exist.

**Step 6: Commit**

```bash
git add docs/verification/neodymium scripts/verify_neodymium_packet.py PROGRESS.md TASK_QUEUE.md
git commit -m "test: add neodymium acceptance packet"
```

### Task 17: Gas Preset Adapter

**Files:**

- Create: `packages/lns_ui_shared/src/presets/gas.ts`
- Modify: `packages/lns_gas_demo/src/App.tsx`
- Modify: `packages/lns_gas_demo/src/api.ts`
- Modify: `packages/lns_server/src/lns_server/gas_ai.py`
- Modify: `packages/lns_server/src/lns_server/app.py`
- Modify: `packages/lns_server/tests/test_gas_demo_api.py`

**Step 1: Write regression/safety tests**

Test:

- gas preset maps to general target/node/relationship contracts;
- proposals remain proposed;
- bulk activation fails when items lack approvals;
- Kalshi real-money controls are disabled unless separately enabled;
- no live request occurs in tests.

**Step 2: Confirm failure**

```bash
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest tests/test_gas_demo_api.py -q
```

**Step 3: Convert gas UI to a thin preset**

Render shared `PredictionWorkspace` with gas defaults and a separate Kalshi attachment panel.

**Step 4: Verify all regression gates**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui_shared && npm test
cd packages/lns_ui && npm run build
cd packages/lns_gas_demo && npm run build
```

**Step 5: Commit**

```bash
git add packages/lns_ui_shared/src/presets/gas.ts packages/lns_gas_demo packages/lns_server/src/lns_server/gas_ai.py packages/lns_server/src/lns_server/app.py packages/lns_server/tests/test_gas_demo_api.py PROGRESS.md TASK_QUEUE.md
git commit -m "feat(gas): adapt demo to shared prediction workspace"
```

### Task 18: CI, Reality Audit, and Completion

**Files:**

- Create: `.github/workflows/verify.yml`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `HANDOFF_LATEST.md`
- Create: `docs/verification/FINAL_REPORT.md`
- Modify: `PROGRESS.md`
- Modify: `TASK_QUEUE.md`

**Step 1: Add CI with exact local gates**

Run Python tests, shared UI tests, both builds, Playwright, packet checker, and `git diff --check`. Cache dependencies without caching secrets.

**Step 2: Run the complete suite locally**

```bash
cd packages/lns_kernel && PYTHONPATH=src pytest -q
cd packages/lns_server && PYTHONPATH=src:../lns_kernel/src pytest -q
cd packages/lns_ui_shared && npm test
cd packages/lns_ui && npm run build && npm run test:e2e
cd packages/lns_gas_demo && npm run build
python scripts/verify_neodymium_packet.py docs/verification/neodymium
git diff --check
```

**Step 3: Run a reality/claim audit**

Classify every README/handoff claim as implemented, verified locally, verified live, limited, or deferred. Remove unsupported “causal,” “accurate,” “production,” and lift claims.

**Step 4: Complete evidence**

Save command outputs and visual/evaluation artifacts in `docs/verification/FINAL_REPORT.md`.

**Step 5: Mark complete only if GOAL gates pass**

If any required gate is red, leave `PROGRESS.md` incomplete and report the blocker.

**Step 6: Commit**

```bash
git add .github/workflows/verify.yml .gitignore README.md HANDOFF_LATEST.md docs/verification/FINAL_REPORT.md PROGRESS.md TASK_QUEUE.md
git commit -m "ci: verify generalized prediction workspace"
```

## Execution Handoff

Plan complete and saved to `docs/plans/2026-07-27-domain-general-prediction-workspace-implementation.md`.

Recommended execution is a separate implementation session/worktree using `executing-plans`, beginning with Task 1 and stopping at each gate for evidence review. Do not parallelize tasks that modify shared contracts, `models.py`, `store.py`, or `app.py`.
