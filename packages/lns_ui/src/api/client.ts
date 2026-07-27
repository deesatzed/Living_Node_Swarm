const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail: unknown = res.statusText;
    try {
      const j = await res.json();
      if (typeof j.detail === "string") detail = j.detail;
      else if (j.detail != null) detail = JSON.stringify(j.detail);
      else detail = JSON.stringify(j);
      if (Array.isArray(j.trace_tail) && j.trace_tail.length) {
        detail = `${detail}\n${j.trace_tail.join("\n")}`;
      }
    } catch {
      /* ignore */
    }
    throw new Error(
      typeof detail === "string" ? `${res.status}: ${detail}` : `${res.status}: ${JSON.stringify(detail)}`
    );
  }
  return res.json() as Promise<T>;
}

export type Freshness = "fresh" | "stale" | "updating" | "failed";

export interface NodeLayout {
  x: number;
  y: number;
}

export interface LnsNode {
  id: string;
  name: string;
  description?: string;
  distribution_family: string;
  parameters: Record<string, number>;
  depends_on: string[];
  transform: string;
  transform_params: Record<string, number>;
  version: number;
  status: string;
  discovery_rationale?: string | null;
}

export interface Graph {
  id: string;
  name: string;
  nodes: Record<string, LnsNode>;
  layout: Record<string, NodeLayout>;
  graph_version: number;
}

export interface Predictive {
  node_id: string;
  samples: number[];
  quantiles: Record<string, number>;
  derived_mean: number | null;
  derived_std: number | null;
  derived_median: number | null;
  n_samples: number;
  freshness: Freshness;
}

export interface Snapshot {
  id: string;
  graph_id: string;
  graph_version: number;
  node_predictives: Record<string, Predictive>;
  seed: number;
  n_samples: number;
  status: string;
}

export interface SimStatus {
  graph_id: string;
  freshness: Freshness;
  graph_version: number;
  last_snapshot_id: string | null;
  last_error: string | null;
  job_running: boolean;
}

export const api = {
  health: () =>
    req<{
      ok: boolean;
      openrouter_key_configured: boolean;
      openrouter_model_configured: boolean;
      default_model: string | null;
      models: Array<{ role: string; id: string }>;
    }>("/health"),
  listGraphs: () => req<{ ids: string[] }>("/graphs"),
  createSeed: () =>
    req<{ graph: Graph; snapshot: Snapshot | null }>("/graphs", {
      method: "POST",
      body: JSON.stringify({ from_seed: true, name: "seed-demo" }),
    }),
  getGraph: (id: string) => req<Graph>(`/graphs/${id}`),
  getSnapshot: (id: string) => req<Snapshot>(`/graphs/${id}/snapshot`),
  getStatus: (id: string) => req<SimStatus>(`/graphs/${id}/sim/status`),
  patchNode: (
    graphId: string,
    nodeId: string,
    body: {
      parameters: Record<string, number>;
      transform?: string;
      transform_params?: Record<string, number>;
      reason?: string;
      run_sim?: boolean;
    }
  ) =>
    req<{
      graph: Graph;
      snapshot: Snapshot | null;
      sim_status: SimStatus;
      event: unknown;
    }>(`/graphs/${graphId}/nodes/${nodeId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  transformExperiment: (graphId: string, nodeId: string) =>
    req<{
      node_id: string;
      results: Array<Record<string, unknown>>;
      recommendation: string | null;
      note: string;
    }>(`/graphs/${graphId}/experiments/transforms`, {
      method: "POST",
      body: JSON.stringify({ node_id: nodeId, n_samples: 1500 }),
    }),
  proposeNode: (graphId: string, model: string, hint: string) =>
    req<{
      node: LnsNode;
      graph: Graph;
      proposal_raw: unknown;
      model_used: string | null;
    }>(`/graphs/${graphId}/ai/propose-node`, {
      method: "POST",
      body: JSON.stringify({ model: model || null, hint, auto_activate: false }),
    }),
  activateNode: (graphId: string, nodeId: string) =>
    req<{
      graph: Graph;
      snapshot: Snapshot | null;
      sim_status: SimStatus;
      event: unknown;
      note?: string;
    }>(`/graphs/${graphId}/nodes/${nodeId}/activate`, { method: "POST" }),
  rejectNode: (graphId: string, nodeId: string) =>
    req<{
      graph: Graph;
      snapshot: Snapshot | null;
      sim_status: SimStatus;
      event: unknown;
      deleted_node_id: string;
    }>(`/graphs/${graphId}/nodes/${nodeId}/reject`, { method: "POST" }),
  wireNode: (graphId: string, parentId: string, childId: string, weight = 1.0) =>
    req<{
      graph: Graph;
      snapshot: Snapshot | null;
      sim_status: SimStatus;
      event: unknown;
    }>(`/graphs/${graphId}/nodes/${parentId}/wire`, {
      method: "POST",
      body: JSON.stringify({ child_id: childId, weight, run_sim: true }),
    }),
};
