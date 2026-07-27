# Living Node Swarm — Foundations, Schema & Prototype Handoff

**Status:** Handoff-ready foundation document (v0.2)  
**Date:** 2026-07-27  
**Purpose:** Self-contained specification so that Grok Build / CAM-Pulse-style agents (or any downstream coding agent) can understand current thinking, principles, data structures, and intended prototype directions without further conversation context.  
**Scope:** Non-clinical. Framework + latent expansion + multi-hop disruption learning. Concrete prototypes are defined at the end.

---

## 0. One-Sentence Definition

A Living Node Swarm is a continuously updating expert-system graph in which every important quantity is an explicit probabilistic node, AI agents both maintain and *expand* the graph by discovering indirect/secondary/tertiary factors, ensemble Monte Carlo runs fluidly over the current graph, coordination happens primarily through stigmergy and dense model-native communication, and the human remains a privileged high-bandwidth node.

---

## 1. Core Principles

### 1.1 Explicit Probabilistic Nodes as First-Class Objects

**Statement**  
Every quantity that matters is an explicit node. A node is not free-text, a latent activation, or a hidden intermediate. It is a fully specified, versioned, auditable object carrying its own probability distribution, dependency list, update history, and provenance.

**Reason**  
Hidden or implicit state destroys continuous learning, auditability, and safe parallel update. Classic expert systems worked because every variable was declared. We restore that discipline and extend it with live distributions.

**Novelty**  
Most agent systems treat knowledge as opaque weights or natural-language memory. Neither supports rigorous ensemble Monte Carlo, continuous distributional update, or deterministic policy checks. Explicit probabilistic nodes do.

### 1.2 Distribution-First, Not Point-Estimate-First

**Statement**  
Every node is defined by a probability distribution family + parameters (higher-order uncertainty over parameters is allowed). Point estimates are derived views only.

**Reason**  
Decisions under uncertainty require full predictive distributions, ranges, and likelihoods. Point estimates destroy information.

**Novelty**  
The distribution *is* the node. AI agents create and revise distribution families and parameters as first-class operations.

### 1.3 AI as Node Author, Editor, *and Latent Expander*

**Statement**  
AI agents are expected to:
- Propose, create, revise, and retire nodes
- Choose distribution families and initial parameters
- **Discover and propose previously unconsidered indirect, secondary, and tertiary factors** that expand the latent space of the graph

All edits are versioned, receipted, and reversible. Critical nodes can require human (or designated agent) approval.

**Reason**  
Human experts cannot continuously invent every relevant variable, especially multi-hop factors. The AI’s comparative advantage is rapid hypothesis generation about *what should exist as a node* and how it should be distributed, including factors that only become visible through secondary and tertiary pathways.

**Novelty**  
This goes beyond ordinary feature engineering. The system treats *graph growth via discovery of hidden multi-hop factors* as a core, continuous capability.

### 1.4 Continuous, Fluid Ensemble Simulation

**Statement**  
Monte Carlo and related ensemble methods run continuously or on any material node change. Full predictive distributions, ranges, and likelihoods are always available against the current graph state.

**Reason**  
Static models go stale immediately. A living system must re-compute as soon as upstream nodes move.

**Novelty**  
Live node graph + continuous ensemble re-simulation is rare. Most Monte Carlo tools are batch; most agent systems lack a rigorous probabilistic substrate.

### 1.5 Stigmergy as Primary Coordination Medium

**Statement**  
Agents coordinate primarily by leaving and reading durable traces in a shared environment (updated nodes, failure signatures, successful latent expansions, calibration residuals, dense semantic packets). Direct message-passing is secondary.

**Reason**  
Pure message-passing does not scale and creates bottlenecks. Stigmergy creates a natural audit trail and allows parallel work.

**Novelty**  
Most multi-agent LLM frameworks still default to chat. We invert the priority: environment first.

### 1.6 Model-Native Dense Communication + Contractual Receipts

**Statement**  
Bulk semantic content between agents uses high-density, model-recoverable representations (BabelTele-style). Policy-critical or audit-critical statements use deterministic semantic contracts + receipts (Agent_Pidgeon style). Human natural language is a privileged, low-frequency channel.

**Reason**  
Natural language is optimized for humans, not for density or model-to-model fidelity. Context cost, latency, and noise all suffer when agents speak verbose English to one another.

**Novelty**  
Combining BabelTele-style dense forms with Pidgin-style deterministic receipts as the *default* inter-agent substrate is new.

### 1.7 Experiential Continuous Learning + Multi-Hop Motif Learning

**Statement**  
Every observation, outcome, residual, or agent discovery updates relevant nodes and leaves durable traces. In addition, the system maintains a library of multi-hop disruption motifs learned from historical episodes (COVID supply-chain congestion, chassis cascades, empty-container imbalances, resource diversion, etc.). These motifs bias future latent-expansion proposals.

**Reason**  
One-shot learning is fragile. Historical multi-hop failures contain reusable structure. Turning them into priors for latent expansion is high-leverage.

**Novelty**  
Cross-task failure mining + continuous distributional update + explicit multi-hop motif library creates a tighter and more structurally aware learning loop.

### 1.8 Human as Privileged High-Bandwidth Node

**Statement**  
The human is inside the system as a high-privilege node: can inject intent, override distributions, approve high-stakes changes, demand natural-language explanations, or directly edit the graph. The human is neither the permanent center nor excluded.

**Reason**  
Full autonomy without oversight is unsafe for high-stakes domains; full human mediation destroys leverage. Explicit membership as a privileged node is cleaner.

---

## 2. Living Node Schema (Implementable)

```text
Node {
  id:                         string          // stable unique identifier
  name:                       string          // human-readable
  description:                string          // optional natural language

  // Distributional core
  distribution_family:        string          // "Normal" | "LogNormal" | "Beta" | "Gamma" |
                                              // "StudentT" | "Mixture" | "Empirical" | "Custom" | ...
  parameters:                 map[string, number | DistributionRef]
  support:                    optional { lower?: number, upper?: number }
  units:                      string

  // Graph structure
  depends_on:                 list[NodeId]
  influences:                 list[NodeId]    // optional reverse index
  hop_distance_from_target:   optional int    // 1 = direct, 2 = secondary, 3 = tertiary...

  // Provenance & versioning
  version:                    int | semver
  parent_version:             optional string // id@version
  created_by:                 string          // agent_id | "human"
  last_updated_by:            string
  created_at:                 timestamp
  updated_at:                 timestamp

  // Learning state
  observation_count:          int
  last_observation:           optional { value: number, timestamp, source }
  confidence:                 float | DistributionRef
  calibration_history:        list[{ residual, timestamp, context }]

  // Policy & audit
  sensitivity:                "public" | "internal" | "restricted" | "critical"
  requires_human_approval:    boolean
  receipt_chain:              list[ReceiptId]

  // Dense representation (optional cache)
  babel_form:                 optional string
  babel_form_version:         optional string

  // Latent expansion metadata
  discovery_rationale:        optional string // why this node was proposed (especially for multi-hop)
  motif_source:               optional string // e.g. "covid_port_congestion_v1"
  status:                     "proposed" | "active" | "deprecated" | "retired"
  tags:                       list[string]
}
```

### Supporting Objects (minimum set for prototypes)

- **UpdateEvent** — old → new node state, reason, agent, receipt_id, timestamp
- **SimulationSnapshot** — frozen subgraph + resulting predictive distributions + timestamp
- **StigmergicTrace** — any durable deposit (node update, residual cluster, successful/failed latent expansion, dense packet, failure signature)
- **Receipt** — Agent_Pidgeon-style deterministic record (pointer, policy result, catalog version, hash chain)
- **MultiHopMotif** — reusable template of indirect pathway structure learned from history (see §4)

---

## 3. Latent Space Expansion (Core Mechanism)

### 3.1 Goal

When residuals are large or structured, or when external signals suggest missing structure, agents must be able to propose *new nodes* that capture previously unconsidered indirect, secondary, or tertiary factors. These new nodes expand the latent space of the graph and can materially change both central predictive distributions and tail/black-swan surfaces.

### 3.2 Process (prototype-ready)

1. Trigger: structured residual, calibration failure, external signal, or explicit human request.
2. Agent(s) reason about possible latent or multi-hop explanations (imbora-style surrogate reasoning + motif library bias).
3. Agent proposes one or more new Nodes complete with:
   - distribution_family + initial parameters
   - depends_on links (including multi-hop paths)
   - discovery_rationale
   - optional motif_source
   - confidence and sensitivity
4. Proposal becomes an UpdateEvent with status "proposed".
5. Policy / approval gate (automatic for low-sensitivity, human or designated agent for critical).
6. On acceptance, node becomes "active"; continuous ensemble re-simulates affected subgraph.
7. Outcome of the expansion (improved calibration? new tail mass? no benefit?) is written as a StigmergicTrace and can update the motif library.

### 3.3 Key Invariant

New nodes are never silently injected into the active simulation set. They pass through versioning, optional approval, and receipting. The ensemble always runs on the currently active, approved graph.

---

## 4. Multi-Hop Disruption Learning (COVID-Derived and General)

### 4.1 Lessons Extracted from COVID Supply-Chain Episode

- Binding constraints frequently sat several hops away from the obvious target variable.
- Secondary factors interacted and created feedback (chassis shortage → berth congestion → empty-container imbalance → later outbound capacity loss).
- Hysteresis was strong: recovery took far longer than the initial shock.
- Resource diversion and alternative uses appeared as hidden high-leverage nodes.
- Early residuals and near-misses contained usable information that was not systematically turned into new model structure at the time.

### 4.2 MultiHopMotif (data structure)

```text
MultiHopMotif {
  id:                string
  name:              string
  description:       string
  historical_source: string          // e.g. "covid_2020_2022_ports"
  pathway_template:  list[{ role, typical_distribution_family, example_depends_on }]
  feedback_patterns: list[string]
  hysteresis_notes:  string
  successful_expansions: list[NodeId]  // nodes that later proved valuable
  cautionary_notes:  string
}
```

### 4.3 Usage

When an agent performs latent expansion, it may condition proposals on similarity to known motifs. Successful live expansions can be distilled back into improved or new motifs. This creates a growing library of reusable multi-hop structure.

---

## 5. Parallel Dynamics & Continuous Loops (Implementation View)

### 5.1 Node Update Parallelism

- Nodes are independent objects.
- Multiple agents may propose updates concurrently.
- Conflict handling: versioning + parent pointers + sensitivity gates + receipt validation.
- No global lock required for the common case.

### 5.2 Continuous Simulation Loop

```
on material active-node change OR timer OR demand:
  identify affected downstream subgraph (or full graph)
  run ensemble Monte Carlo / related methods
  publish predictive distributions, ranges, likelihoods
  optionally write SimulationSnapshot + dense summary
```

### 5.3 Stigmergic + Dense Communication Loop

```
Agent produces insight or decision
  → writes UpdateEvent / new Node / StigmergicTrace / BabelTele packet / Receipt
  → other agents read shared environment (event-driven or periodic)
  → they decide whether to revise nodes or propose expansions
```

### 5.4 Experiential + Motif Learning Loop

```
Observation or residual arrives
  → update relevant node distributions
  → record residual
  → if structured surprise: trigger latent-expansion agents (biased by motif library)
  → record success/failure of any expansion as StigmergicTrace
  → optionally distill new or improved MultiHopMotif
```

---

## 6. Prototype Directions (Buildable Next)

These are intentionally narrow so a coding agent can produce working vertical slices quickly.

### Prototype A — Minimal Living Graph + Continuous MC
- Implement Node schema (core fields)
- Simple in-memory or SQLite graph store
- Manual + AI-proposed node creation
- Continuous (or on-change) Monte Carlo over a small graph
- Basic SimulationSnapshot output
- Human can inject/override nodes

### Prototype B — Latent Expansion Agent
- Residual trigger
- Agent proposes 1–3 new nodes with multi-hop rationale
- Approval gate (auto for low sensitivity)
- Re-simulation after acceptance
- Record expansion outcome as StigmergicTrace

### Prototype C — Motif-Biased Expansion
- Seed 2–3 MultiHopMotifs derived from COVID-style dynamics (port congestion, chassis cascade, resource diversion)
- Latent expansion agent conditions proposals on motif similarity
- Compare expansion quality with vs without motif bias

### Prototype D — Dense Communication + Receipts
- BabelTele-style compression of node state or residual summaries for inter-agent transfer
- Agent_Pidgeon-style receipt on every material node change
- Verify that another agent can recover usable semantics from the dense form

### Recommended first vertical slice
Prototype A + a thin version of B. This already demonstrates living nodes, continuous ensemble, and AI-driven latent expansion — the three most distinctive claims.

---

## 7. Non-Goals (Current)

- Clinical / medical applications (explicitly deferred)
- Full production multi-tenancy or hosted service
- Guaranteeing that every latent expansion is correct (we optimize for rapid hypothesis + rapid evaluation)
- Replacing human judgment on high-stakes decisions
- Building a general-purpose AutoML replacement

---

## 8. Key Invariants for Any Implementation

1. Active simulation never silently includes unapproved nodes.
2. Every material change produces an UpdateEvent and (for critical paths) a Receipt.
3. Distributions are the primary representation; point estimates are derived.
4. Latent expansion is a first-class, inspectable, reversible operation.
5. Historical multi-hop motifs bias but do not dictate live proposals.
6. Human privilege actions are themselves recorded as first-class events.

---

## 9. Handoff Notes for Grok Build / Coding Agents

- This document is the source of truth for principles and schema as of 2026-07-27.
- Prefer implementing the Node schema and continuous simulation loop first.
- Latent expansion should be visible and inspectable (show discovery_rationale and motif_source).
- Re-use patterns from existing repos where they fit:
  - finESS → Monte Carlo / distribution handling / Strategy Duel style comparison
  - imbora → surrogate / latent variable reasoning, explicit nodes, failure traces
  - Agent_Pidgeon → receipts, deterministic contracts, flight-recorder style traces
- Keep the first prototypes narrow and vertically complete rather than horizontally broad.
- All new nodes and expansions must remain auditable.

---

**End of foundation document v0.2**  
Ready for prototype construction.
