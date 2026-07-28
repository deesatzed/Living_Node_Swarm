import { describe, expect, it } from "vitest";
import {
  CANONICAL_DISTRIBUTION_FAMILY_IDS,
  createWorkspaceClient,
  parseCandidateGraphFixture,
  UnknownWorkspaceStateError,
  WorkspaceApiError,
} from "./client";
import { createNeodymiumGraphFixture } from "../testing/graphFixture";

describe("workspace API client", () => {
  it("freezes the eight server distribution family identifiers in registry order", () => {
    expect(CANONICAL_DISTRIBUTION_FAMILY_IDS).toEqual([
      "Normal",
      "LogNormal",
      "Beta",
      "Poisson",
      "NegativeBinomial",
      "Gamma",
      "StudentT",
      "Deterministic",
    ]);
  });

  it("preserves status and server detail for an invalid target", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async () =>
        new Response(JSON.stringify({ detail: "price_basis is required" }), {
          status: 422,
          headers: { "content-type": "application/json" },
        }),
    });

    await expect(client.createTarget({})).rejects.toEqual(
      new WorkspaceApiError(422, "price_basis is required"),
    );
  });

  it("returns kernel-sourced catalog metadata from the read-only catalog route", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input) => {
        expect(input).toBe("http://localhost:8787/catalog/distributions");
        return new Response(
          JSON.stringify({
            families: [
              {
                id: "Normal",
                label: "Normal",
                plain_language: "A symmetric continuous quantity.",
                parameters: [],
                support: { lower: null, upper: null, lower_open: false, upper_open: false },
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    });

    await expect(client.getDistributionCatalog()).resolves.toMatchObject({
      families: [{ id: "Normal", label: "Normal" }],
    });
  });

  it("requests read-only derived statistics from the kernel route", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        expect(input).toBe("http://localhost:8787/authoring/distributions/statistics");
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ family_id: "Normal", parameters: { mu: 4, sigma: 2 } }));
        return new Response(JSON.stringify({ family_id: "Normal", parameters: { loc: 4, scale: 2 }, statistics: { mean: 4, median: 4, mode: 4, variance: 4, support_lower: null, support_upper: null } }));
      },
    });

    await expect(client.getDistributionStatistics("Normal", { mu: 4, sigma: 2 })).resolves.toMatchObject({
      statistics: { mean: 4, variance: 4 },
    });
  });

  it("lists persisted projects through the workspace endpoint", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input) => {
        expect(input).toBe("http://localhost:8787/projects");
        return new Response(JSON.stringify({ projects: [{ id: "project-1", name: "Neodymium" }] }));
      },
    });

    await expect(client.listProjects()).resolves.toEqual({ projects: [{ id: "project-1", name: "Neodymium" }] });
  });

  it("lists bounded persisted simulation receipts through the read-only history route", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input) => {
        expect(input).toBe("http://localhost:8787/graphs/graph%2F1/snapshots?limit=5");
        return new Response(JSON.stringify({ snapshots: [{ id: "snapshot-1" }] }));
      },
    });

    await expect(client.listSnapshots("graph/1", 5)).resolves.toEqual({ snapshots: [{ id: "snapshot-1" }] });
  });

  it("runs a saved scenario through its project-scoped in-memory route", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        expect(input).toBe("http://localhost:8787/projects/project-1/scenarios/upside%2F1/simulate");
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ active_graph_mutated: false }));
      },
    });

    await expect(client.simulateScenario("project-1", "upside/1")).resolves.toEqual({ active_graph_mutated: false });
  });

  it("requests local sensitivity through the bounded graph analysis route", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        expect(input).toBe("http://localhost:8787/graphs/graph%2F1/analysis/local-sensitivity");
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ target_node_id: "outcome", perturbation_fraction: 0.1 }));
        return new Response(JSON.stringify({ active_graph_mutated: false }));
      },
    });
    await expect(client.runLocalSensitivity("graph/1", { target_node_id: "outcome", perturbation_fraction: 0.1 })).resolves.toEqual({ active_graph_mutated: false });
  });

  it("submits explicit ensemble members through the backend mixture route", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        expect(input).toBe("http://localhost:8787/analysis/weighted-ensemble");
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ members: [{ graph_id: "g", graph_version: 1, target_node_id: "outcome", weight: 1 }, { graph_id: "g2", graph_version: 2, target_node_id: "outcome", weight: 2 }] }));
        return new Response(JSON.stringify({ active_graph_mutated: false }));
      },
    });
    await expect(client.runWeightedEnsemble([{ graph_id: "g", graph_version: 1, target_node_id: "outcome", weight: 1 }, { graph_id: "g2", graph_version: 2, target_node_id: "outcome", weight: 2 }])).resolves.toEqual({ active_graph_mutated: false });
  });

  it("retrieves a persisted target contract for Project Home summaries", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input) => {
        expect(input).toBe("http://localhost:8787/targets/target%2F1");
        return new Response(JSON.stringify({ id: "target/1", question: "What will neodymium cost?" }));
      },
    });

    await expect(client.getTarget("target/1")).resolves.toMatchObject({ question: "What will neodymium cost?" });
  });

  it("loads and saves monitoring configuration through project-scoped endpoints", async () => {
    const calls: Array<{ input: string; method: string }> = [];
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        calls.push({ input: String(input), method: init?.method ?? "GET" });
        return new Response(JSON.stringify({ config: { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" }, events: [] }));
      },
    });

    await client.getMonitoring("project-1");
    await client.saveMonitoring("project-1", { cadence: "weekly", freshness_threshold_days: 7, mode: "fixture" });
    await client.acknowledgeMonitoringEvent("project-1", "event-1");

    expect(calls).toEqual([
      { input: "http://localhost:8787/projects/project-1/monitoring", method: "GET" },
      { input: "http://localhost:8787/projects/project-1/monitoring", method: "PUT" },
      { input: "http://localhost:8787/projects/project-1/monitoring/events/event-1/acknowledge", method: "POST" },
    ]);
  });

  it("creates a draft bound to the selected active graph version", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        expect(input).toBe("http://localhost:8787/projects/project-1/drafts");
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ id: "draft-1", base_graph_version: 4 }));
      },
    });

    await expect(client.createDraft("project-1", { id: "draft-1", base_graph_version: 4 })).resolves.toMatchObject({ id: "draft-1" });
  });

  it("approves a candidate through the project-scoped lifecycle endpoint", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        expect(input).toBe("http://localhost:8787/projects/project-1/candidate-proposals/proposal-1/approve");
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ project: { stage: "decide", active_graph_version: 5 } }));
      },
    });

    await expect(client.approveProjectCandidateProposal("project-1", "proposal-1", { approved_by: "operator", binding_hash: "binding-123" })).resolves.toMatchObject({ project: { stage: "decide" } });
  });

  it("approves a structural proposal through the project-scoped lifecycle endpoint", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        expect(input).toBe("http://localhost:8787/projects/project-1/structural-proposals/proposal-1/approve");
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ project: { stage: "decide", active_graph_version: 5 } }));
      },
    });

    await expect(client.approveProjectStructuralProposal("project-1", "proposal-1", { approved_by: "operator", binding_hash: "binding-123" })).resolves.toMatchObject({ project: { stage: "decide" } });
  });

  it("saves and lists non-active candidate revisions through project-scoped endpoints", async () => {
    const calls: string[] = [];
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input, init) => {
        calls.push(`${init?.method ?? "GET"} ${input}`);
        return new Response(JSON.stringify({ candidate_revisions: [] }));
      },
    });

    await client.createCandidateRevision("project-1", { id: "revision-1", base_graph_version: 4, candidate_parameter_overrides: { input_signal: { mu: 5 } } });
    await client.listCandidateRevisions("project-1");
    expect(calls).toEqual([
      "POST http://localhost:8787/projects/project-1/candidate-revisions",
      "GET http://localhost:8787/projects/project-1/candidate-revisions",
    ]);
  });

  it("lists persisted version-bound drafts for the selected project", async () => {
    const client = createWorkspaceClient({
      baseUrl: "http://localhost:8787",
      fetch: async (input) => {
        expect(input).toBe("http://localhost:8787/projects/project-1/revisions");
        return new Response(JSON.stringify({ drafts: [{ id: "draft-1", base_graph_version: 4 }] }));
      },
    });

    await expect(client.listDrafts("project-1")).resolves.toEqual({ drafts: [{ id: "draft-1", base_graph_version: 4 }] });
  });

  it("persists named scenarios separately from the active graph", async () => {
    const calls: string[] = [];
    const client = createWorkspaceClient({ baseUrl: "http://localhost:8787", fetch: async (input, init) => {
      calls.push(`${init?.method ?? "GET"} ${input}`);
      return new Response(JSON.stringify({ scenarios: [] }));
    }});

    await client.createScenario("project-1", { id: "upside", name: "Upside", assumptions: { demand: "higher" } });
    await client.listScenarios("project-1");
    expect(calls).toEqual([
      "POST http://localhost:8787/projects/project-1/scenarios",
      "GET http://localhost:8787/projects/project-1/scenarios",
    ]);
  });

  it("rejects candidate fixtures with an unrecognized visible state", () => {
    expect(() =>
      parseCandidateGraphFixture({
        generation_basis: "deterministic_fixture",
        active_graph_mutated: false,
        limitations: [],
        graph_proposal: {},
        factors: [{ id: "unknown", state: "mystery" }],
        relationships: [],
      }),
    ).toThrow(UnknownWorkspaceStateError);
  });

  it("labels every deterministic graph factor as fixture evidence", () => {
    const fixture = createNeodymiumGraphFixture();
    expect(fixture.evidence_classification).toBe("fixture_unverified");
    expect(fixture.factors).toHaveLength(30);
    expect(fixture.factors.every((factor) => factor.evidence_status === "fixture_unverified")).toBe(true);
  });

  it("centralizes every existing authoring review request behind one injected client", () => {
    const client = createWorkspaceClient({ fetch: async () => new Response("{}") });
    expect(Object.keys(client).sort()).toEqual([
      "acknowledgeMonitoringEvent",
      "approveCandidateProposal",
      "approveEnsemble",
      "approveProjectCandidateProposal",
      "approveProjectStructuralProposal",
      "approveStructuralProposal",
      "createCandidateProposal",
      "createCandidateRevision",
      "createDraft",
      "createEnsemble",
      "createFixtureCandidateProposal",
      "createProject",
      "createScenario",
      "createStructuralProposal",
      "createTarget",
      "deriveDistribution",
      "elicitDistribution",
      "getDistributionCatalog",
      "getDistributionStatistics",
      "getGraph",
      "getMonitoring",
      "getProject",
      "getResearchReview",
      "getSimulationStatus",
      "getSnapshot",
      "getTarget",
      "listCandidateRevisions",
      "listDrafts",
      "listEnsembleApprovals",
      "listEnsembles",
      "listGraphEvents",
      "listProjects",
      "listScenarios",
      "listSnapshots",
      "patchProject",
      "reviewResearchClaim",
      "runLocalSensitivity",
      "runSimulation",
      "runWeightedEnsemble",
      "saveMonitoring",
      "shadowSimulate",
      "shadowStructuralProposal",
      "simulateScenario",
      "validateRelationships",
    ]);
  });
});
