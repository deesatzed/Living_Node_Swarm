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

    expect(calls).toEqual([
      { input: "http://localhost:8787/projects/project-1/monitoring", method: "GET" },
      { input: "http://localhost:8787/projects/project-1/monitoring", method: "PUT" },
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
      "approveCandidateProposal",
      "createCandidateProposal",
      "createDraft",
      "createFixtureCandidateProposal",
      "createProject",
      "createTarget",
      "elicitDistribution",
      "getDistributionCatalog",
      "getGraph",
      "getMonitoring",
      "getProject",
      "getResearchReview",
      "getSimulationStatus",
      "getSnapshot",
      "getTarget",
      "listGraphEvents",
      "listProjects",
      "patchProject",
      "reviewResearchClaim",
      "runSimulation",
      "saveMonitoring",
      "shadowSimulate",
      "validateRelationships",
    ]);
  });
});
