import type { Freshness } from "../api/client";

export function FreshnessBadge({ freshness }: { freshness: Freshness | string }) {
  const f = (freshness || "stale").toLowerCase();
  const label =
    f === "updating" ? "updating…" : f === "stale" ? "stale" : f === "failed" ? "failed" : "fresh";
  return <span className={`badge ${f}`}>{label}</span>;
}
