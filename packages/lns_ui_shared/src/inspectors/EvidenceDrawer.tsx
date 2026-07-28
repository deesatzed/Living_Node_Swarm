import { useEffect, useState } from "react";
import type { ClaimReviewInput, JsonObject } from "../api/types";

export interface EvidenceDrawerClient {
  getResearchReview(targetId: string): Promise<JsonObject>;
  reviewResearchClaim(targetId: string, claimId: string, body: ClaimReviewInput): Promise<JsonObject>;
}

export function EvidenceDrawer({ targetId, client, claimIds }: { targetId: string; client: EvidenceDrawerClient; claimIds?: string[] }) {
  const [claims, setClaims] = useState<JsonObject[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void client.getResearchReview(targetId).then((result) => setClaims(Array.isArray(result.claims) ? result.claims as JsonObject[] : [])).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load evidence review.")); }, [client, targetId]);
  async function review(claimId: string, decision: ClaimReviewInput["decision"]) {
    try {
      await client.reviewResearchClaim(targetId, claimId, { decision, reviewed_by: "operator", reason: "Reviewed in Prediction Workspace" });
      setClaims((current) => current?.map((claim) => String(claim.id) === claimId ? { ...claim, review_status: decision } : claim) ?? current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save evidence review."); }
  }
  const linkedIds = new Set(claimIds ?? []);
  const visibleClaims = claims?.filter((claim) => !claimIds || linkedIds.has(String(claim.id))) ?? null;
  return <section aria-label="Evidence review drawer"><h3>Evidence review</h3>{claimIds && <p>Showing {linkedIds.size} claim{linkedIds.size === 1 ? "" : "s"} linked to the approved graph.</p>}{error && <p role="alert">{error}</p>}{visibleClaims === null ? <p role="status">Loading evidence claims…</p> : visibleClaims.length === 0 ? <p>{claimIds ? "No reviewed evidence claims match the approved graph links." : "No evidence claims are available yet."}</p> : <ul>{visibleClaims.map((claim) => <li key={String(claim.id)}><strong>{String(claim.review_status ?? "unreviewed")}</strong>: {String(claim.claim_text ?? "Untitled claim")}<p>Source: {typeof claim.source === "object" && claim.source !== null ? String((claim.source as JsonObject).publisher ?? "unknown") : "unknown"}</p>{Array.isArray(claim.conflicts_with_claim_ids) && claim.conflicts_with_claim_ids.length > 0 && <p>Conflicts: {claim.conflicts_with_claim_ids.map(String).join(", ")}</p>}<button onClick={() => void review(String(claim.id), "included")}>Include claim</button><button onClick={() => void review(String(claim.id), "excluded")}>Exclude claim</button></li>)}</ul>}</section>;
}
