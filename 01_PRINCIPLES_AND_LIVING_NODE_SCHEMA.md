# Living Node Swarm — Principles, Schema & Parallel Dynamics

**Status:** Foundation document (v0.1)  
**Date:** 2026-07-27  
**Scope:** Non-clinical. Framework and foundations only. Use-case brainstorming comes after this document is stable.

---

## 1. Core Principles

### 1.1 Explicit Probabilistic Nodes as First-Class Objects

**Statement**  
Every quantity that matters is an explicit node. A node is not a free-text description, a latent activation, or a hidden intermediate. It is a fully specified, versioned, auditable object that carries its own probability distribution, dependency list, update history, and provenance.

**Reason**  
Hidden or implicit state makes continuous learning, audit, and parallel update impossible. Expert-system software succeeded for decades precisely because every variable was declared. Modern LLM systems mostly abandoned this discipline. We restore it and extend it with live distributions.

**Novelty**  
Most current agent systems treat knowledge as either (a) opaque model weights or (b) natural-language memory. Neither supports rigorous ensemble Monte Carlo, continuous distributional update, or deterministic policy checks. Explicit probabilistic nodes do.

### 1.2 Distribution-First, Not Point-Estimate-First

**Statement**  
Every node is defined by a probability distribution family + parameters (and optionally higher-order uncertainty over those parameters). Point estimates are derived views, never the primary representation.

**Reason**  
Decision quality under uncertainty requires full predictive distributions, ranges, and likelihoods. Point estimates destroy information and create false certainty.

**Novelty**  
Standard Monte Carlo tools and most AutoML pipelines still treat distributions as an afterthought. Here the distribution *is* the node. AI agents create and revise distribution families and parameters as first-class operations.

### 1.3 AI as Node Author and Node Editor

**Statement**  
Large language models (and other agents) are permitted — and expected — to propose, create, revise, and retire nodes, including choosing distribution families and initial parameters. All such edits are versioned, receipted, and reversible.

**Reason**  
Human experts cannot keep every relevant variable in a complex system current. The AI’s comparative advantage is rapid hypothesis generation about what should be a node and how it should be distributed. Humans retain high-privilege override and approval rights.

**Novelty**  
Existing expert systems required human knowledge engineers to define every node. Existing LLM agents rarely produce structured, distribution-bearing objects that can be immediately simulated. We close that gap.

### 1.4 Continuous, Fluid Ensemble Simulation

**Statement**  
The graph is not simulated once. Monte Carlo (and related ensemble methods) run continuously or on any material change to a node. Predictions, ranges, and likelihoods are always available against the current state of the graph.

**Reason**  
Static models go stale the moment new information arrives. A living system must re-compute predictive distributions as soon as any upstream node moves.

**Novelty**  
Most Monte Carlo engines are batch tools. Most agent systems lack a rigorous probabilistic substrate. The combination of a live node graph + continuous ensemble re-simulation is rare.

### 1.5 Stigmergy as Primary Coordination Medium

**Statement**  
Agents coordinate primarily by leaving and reading durable traces in a shared environment (updated distributions, failure signatures, successful proxy formulas, calibration residuals, dense semantic packets). Direct message-passing is secondary.

**Reason**  
Pure message-passing does not scale and creates coordination bottlenecks. Stigmergy (environment-mediated coordination) has proven effective in biological and swarm systems. It also creates a natural audit trail.

**Novelty**  
Most multi-agent LLM frameworks still default to chat-style message passing. We invert the priority: the environment is the primary medium; messages are an optimization or a human interface.

### 1.6 Model-Native Dense Communication

**Statement**  
Inter-agent and intra-agent communication of bulk semantic content uses high-density, model-recoverable representations (BabelTele-style). Policy-critical or audit-critical statements use deterministic semantic contracts + receipts (Agent_Pidgeon style). Human natural language is a privileged, low-frequency channel.

**Reason**  
Natural language is optimized for human readability, not for information density or model-to-model fidelity. Context windows, latency, and cost all suffer when agents speak verbose English to one another. Dense representations + formal contracts solve different parts of the problem.

**Novelty**  
BabelTele demonstrated that LLMs can recover semantics from compact, non-human-readable forms. Agent_Pidgeon demonstrated deterministic semantic contracts and receipts. Combining both as the *default* communication substrate for a living probabilistic swarm is new.

### 1.7 Experiential Continuous Learning

**Statement**  
Every observation, outcome, calibration residual, or agent discovery updates the relevant nodes and leaves a durable learning trace. Failures are normalized, stored, and injected as forbidden or cautionary patterns on subsequent attempts.

**Reason**  
One-shot learning is fragile. A living system improves by accumulating experience in a form that later agents can exploit without re-deriving everything from scratch.

**Novelty**  
Cross-task failure mining (imbora) + continuous distributional update + stigmergic traces creates a tighter learning loop than typical RAG or fine-tuning pipelines.

### 1.8 Human as Privileged High-Bandwidth Node

**Statement**  
The human is not the permanent center of the system, nor is the human excluded. The human is a high-privilege node that can inject intent, override distributions, approve high-stakes changes, demand natural-language explanations, or directly edit the graph.

**Reason**  
Full autonomy without human oversight is neither safe nor desirable for high-stakes domains. Full human mediation destroys leverage. The correct design treats the human as a scarce, high-value participant inside the living system.

**Novelty**  
Most agent systems still oscillate between “human-in-the-loop for everything” and “fully autonomous with opaque decision logs.” Explicit membership of the human as a privileged node is cleaner.

---

## 2. Living Node Schema

A Living Node is the atomic unit of the system. The schema below is deliberately strict enough to support continuous Monte Carlo, versioning, receipts, and parallel update, while remaining extensible.

### 2.1 Core Fields

```text
Node {
  id:                    string (stable, unique)
  name:                  string (human-readable label)
  description:           string (optional, natural language)
  
  // Distributional heart
  distribution_family:   enum | string   // e.g. Normal, LogNormal, Beta, Gamma, 
                                         // StudentT, Mixture, Empirical, Custom
  parameters:            map[string → number | distribution]
  // Example: { "mu": 0.07, "sigma": 0.15 }
  // Higher-order uncertainty allowed: parameter itself can be a distribution
  
  support:               optional bounds or domain constraints
  units:                 string
  
  // Graph structure
  depends_on:            list[NodeId]     // direct upstream dependencies
  influences:            list[NodeId]     // optional reverse links for convenience
  
  // Provenance & versioning
  version:               integer or semver
  created_by:            agent_id | "human"
  last_updated_by:       agent_id | "human"
  created_at:            timestamp
  updated_at:            timestamp
  parent_version:        optional NodeId@version
  
  // Learning & confidence
  observation_count:     integer
  last_observation:      optional { value, timestamp, source }
  confidence:            float [0,1] or distribution
  calibration_history:   list of residuals or scores
  
  // Policy & audit
  sensitivity:           enum (public | internal | restricted | critical)
  requires_human_approval_for_change: boolean
  receipt_chain:         list of Pidgin-style receipt IDs
  
  // Dense representation cache (optional)
  babel_form:            optional string  // current BabelTele-style dense encoding
  babel_form_version:    optional string
  
  // Metadata
  tags:                  list[string]
  status:                enum (proposed | active | deprecated | retired)
}
```

### 2.2 Why This Schema

| Field / Group              | Reason                                                                 | Novelty relative to typical systems |
|---------------------------|------------------------------------------------------------------------|-------------------------------------|
| distribution_family + parameters | Enables immediate Monte Carlo without extra translation steps         | Most agent memory is text or embeddings; here the distribution *is* the knowledge |
| depends_on                | Makes the causal / computational graph explicit and traversable        | Enables targeted re-simulation and parallel update |
| version + parent_version  | Supports safe evolution and rollback                                   | Continuous learning without losing history |
| created_by / last_updated_by | Attribution and accountability                                         | Critical for mixed human–AI authorship |
| observation_count + calibration_history | Supports experiential continuous learning                              | Turns every real outcome into a distributional update |
| requires_human_approval…  | Implements the human as a privileged gate without forcing human mediation on every change | Cleaner than pure HITL or pure autonomy |
| receipt_chain             | Links every material change to a deterministic semantic receipt (Agent_Pidgeon) | Auditability of meaning, not just of execution |
| babel_form                | Optional dense encoding for low-overhead inter-agent transfer          | Direct bridge to BabelTele-style model-native communication |

### 2.3 Supporting Objects

- **UpdateEvent** — records a proposed or executed change to a node (old → new, reason, agent, receipt).
- **SimulationSnapshot** — frozen view of a subset of the graph + the resulting predictive distributions at a point in time.
- **StigmergicTrace** — any durable environmental deposit (updated node, failure signature, successful proxy formula, dense semantic packet, calibration residual).
- **Receipt** — Agent_Pidgeon-style deterministic record of meaning, policy check, and resolution path.

---

## 3. How the Pieces Work In-Sync and Dynamically in Parallel

### 3.1 Parallel Update Model

Nodes are independent objects. Multiple agents (or multiple instances of the same agent type) may:

- Propose new nodes
- Propose parameter or family changes to existing nodes
- Deposit observations or calibration residuals
- Leave dense semantic packets or failure signatures

Conflict resolution is handled by:

1. Versioning + parent pointers
2. Sensitivity / approval gates (critical nodes require human or designated agent approval)
3. Receipt validation before a change becomes active
4. Optional optimistic concurrency with later reconciliation via ensemble re-simulation

Because the primary state is the set of nodes + their distributions, agents do not need to lock the entire graph. They operate on the nodes they care about; the continuous simulation layer re-computes only the affected downstream subgraph (or the full graph if cheaper).

### 3.2 Continuous Simulation Loop

```text
while system is live:
  on any material node change (or on timer / demand):
    identify affected subgraph
    run ensemble Monte Carlo (or other methods) over current active nodes
    publish new predictive distributions, ranges, likelihoods
    optionally write a SimulationSnapshot + dense summary
```

This loop is deliberately simple. Complexity lives in the nodes and in the agents that edit them, not in a central orchestrator.

### 3.3 Stigmergic + Dense Communication Loop

```text
Agent discovers or decides something
  → writes one or more of:
      - updated Node (or UpdateEvent)
      - StigmergicTrace (failure signature, proxy formula, residual, …)
      - BabelTele-style dense packet (for bulk semantics)
      - Pidgin Receipt (for policy-critical meaning)
  → other agents periodically or event-driven read the shared environment
  → they decide whether to revise their own nodes or propose new ones
```

Direct agent-to-agent messaging is allowed but is not the default path. The environment is the coordination bus.

### 3.4 Learning Feedback

```text
Real outcome or observation arrives
  → matched to one or more nodes
  → distribution parameters updated (Bayesian or other update rule)
  → calibration residual recorded
  → if the outcome was surprising or costly, a failure / caution signature is written
  → future agents see the updated distribution and the cautionary trace
```

This closes the experiential loop without requiring a separate “training” phase.

### 3.5 Human Interface Points

- Inject or edit any node (with appropriate privilege)
- Approve or reject proposed changes on critical nodes
- Demand a natural-language explanation of any node or any simulation result
- Force a full-graph re-simulation
- Read the complete receipt chain for any decision path

All of these actions themselves generate UpdateEvents and receipts so the system remains coherent.

---

## 4. Framework Foundations (Summary)

| Layer                    | Responsibility                                      | Primary Sources of Inspiration          |
|--------------------------|-----------------------------------------------------|-----------------------------------------|
| Living Node Graph        | Explicit probabilistic state                        | finESS Path A, imbora nodes             |
| Continuous Ensemble      | Fluid prediction under uncertainty                  | finESS Monte Carlo / Strategy Duel      |
| AI Node Authorship       | Create / revise nodes and distributions             | imbora surrogate reasoning + LLM agents |
| Stigmergic Environment   | Durable traces, coordination without central chat   | Prior stigmergic work + swarm principles|
| Dense + Contractual Comms| Low-overhead model-native exchange + audit          | BabelTele + Agent_Pidgeon               |
| Experiential Learning    | Continuous distributional + failure learning        | imbora cross-task mining + calibration  |
| Human Privilege Layer    | High-bandwidth, high-trust participation            | Explicit design choice                  |

The system is deliberately layered so that each piece can evolve independently while remaining interoperable through the Living Node schema and the shared stigmergic store.

---

## 5. What This Document Deliberately Does *Not* Contain

- Concrete domain use cases (finance, operations, research, etc.)
- Implementation language or library choices
- Performance numbers or benchmarks
- Detailed agent role definitions beyond the principles above

Those come *after* the principles and schema are accepted as the foundation.

---

**Next step after review**  
Once this document is stable, we move to use-case brainstorming that respects the principles and schema defined here.
