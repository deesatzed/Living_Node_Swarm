const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j);
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export type Node = {
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
  tags?: string[];
};

export type Graph = {
  id: string;
  name: string;
  nodes: Record<string, Node>;
  layout: Record<string, { x: number; y: number }>;
  graph_version: number;
};

export type Snapshot = {
  id: string;
  node_predictives: Record<
    string,
    {
      quantiles: Record<string, number>;
      samples: number[];
      derived_mean: number | null;
      derived_std: number | null;
      n_samples: number;
    }
  >;
};

export const api = {
  health: () => req<Record<string, unknown>>("/health"),
  bootstrap: (body: {
    ticker?: string;
    threshold_usd?: number;
    market_yes_mid?: number | null;
    expand_ai?: boolean;
    auto_activate_ai?: boolean;
    hint?: string;
    model?: string | null;
  }) =>
    req<{
      graph: Graph;
      snapshot: Snapshot;
      quote: unknown;
      threshold_usd: number;
      market_yes_mid: number | null;
      expand: unknown;
      exit_rule: { move_pct: number; description: string };
    }>("/demo/gas/bootstrap", { method: "POST", body: JSON.stringify(body) }),
  expand: (graphId: string, body: { hint?: string; auto_activate?: boolean; auto_wire?: boolean; model?: string | null }) =>
    req<{
      graph: Graph;
      snapshot: Snapshot;
      added_nodes: Node[];
      errors: string[];
      sim_status: { freshness: string };
    }>(`/demo/gas/${graphId}/expand`, { method: "POST", body: JSON.stringify(body) }),
  activateAll: (graphId: string) =>
    req<{ graph: Graph; snapshot: Snapshot | null; activated: string[] }>(
      `/demo/gas/${graphId}/activate-all-proposed?wire=true`,
      { method: "POST" }
    ),
  activateOne: (graphId: string, nodeId: string) =>
    req<{ graph: Graph; snapshot: Snapshot | null }>(`/graphs/${graphId}/nodes/${nodeId}/activate`, {
      method: "POST",
    }),
  rejectOne: (graphId: string, nodeId: string) =>
    req<{ graph: Graph }>(`/graphs/${graphId}/nodes/${nodeId}/reject`, { method: "POST" }),
  refreshMid: (graphId: string, ticker: string) =>
    req<{ graph: Graph; snapshot: Snapshot; quote: Record<string, unknown> }>(
      `/graphs/${graphId}/kalshi/refresh-mid?ticker=${encodeURIComponent(ticker)}`,
      { method: "POST" }
    ),
  patchNode: (graphId: string, nodeId: string, parameters: Record<string, number>) =>
    req<{ graph: Graph; snapshot: Snapshot | null; sim_status: { freshness: string } }>(
      `/graphs/${graphId}/nodes/${nodeId}`,
      { method: "PATCH", body: JSON.stringify({ parameters, run_sim: true }) }
    ),
  balance: () => req<{ env: string; balance: Record<string, unknown> }>("/kalshi/balance"),
  order: (body: { ticker: string; action: string; side: string; contracts: number; confirm: boolean; graph_id?: string }) =>
    req<Record<string, unknown>>("/kalshi/orders", { method: "POST", body: JSON.stringify({ ...body, journal: true }) }),
  autoSell: (confirm: boolean) =>
    req<Record<string, unknown>>("/kalshi/auto-sell-20pct", {
      method: "POST",
      body: JSON.stringify({ confirm }),
    }),
};
